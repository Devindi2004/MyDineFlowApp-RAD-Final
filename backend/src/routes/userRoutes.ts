import { Router } from "express";
import { body } from "express-validator";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/userController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate, authorize("admin"));
router.get("/", listUsers);
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
    body("phone").optional({ checkFalsy: true }).trim(),
    body("whatsappNumber").optional({ checkFalsy: true }).trim().isLength({ min: 7 }).withMessage("WhatsApp number must be valid."),
    body("role").isIn(["admin", "waiter", "chef", "staff", "kitchen"]).withMessage("Valid staff role is required."),
    body("salaryType").optional({ checkFalsy: true }).isIn(["monthly", "hourly"]).withMessage("Salary type must be monthly or hourly."),
    body("monthlySalary").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("Monthly salary must be zero or more."),
    body("dailyRate").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("Daily rate must be zero or more."),
    body("hourlyRate").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("Hourly rate must be zero or more."),
    body("overtimeRate").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("Overtime rate must be zero or more."),
    body("attendancePin").optional({ checkFalsy: true }).isLength({ min: 4, max: 12 }).withMessage("Attendance PIN must be 4 to 12 characters."),
  ],
  validate,
  createUser
);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
