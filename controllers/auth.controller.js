import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";
import User from "../models/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import createToken from "../utils/createToken.js";

const signup = asyncWrapper(async (req, res, next) => {
  // Create user
  const user = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
  });

  const token = createToken(user.id);
  res.status(201).json({ data: user, token });
});

const login = asyncWrapper(async (req, res, next) => {
  const user = await User.findOne({
    where: {
      email: req.body.email,
    },
  });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(
      new appError("Incorrect email or password", 401, httpStatusText.FAIL),
    );
  }
  if (!user.active)
    return next(
      new appError(
        "Your account has been deactivated",
        401,
        httpStatusText.FAIL,
      ),
    );

  const token = createToken(user.id);
  res.status(200).json({ data: user, token });
});

const protect = asyncWrapper(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token || token === "null") {
    const err = new appError(
      "You have not logged in, please login to get access this resource",
      401,
      httpStatusText.FAIL,
    );
    return next(err);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (jwtErr) {
    return next(
      new appError(
        "Invalid or expired token, please log in again",
        401,
        httpStatusText.FAIL,
      ),
    );
  }
  const currentUser = await User.findByPk(decoded.userId);
  if (!currentUser) {
    const err = new appError(
      "The user that belong to this token does no longer exists",
      401,
      httpStatusText.FAIL,
    );
    return next(err);
  }
  if (!currentUser.active) {
    const err = new appError(
      "This account is inactive",
      401,
      httpStatusText.FAIL,
    );
    return next(err);
  }
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10,
    );
    // Password has changed after token created
    if (passChangedTimestamp > decoded.iat) {
      const err = new appError(
        "This user has changed his password recently, please login again...",
        401,
        httpStatusText.FAIL,
      );
      return next(err);
    }
  }
  req.user = currentUser;
  next();
});

const allowedTo = (...roles) =>
  asyncWrapper(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new appError(
        "You are not allowed to access this route",
        403,
        httpStatusText.FAIL,
      );
      return next(err);
    }
    next();
  });

const forgetPassword = asyncWrapper(async (req, res, next) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) {
    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: "If user exists reset code has sent to email",
    });
  }

  const resetCode = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.passwordResetVerified = false;
  await user.save();
  const message = `Hi, ${user.name},\nWe received a request to reset the password on your AE-Hotel Account. \n${resetCode}. \n Enter this code to complete the reset.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code {valid for 10 minutes}",
      message,
    });
  } catch (err) {
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    user.passwordResetVerified = false;
    await user.save();
    return next(
      new appError(
        "There is an error in sending email",
        500,
        httpStatusText.ERROR,
      ),
    );
  }
  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "If user exists reset code has sent to email",
  });
});

const verifyPasswordResetCode = asyncWrapper(async (req, res, next) => {
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");
  const user = await User.findOne({
    where: {
      passwordResetCode: hashedResetCode,
      passwordResetExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    const err = new appError(
      "Reset code is invalid or expired",
      404,
      httpStatusText.FAIL,
    );
    return next(err);
  }
  user.passwordResetVerified = true;
  await user.save();
  res.status(200).json({ status: httpStatusText.SUCCESS });
});

const resetPassword = asyncWrapper(async (req, res, next) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) {
    const err = new appError(
      "Invalid request or expired code",
      400,
      httpStatusText.FAIL,
    );
    return next(err);
  }

  if (
    !user ||
    !user.passwordResetVerified ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date()
  ) {
    const err = new appError(
      "Invalid request or expired code",
      400,
      httpStatusText.FAIL,
    );
    return next(err);
  }

  if (!user.passwordResetVerified) {
    const err = new appError(
      "Invalid request or expired code",
      400,
      httpStatusText.FAIL,
    );
    return next(err);
  }
  user.password = req.body.newPassword;
  user.passwordChangedAt = new Date();
  user.passwordResetCode = null;
  user.passwordResetExpires = null;
  user.passwordResetVerified = false;
  await user.save();

  const token = createToken(user.id);
  res.status(200).json({ token });
});

export {
  signup,
  login,
  protect,
  allowedTo,
  forgetPassword,
  verifyPasswordResetCode,
  resetPassword,
};
