import { Router } from "express";
import { chatWithAssistant, getRecommendations } from "../controllers/aiController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/chat", chatWithAssistant);
router.post("/recommendations", authenticate, getRecommendations);

export default router;
