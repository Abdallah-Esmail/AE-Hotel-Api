import { body, param, query } from "express-validator";
import validatorMiddleware from "../../middlewares/validationMiddleware.js";

const roomTypes = ["single", "double", "suite", "deluxe"];
const roomStatuses = ["available", "maintenance"];

const dateQuery = (field) =>
  query(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isDate({ format: "YYYY-MM-DD", strictMode: true, delimiters: ["-"] })
    .withMessage(`${field} must be a valid date in YYYY-MM-DD format`);

const checkOutAfterCheckIn = query("checkOut").custom((value, { req }) => {
  if (new Date(value) <= new Date(req.query.checkIn)) {
    throw new Error("checkOut must be after checkIn");
  }
  return true;
});

export const createRoomValidator = [
  body("roomNumber")
    .notEmpty()
    .withMessage("Room number is required")
    .isString()
    .withMessage("Room number must be a string")
    .trim(),

  body("type")
    .notEmpty()
    .withMessage("Room type is required")
    .isIn(roomTypes)
    .withMessage(`Type must be one of: ${roomTypes.join(", ")}`),

  body("pricePerNight")
    .notEmpty()
    .withMessage("Price per night is required")
    .isFloat({ min: 0 })
    .withMessage("Price per night must be a positive number"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1 })
    .withMessage("Capacity must be an integer and at least 1"),

  body("status")
    .optional()
    .isIn(roomStatuses)
    .withMessage(`Status must be one of: ${roomStatuses.join(", ")}`),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim(),

  body("mainImage")
    .notEmpty()
    .withMessage("Main image is required")
    .isString()
    .withMessage("Main image must be a valid path or URL"),

  body("imageUrls")
    .optional()
    .isArray()
    .withMessage("Image URLs must be an array"),

  body("imageUrls.*")
    .optional()
    .isString()
    .withMessage("Each item in imageUrls must be a string/URL"),

  validatorMiddleware,
];

export const updateRoomValidator = [
  param("id").isUUID(4).withMessage("Invalid Room ID format (Must be UUIDv4)"),

  body("roomNumber")
    .optional()
    .isString()
    .withMessage("Room number must be a string")
    .trim(),

  body("type")
    .optional()
    .isIn(roomTypes)
    .withMessage(`Type must be one of: ${roomTypes.join(", ")}`),

  body("pricePerNight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price per night must be a positive number"),

  body("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Capacity must be an integer and at least 1"),

  body("status")
    .optional()
    .isIn(roomStatuses)
    .withMessage(`Status must be one of: ${roomStatuses.join(", ")}`),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim(),

  body("mainImage")
    .optional()
    .isString()
    .withMessage("Main image must be a valid path or URL"),

  body("imageUrls")
    .optional()
    .isArray()
    .withMessage("Image URLs must be an array"),

  body("imageUrls.*")
    .optional()
    .isString()
    .withMessage("Each item in imageUrls must be a string/URL"),

  validatorMiddleware,
];

export const getRoomValidator = [
  param("id").isUUID(4).withMessage("Invalid Room ID format (Must be UUIDv4)"),

  validatorMiddleware,
];

export const deleteRoomValidator = [
  param("id").isUUID(4).withMessage("Invalid Room ID format (Must be UUIDv4)"),

  validatorMiddleware,
];

export const checkRoomAvailabilityValidator = [
  param("id").isUUID(4).withMessage("Invalid Room ID format (Must be UUIDv4)"),
  dateQuery("checkIn"),
  dateQuery("checkOut"),
  checkOutAfterCheckIn,
  validatorMiddleware,
];

export const checkAvailableRoomsValidator = [
  dateQuery("checkIn"),
  dateQuery("checkOut"),
  checkOutAfterCheckIn,
  query("guests")
    .notEmpty()
    .withMessage("guests is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("guests must be a positive integer"),
  validatorMiddleware,
];
