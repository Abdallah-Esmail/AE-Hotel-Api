import bcrypt from "bcryptjs";
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
      },
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "manager"),
      defaultValue: "user",
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
    },
    passwordResetCode: {
      type: DataTypes.STRING,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
    },
    passwordResetVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
);

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.passwordResetCode;
  delete values.passwordResetExpires;
  delete values.passwordResetVerified;
  return values;
};

User.beforeSave(async (user) => {
  if (!user.changed("password")) return;
  user.password = await bcrypt.hash(user.password, 12);
  user.passwordChangedAt = new Date();
});

export default User;
