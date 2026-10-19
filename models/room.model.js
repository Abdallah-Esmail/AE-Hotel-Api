import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "room_number",
    },
    type: {
      type: DataTypes.ENUM("single", "double", "suite", "deluxe"),
      allowNull: false,
    },
    pricePerNight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      field: "price_per_night",
      get() {
        const rawValue = this.getDataValue("pricePerNight");
        return rawValue === null || rawValue === undefined
          ? null
          : Number(rawValue);
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    status: {
      type: DataTypes.ENUM("available", "maintenance"),
      allowNull: false,
      defaultValue: "available",
    },
    description: {
      type: DataTypes.TEXT,
    },
    mainImage: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "main_image",
    },
    imageUrls: {
      type: DataTypes.TEXT,
      field: "image_urls",
      defaultValue: "[]",
      get() {
        const rawValue = this.getDataValue("imageUrls");
        try {
          return rawValue ? JSON.parse(rawValue) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        if (!Array.isArray(value)) {
          throw new Error("image_urls must be an array of strings");
        }
        this.setDataValue("imageUrls", JSON.stringify(value));
      },
    },
  },
  {
    timestamps: true,
    createdAt: true,
    updatedAt: false,
  },
);

export default Room;
