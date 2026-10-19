import { Op } from "sequelize";
import sharp from "sharp";
import { Room, Booking } from "../models/index.js";
import handlerFactory from "./handlersFactory.controller.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";
import cloudinary from "../config/cloudinary.js";
import { uploadSingleImage } from "../middlewares/uploadImage.js";

const isDate = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

// Cloudinary config

// Upload single image/
const uploadRoomImage = uploadSingleImage("mainImage");

// Image processing
const resizeRoomImage = asyncWrapper(async (req, res, next) => {
  if (req.file) {
    const processedBuffer = await sharp(req.file.buffer)
      .resize(1920, 1080, {
        fit: "cover",
        background: "#ffffff",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();

    try {
      const base64Image = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "rooms",
      });

      req.body.mainImage = result.secure_url;
    } catch (error) {
      return next(new appError(error, 500, httpStatusText.FAIL));
    }
  }

  next();
});

// GET /api/v1/rooms
const getAllRooms = handlerFactory.getAll(Room);

// GET /api/v1/rooms/:id
const getRoom = handlerFactory.getOne(Room);

// POST /api/v1/rooms
const createRoom = handlerFactory.createOne(Room);

// PATCH /api/v1/rooms/:id
const updateRoom = handlerFactory.updateOne(Room);

// DELETE /api/v1/rooms/:id
const deleteRoom = handlerFactory.deleteOne(Room);

// GET /api/v1/rooms/:id/check-availability?checkIn=yyyy-mm-dd&checkOut=yyyy-mm-dd
const checkAvailability = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { checkIn, checkOut } = req.query;

  if (!isDate(checkIn) || !isDate(checkOut)) {
    return next(
      new appError(
        "checkIn and checkOut are required in YYYY-MM-DD format",
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  if (!checkIn || !checkOut) {
    const error = new appError(
      "checkIn and checkOut dates are required",
      400,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    return next(
      new appError("checkOut must be after checkIn", 400, httpStatusText.FAIL),
    );
  }

  const room = await Room.findByPk(id);
  if (!room) {
    const error = new appError("Room not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  const holdCutoff = new Date(Date.now() - 15 * 60 * 1000);

  const overlappingCount = await Booking.count({
    where: {
      roomId: id,
      checkIn: { [Op.lt]: checkOut },
      checkOut: { [Op.gt]: checkIn },
      [Op.or]: [
        { status: "confirmed" },
        { status: "pending", createdAt: { [Op.gt]: holdCutoff } },
      ],
    },
  });

  const isAvailable = room.status === "available" && overlappingCount === 0;
  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      roomId: room.id,
      isAvailable,
    },
  });
});

// GET /api/v1/rooms/check-availableRooms?checkIn=yyyy-mm-dd&checkOut=yyyy-mm-dd&guests=n
const checkAvailableRooms = asyncWrapper(async (req, res, next) => {
  const { checkIn, checkOut, guests } = req.query;

  if (!isDate(checkIn) || !isDate(checkOut)) {
    return next(
      new appError(
        "checkIn and checkOut are required in YYYY-MM-DD format",
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  const guestsCount = Number(guests);
  if (!Number.isInteger(guestsCount) || guestsCount < 1) {
    return next(
      new appError(
        "guests must be a positive integer",
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    return next(
      new appError("checkOut must be after checkIn", 400, httpStatusText.FAIL),
    );
  }

  const holdCutoff = new Date(Date.now() - 15 * 60 * 1000);

  const conflictingBookings = await Booking.findAll({
    where: {
      checkIn: { [Op.lt]: checkOut },
      checkOut: { [Op.gt]: checkIn },
      [Op.or]: [
        { status: "confirmed" },
        { status: "pending", createdAt: { [Op.gt]: holdCutoff } },
      ],
    },
    attributes: ["roomId"],
  });

  const bookedRoomIds = [...new Set(conflictingBookings.map((b) => b.roomId))];

  const where = {
    status: "available",
    id: { [Op.notIn]: bookedRoomIds },
    capacity: { [Op.gte]: Number(guestsCount) },
  };

  const availableRooms = await Room.findAll({ where });

  res.status(200).json({
    results: availableRooms.length,
    data: availableRooms,
  });
});

export default {
  getAllRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  uploadRoomImage,
  resizeRoomImage,
  checkAvailability,
  checkAvailableRooms,
};
