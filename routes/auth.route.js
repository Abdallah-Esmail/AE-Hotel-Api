import express from "express";
import {
  signupValidator,
  loginValidator,
} from "../utils/validatorSchemas/authSchema.js";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

router.route("/signup").post(signupValidator, authController.signup);
router.route("/login").post(loginValidator, authController.login);
router.route("/forgetPassword").post(authController.forgetPassword);
router.route("/resetPassword").put(authController.resetPassword);
router
  .route("/verifyPasswordResetCode")
  .post(authController.verifyPasswordResetCode);

export default router;
