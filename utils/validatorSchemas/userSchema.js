import { body, param } from "express-validator";
import bcrypt from "bcryptjs";
import validatorMiddleware from "../../middlewares/validationMiddleware.js";
import User from "../../models/user.model.js";

export const getUserValidator = [
  param("id").isUUID(4).withMessage("Invalid user ID format (Must be UUIDv4)"),
  validatorMiddleware,
];

export const createUserValidator = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string")
    .isLength({ min: 3, max: 32 })
    .withMessage("First name must be between 3 and 32 characters"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail()
    .custom(async (val) => {
      const user = await User.findOne({ where: { email: val } });
      if (user) {
        throw new Error("Email already exists");
      }
      return true;
    }),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 100 })
    .withMessage("Password must be between 8 and 100 characters")
    .matches(/^\S+$/)
    .withMessage("Password must not contain spaces"),

  body("passwordConfirmation")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((passwordConfirmation, { req }) => {
      if (passwordConfirmation !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),

  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepts Egy & SA phone numbers"),

  validatorMiddleware,
];

export const updateUserValidator = [
  param("id").isUUID(4).withMessage("Invalid user ID format (Must be UUIDv4)"),
  body("firstName")
    .optional()
    .isString()
    .withMessage("First name must be a string"),
  body("lastName")
    .optional()
    .isString()
    .withMessage("Last name must be a string"),
  body("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepts Egy & SA phone numbers"),
  validatorMiddleware,
];

export const changeUserPasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("passwordConfirmation")
    .notEmpty()
    .withMessage("Confirmation password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: 100 })
    .withMessage("New password must be between 8 and 100 characters")
    .matches(/^\S+$/)
    .withMessage("Password must not contain spaces")
    .custom((newPassword, { req }) => {
      if (newPassword !== req.body.passwordConfirmation) {
        throw new Error(
          "The confirmation password is not equal to the new password",
        );
      }
      return true;
    })
    .custom(async (newPassword, { req }) => {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        throw new Error("Authentication required");
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("There is no user for this id");
      }

      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        user.password,
      );
      if (!isMatch) {
        throw new Error("Incorrect current password");
      }

      return true;
    }),

  validatorMiddleware,
];

export const deactivateUserValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isUUID(4)
    .withMessage("Invalid user ID format (Must be UUIDv4)"),
  validatorMiddleware,
];

export const updateLoggedUserValidator = [
  body("firstName")
    .optional()
    .isString()
    .withMessage("First name must be a string"),
  body("lastName")
    .optional()
    .isString()
    .withMessage("Last name must be a string"),
  body("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepts Egy & SA phone numbers"),
  validatorMiddleware,
];

export const updateUserRoleValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isUUID(4)
    .withMessage("Invalid user ID format (Must be UUIDv4)"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["user", "manager", "admin"])
    .withMessage("Invalid role"),
  validatorMiddleware,
];
