import { Request, Response, NextFunction } from "express";
import { Review } from "../models/Review";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";

export async function getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId, orderId } = req.query as { restaurantId?: string; orderId?: string };
    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (orderId) filter.orderId = orderId;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate("customerId", "name");

    sendSuccess(res, reviews);
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await Review.create({
      ...req.body,
      customerId: req.user?.id,
    });
    sendSuccess(res, review, "Review submitted.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user?.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!review) {
      sendError(res, "Review not found or not authorized.", 404);
      return;
    }
    sendSuccess(res, review, "Review updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter =
      req.user?.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, customerId: req.user?.id };

    const review = await Review.findOneAndDelete(filter);
    if (!review) {
      sendError(res, "Review not found or not authorized.", 404);
      return;
    }
    sendSuccess(res, null, "Review deleted.");
  } catch (err) {
    next(err);
  }
}
