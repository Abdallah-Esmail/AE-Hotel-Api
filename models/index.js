import User from "./user.model.js";
import Booking from "./booking.model.js";
import Room from "./room.model.js";

User.hasMany(Booking, { foreignKey: "userId" });
Booking.belongsTo(User, { foreignKey: "userId" });

Room.hasMany(Booking, { foreignKey: "roomId" });
Booking.belongsTo(Room, { foreignKey: "roomId" });

export { User, Booking, Room };
