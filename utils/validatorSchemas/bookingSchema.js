import { body, param } from "express-validator";
import validatorMiddleware from "../../middlewares/validationMiddleware.js";

const bookingStatuses = ["pending", "confirmed", "cancelled"];

export const createBookingValidator = [
  body("roomId")
    .notEmpty()
    .withMessage("Room ID is required")
    .isUUID(4)
    .withMessage("Invalid Room ID format (Must be UUIDv4)"),
  body("userId")
    .optional()
    .isUUID(4)
    .withMessage("Invalid User ID format (Must be UUIDv4)"),

  body("checkIn")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Invalid date format (Must be YYYY-MM-DD)")
    .custom((value) => {
      if (new Date(value) < new Date(new Date().setHours(0, 0, 0, 0))) {
        throw new Error("Check-in date cannot be in the past");
      }
      return true;
    }),

  body("checkOut")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Invalid date format (Must be YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkIn)) {
        throw new Error("Check-out date must be strictly after check-in date");
      }
      return true;
    }),

  body("guestsCount")
    .notEmpty()
    .withMessage("Guests count is required")
    .isInt({ min: 1 })
    .withMessage("Guests count must be an integer and at least 1"),
  body("totalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total price must be a positive number"),

  validatorMiddleware,
];

export const updateBookingValidator = [
  param("id")
    .isUUID(4)
    .withMessage("Invalid Booking ID format (Must be UUIDv4)"),

  body("status")
    .optional()
    .isIn(bookingStatuses)
    .withMessage(`Status must be one of: ${bookingStatuses.join(", ")}`),

  body("checkIn")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (Must be YYYY-MM-DD)"),

  body("checkOut")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (Must be YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (req.body.checkIn && new Date(value) <= new Date(req.body.checkIn)) {
        throw new Error("Check-out date must be strictly after check-in date");
      }
      return true;
    }),

  body("guestsCount")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Guests count must be an integer and at least 1"),

  validatorMiddleware,
];

export const getBookingValidator = [
  param("id")
    .isUUID(4)
    .withMessage("Invalid Booking ID format (Must be UUIDv4)"),

  validatorMiddleware,
];

export const cancelValidator = [
  param("id")
    .isUUID(4)
    .withMessage("Invalid Booking ID format (Must be UUIDv4)"),

  validatorMiddleware,
];

export const checkoutValidator = [
  param("id")
    .isUUID(4)
    .withMessage("Invalid Booking ID format (Must be UUIDv4)"),

  validatorMiddleware,
];

export const deleteBookingValidator = [
  param("id")
    .isUUID(4)
    .withMessage("Invalid Booking ID format (Must be UUIDv4)"),

  validatorMiddleware,
];
