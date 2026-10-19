import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validationMiddleware.js";
import User from "../../models/user.model.js";

export const signupValidator = [
  check("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .trim()
    .isString()
    .withMessage("Name must be string")
    .isLength({ min: 3, max: 32 })
    .withMessage("The name must be between 3 and 32 chars"),
  check("lastName")
    .notEmpty()
    .withMessage("First name is required")
    .trim()
    .isString()
    .withMessage("Name must be string")
    .isLength({ min: 3, max: 32 })
    .withMessage("The name must be between 3 and 32 chars"),
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail()
    .custom(async (val) => {
      const user = await User.findOne({ where: { email: val } });
      if (user) {
        throw new Error("The email already exists");
      }
      return true;
    }),

  check("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepts Egy & SA phone numbers"),
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 100 })
    .withMessage("The password must be between 6 and 32 chars")
    .matches(/^\S+$/)
    .withMessage("Password must not contain spaces"),
  check("passwordConfirmation")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((passwordConfirmation, { req }) => {
      if (passwordConfirmation !== req.body.password) {
        throw new Error("Password confirmation is incorrect");
      }
      return true;
    }),

  validatorMiddleware,
];

export const loginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  check("password").notEmpty().withMessage("Password is required"),
  validatorMiddleware,
];

export const forgetPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  validatorMiddleware,
];

export const verifyPasswordResetCodeValidator = [
  check("resetCode")
    .notEmpty()
    .withMessage("Reset code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Reset code must be 6 characters"),
  validatorMiddleware,
];

export const resetPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  check("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: 100 })
    .withMessage("The password must be between 6 and 32 chars")
    .matches(/^\S+$/)
    .withMessage("Password must not contain spaces"),
  validatorMiddleware,
];
