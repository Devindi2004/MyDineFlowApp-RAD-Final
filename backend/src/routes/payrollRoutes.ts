import { Router } from "express";
import { body } from "express-validator";
import { createPayroll, deletePayroll, downloadPayslip, generatePayroll, listPayroll, markPayrollPaid, sendPayrollPayslip, updatePayroll } from "../controllers/payrollController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate, authorize("admin"));
router.get("/", listPayroll);
router.post("/generate", generatePayroll);
router.post(
  "/",
  [
    body("staffId").isMongoId().withMessage("Valid staff member is required."),
    body("month").trim().notEmpty().withMessage("Payroll month is required."),
    body("baseSalary").isFloat({ min: 0 }).withMessage("Base salary must be zero or more."),
    body("allowances").optional().isFloat({ min: 0 }).withMessage("Allowances must be zero or more."),
    body("deductions").optional().isFloat({ min: 0 }).withMessage("Deductions must be zero or more."),
  ],
  validate,
  createPayroll
);
router.patch("/:id/paid", markPayrollPaid);
router.patch("/:id/whatsapp", sendPayrollPayslip);
router.patch("/:id", updatePayroll);
router.get("/:id/payslip", downloadPayslip);
router.delete("/:id", deletePayroll);

export default router;
