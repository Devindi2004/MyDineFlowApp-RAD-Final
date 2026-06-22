import { Router } from "express";
import { body } from "express-validator";
import { register, login, googleLogin, refresh, logout, getMe, updateMe } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  register
);
router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validate,
  login
);
router.post(
  "/signin",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validate,
  login
);

router.post(
  "/google",
  [body("credential").notEmpty().withMessage("Google credential is required.")],
  validate,
  googleLogin
);

router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.patch(
  "/me",
  authenticate,
  [
    body("name").optional({ checkFalsy: true }).trim().notEmpty().withMessage("Name cannot be empty."),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Valid email is required."),
    body("phone").optional({ checkFalsy: true }).trim(),
    body("whatsappNumber").optional({ checkFalsy: true }).trim().isLength({ min: 7 }).withMessage("WhatsApp number must be valid."),
    body("address").optional({ checkFalsy: true }).trim(),
  ],
  validate,
  updateMe
);

export default router;
