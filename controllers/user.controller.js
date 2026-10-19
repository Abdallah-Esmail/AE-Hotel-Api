import User from "../models/user.model.js";
import handlersFactory from "./handlersFactory.controller.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";
import createToken from "../utils/createToken.js";

const getUsers = handlersFactory.getAll(User);
const getUser = handlersFactory.getOne(User);

const createUser = asyncWrapper(async (req, res, next) => {
  const allowedFields = ["firstName", "lastName", "phone", "email", "password"];
  const bodyContent = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      bodyContent[field] = req.body[field];
    }
  });

  const user = await User.create(bodyContent);
  res.status(200).json({ status: httpStatusText.SUCCESS, data: user });
});

const updateUser = asyncWrapper(async (req, res, next) => {
  const allowedFields = ["firstName", "lastName", "phone", "active"];
  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const user = await User.findByPk(req.params.id);
  if (!user) {
    const error = new appError("Document not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  await user.update(updateData);

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { document: user },
  });
});

const updateUserRole = asyncWrapper(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    const error = new appError("User not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  await user.update({ role: req.body.role });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { user },
  });
});

const deactivateUser = asyncWrapper(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    const error = new appError("Document not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  await user.update({ active: false });

  res.status(204).send();
});

const getLoggedUserData = asyncWrapper(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

const updateLoggedUserPassword = asyncWrapper(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  if (!user) {
    const error = new appError("User not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  await user.update({
    password: req.body.newPassword,
    passwordChangedAt: new Date(),
  });

  const token = createToken(user.id);
  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { user },
    token,
  });
});

const updateLoggedUserData = asyncWrapper(async (req, res, next) => {
  const allowedFields = ["firstName", "lastName", "phone"];
  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    const err = new appError(
      "Please, enter the data to update",
      400,
      httpStatusText.FAIL,
    );
    return next(err);
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    const error = new appError("User not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  await user.update(updateData);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { document: user },
  });
});

const deleteLoggedUser = asyncWrapper(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (user) {
    await user.update({ active: false });
  }
  res.status(204).send();
});

export {
  getUsers,
  getUser,
  updateUser,
  createUser,
  updateUserRole,
  deactivateUser,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUser,
};
