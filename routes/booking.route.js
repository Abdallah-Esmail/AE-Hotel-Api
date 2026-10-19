import express from "express";
import bookingController from "../controllers/booking.controller.js";
import { protect, allowedTo } from "../controllers/auth.controller.js";
import {
  createBookingValidator,
  getBookingValidator,
  cancelValidator,
  checkoutValidator,
} from "../utils/validatorSchemas/bookingSchema.js";

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get(
  "/",
  allowedTo("admin", "manager"),
  bookingController.getAllBookings,
);

router.post("/", createBookingValidator, bookingController.createBooking);

router.route("/:id").get(getBookingValidator, bookingController.getBooking);

router.patch("/:id/cancel", cancelValidator, bookingController.cancelBooking);

router.post(
  "/:id/checkout-session",
  checkoutValidator,
  bookingController.checkoutSession,
);

export default router;
