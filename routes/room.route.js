import express from "express";
import roomController from "../controllers/room.controller.js";
import * as authController from "../controllers/auth.controller.js";
import {
  createRoomValidator,
  updateRoomValidator,
  getRoomValidator,
  deleteRoomValidator,
  checkAvailableRoomsValidator,
  checkRoomAvailabilityValidator,
} from "../utils/validatorSchemas/roomSchema.js";

const router = express.Router();

router.get(
  "/:id/check-availability",
  checkRoomAvailabilityValidator,
  roomController.checkAvailability,
);

router.get(
  "/check-available-rooms",
  checkAvailableRoomsValidator,
  roomController.checkAvailableRooms,
);

router
  .route("/")
  .get(roomController.getAllRooms)
  .post(
    authController.protect,
    authController.allowedTo("admin", "manager"),
    roomController.uploadRoomImage,
    roomController.resizeRoomImage,
    createRoomValidator,
    roomController.createRoom,
  );

router
  .route("/:id")
  .get(getRoomValidator, roomController.getRoom)
  .patch(
    authController.protect,
    authController.allowedTo("admin", "manager"),
    roomController.uploadRoomImage,
    roomController.resizeRoomImage,
    updateRoomValidator,
    roomController.updateRoom,
  )
  .delete(
    authController.protect,
    authController.allowedTo("admin", "manager"),
    deleteRoomValidator,
    roomController.deleteRoom,
  );

export default router;
