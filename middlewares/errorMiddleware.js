import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";

const sendErrorForDev = (err, res) =>
  res.status(err.statusCode || 500).json({
    status: err.statusText || httpStatusText.ERROR,
    code: err.statusCode || 500,
    message: err.message,
    stack: err.stack,
  });

const sendErrorForProd = (err, res) =>
  res.status(err.statusCode || 500).json({
    status: err.statusText || httpStatusText.ERROR,
    message: err.message,
  });

const handelJwtInvalidSignature = new appError(
  "Invalid token, Please login again",
  401,
  httpStatusText.ERROR,
);

const handelJwtExpired = new appError(
  "Expired token, Please login again",
  401,
  httpStatusText.ERROR,
);

const globalError = (err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    if (err.name === "JsonWebTokenError") err = handelJwtInvalidSignature;
    if (err.name === "TokenExpiredError") err = handelJwtExpired;
    sendErrorForProd(err, res);
  }
};

export default globalError;
