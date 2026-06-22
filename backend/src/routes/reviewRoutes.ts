import { Router } from "express";
import { getReviews, createReview, updateReview, deleteReview } from "../controllers/reviewController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", getReviews);
router.post("/", authenticate, createReview);
router.put("/:id", authenticate, updateReview);
router.patch("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);

export default router;
