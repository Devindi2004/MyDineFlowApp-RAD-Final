import crypto from "crypto";
import { Resend } from "resend";
import { UserModel, type UserHydratedDocument } from "@/lib/models/user";

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_EXPIRES_MS = 1000 * 60 * 60 * 24;
const RESEND_COOLDOWN_MS = 1000 * 60;

export function createEmailVerificationToken() {
  const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expires = new Date(Date.now() + VERIFICATION_EXPIRES_MS);

  return { rawToken, tokenHash, expires };
}

export function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function canResendVerification(lastSentAt?: Date) {
  if (!lastSentAt) {
    return true;
  }

  return Date.now() - lastSentAt.getTime() >= RESEND_COOLDOWN_MS;
}

export function getResendCooldownSeconds(lastSentAt?: Date) {
  if (!lastSentAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSentAt.getTime())) / 1000)
  );
}

export async function assignEmailVerificationToken(
  user: UserHydratedDocument
) {
  const { expires, rawToken, tokenHash } = createEmailVerificationToken();

  user.emailVerificationToken = tokenHash;
  user.emailVerificationExpires = expires;
  user.emailVerificationLastSentAt = new Date();

  await user.save();

  return rawToken;
}

export async function sendVerificationEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_DINEFLOW_URL ?? "http://localhost:3000";
  const verificationUrl = new URL("/api/auth/verify-email", baseUrl);
  verificationUrl.searchParams.set("token", token);

  const html = createVerificationEmailTemplate({
    name,
    verificationUrl: verificationUrl.toString(),
  });

  if (!process.env.RESEND_API_KEY) {
    console.info("[DineFlow] Verification email dev fallback", {
      email,
      verificationUrl: verificationUrl.toString(),
    });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "DineFlow <onboarding@resend.dev>",
    to: email,
    subject: "Verify your DineFlow account",
    html,
  });
}

export async function prepareAndSendVerificationEmail(
  user: UserHydratedDocument
) {
  const rawToken = await assignEmailVerificationToken(user);

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    token: rawToken,
  });
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashEmailVerificationToken(token);
  const user = await UserModel.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    return null;
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationLastSentAt = undefined;

  await user.save();

  return user;
}

function createVerificationEmailTemplate({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#09090b;font-family:Inter,Arial,sans-serif;color:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;background:#18181b;overflow:hidden;">
                <tr>
                  <td style="padding:28px;background:linear-gradient(135deg,rgba(16,185,129,0.28),rgba(24,24,27,0.94),rgba(251,146,60,0.18));">
                    <div style="font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#a7f3d0;">DineFlow</div>
                    <h1 style="margin:16px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Verify your email</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#d4d4d8;">Hi ${escapeHtml(
                      name
                    )}, confirm your email to activate your smart dining account.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#d4d4d8;">
                      Your verification link is valid for 24 hours. After verification, you can sign in and access your role-specific DineFlow workspace.
                    </p>
                    <a href="${verificationUrl}" style="display:inline-block;background:#34d399;color:#09090b;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">Verify email</a>
                    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">If the button does not work, paste this link into your browser:<br><span style="color:#fb923c;word-break:break-all;">${verificationUrl}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
