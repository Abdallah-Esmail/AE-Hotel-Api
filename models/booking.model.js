import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "room_id",
    },
    checkIn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "check_in",
    },
    checkOut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "check_out",
      validate: {
        isAfterCheckIn(value) {
          if (this.checkIn && value <= this.checkIn) {
            throw new Error("check_out must be after check_in");
          }
        },
      },
    },
    guestsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
      field: "guests_count",
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      field: "total_price",
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    isPaid: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_paid" },
    paidAt: { type: DataTypes.DATE, field: "paid_at" },
    paymentIntentId: { type: DataTypes.STRING, field: "payment_intent_id" },
    sessionId: { type: DataTypes.STRING, field: "session_id" },
    isRefunded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_refunded",
    },
    refundedAt: { type: DataTypes.DATE, field: "refunded_at" },
  },
  {
    timestamps: true,
    updatedAt: false,
    createdAt: true,
  },
);

export default Booking;
