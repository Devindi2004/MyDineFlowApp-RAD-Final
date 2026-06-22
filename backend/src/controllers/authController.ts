import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User";
import { jwtConfig } from "../config/jwt";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { createError } from "../middleware/errorHandler";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signAccessToken(payload: { sub: string; email: string; role: string; restaurantId?: string }) {
  return jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpiresIn } as jwt.SignOptions);
}

function signRefreshToken(payload: { sub: string; email: string; role: string; restaurantId?: string }) {
  return jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn } as jwt.SignOptions);
}

function toAuthUser(user: InstanceType<typeof User>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber,
    address: user.address,
    loyaltyPoints: user.loyaltyPoints,
    restaurantId: user.restaurantId ? String(user.restaurantId) : undefined,
    isEmailVerified: user.isEmailVerified,
  };
}

async function issueAuthSession(user: InstanceType<typeof User>) {
  const authUser = toAuthUser(user);
  const tokenPayload = {
    sub: authUser.id,
    email: authUser.email,
    role: authUser.role,
    restaurantId: authUser.restaurantId,
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user: authUser, accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, phone, role, restaurantId } = req.body as {
      name: string;
      email: string;
      password: string;
      phone?: string;
      role?: string;
      restaurantId?: string;
    };

    const existing = await User.findOne({ email });
    if (existing) {
      sendError(res, "Email is already registered.", 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role ?? "customer",
      restaurantId: restaurantId ?? undefined,
    });

    sendSuccess(res, await issueAuthSession(user), "Registration successful.", 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email }).select("+password +refreshTokenHash");
    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    sendSuccess(res, await issueAuthSession(user), "Login successful.");
  } catch (err) {
    next(err);
  }
}

export async function googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { credential, role } = req.body as { credential?: string; role?: string };
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      sendError(res, "Google authentication is not configured.", 503);
      return;
    }

    if (!credential) {
      sendError(res, "Google credential is required.", 400);
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email || !payload?.email_verified) {
      sendError(res, "Google account email is not verified.", 401);
      return;
    }

    let user = await User.findOne({ email }).select("+refreshTokenHash");
    if (!user) {
      const fallbackPassword = await bcrypt.hash(`google:${payload.sub}:${Date.now()}`, 12);
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: fallbackPassword,
        role: role === "admin" || role === "waiter" || role === "chef" || role === "staff" || role === "kitchen" ? role : "customer",
        isEmailVerified: true,
      });
    }

    if (!user.isActive) {
      sendError(res, "This account is disabled.", 403);
      return;
    }

    sendSuccess(res, await issueAuthSession(user), "Google login successful.");
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      sendError(res, "Refresh token is required.", 400);
      return;
    }

    let payload: { sub: string; email: string; role: string; restaurantId?: string };

    try {
      payload = jwt.verify(refreshToken, jwtConfig.refreshSecret) as typeof payload;
    } catch {
      sendError(res, "Invalid or expired refresh token.", 401);
      return;
    }

    const user = await User.findById(payload.sub).select("+refreshTokenHash");
    if (!user?.refreshTokenHash) {
      sendError(res, "Session not found.", 401);
      return;
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      sendError(res, "Refresh token mismatch.", 401);
      return;
    }

    const authUser = toAuthUser(user);
    const tokenPayload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      restaurantId: authUser.restaurantId,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await user.save();

    sendSuccess(res, { user: authUser, accessToken: newAccessToken, refreshToken: newRefreshToken }, "Token refreshed.");
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
    }
    sendSuccess(res, null, "Logged out successfully.");
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }
    sendSuccess(res, { user: toAuthUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, whatsappNumber, address } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      whatsappNumber?: string;
      address?: string;
    };

    const user = await User.findById(req.user?.id);
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }

    const nextEmail = String(email ?? user.email).trim().toLowerCase();
    if (nextEmail !== user.email) {
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) {
        sendError(res, "Email is already registered.", 409);
        return;
      }
      user.email = nextEmail;
    }

    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim() || undefined;
    if (whatsappNumber !== undefined) user.whatsappNumber = String(whatsappNumber).trim() || undefined;
    if (address !== undefined) user.address = String(address).trim() || undefined;

    await user.save();
    sendSuccess(res, { user: toAuthUser(user) }, "Profile updated.");
  } catch (err) {
    next(err);
  }
}
