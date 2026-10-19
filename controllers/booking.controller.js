import Stripe from "stripe";
import { Op } from "sequelize";
import { Booking, Room } from "../models/index.js";
import { sequelize } from "../config/database.js";
import handlerFactory from "./handlersFactory.controller.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";

const stripe = new Stripe(process.env.STRIPE_SECRET);

const modifyBooking = async (event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const bookingId = session.client_reference_id;
      if (session.payment_status !== "paid") {
        console.log("Session completed but payment not yet confirmed");
        return;
      }

      if (!bookingId) {
        console.error("No client_reference_id found in session");
        return;
      }

      // Check if the request is duplicated
      const existingBooking = await Booking.findByPk(bookingId);
      if (!existingBooking) return;
      if (existingBooking.isPaid) return;
      // Modify booking
      await Booking.update(
        {
          status: "confirmed",
          isPaid: true,
          paidAt: new Date(),
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
        { where: { id: bookingId } },
      );
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const booking = await Booking.findOne({
        where: {
          paymentIntentId: charge.payment_intent,
        },
      });
      if (!booking) {
        console.error("Booking not found for this refund!");
        return;
      }
      // Check if the request is duplicated
      if (booking.isRefunded) return;

      // Modify booking
      booking.isRefunded = true;
      booking.refundedAt = new Date();
      booking.status = "cancelled";
      booking.paymentIntentId = charge.payment_intent;
      await booking.save();

      break;
    }
    default:
      // Ignore event types we don't handle
      break;
  }
};

// GET /api/v1/Bookings
const getAllBookings = handlerFactory.getAll(Booking);

// GET /api/v1/Bookings/:id
const getBooking = asyncWrapper(async (req, res, next) => {
  const booking = await Booking.findByPk(req.params.id);

  if (!booking) {
    return next(new appError("Booking not found", 404, httpStatusText.FAIL));
  }

  if (
    booking.userId !== req.user.id &&
    req.user.role !== "admin" &&
    req.user.role !== "manager"
  ) {
    return next(
      new appError(
        "Not authorized to view this booking",
        403,
        httpStatusText.FAIL,
      ),
    );
  }

  res.status(200).json({ status: httpStatusText.SUCCESS, data: booking });
});

// Get /api/v1/rooms/:id/bookings
const getRoomBookings = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { from, to } = req.query;

  const room = await Room.findByPk(id);
  if (!room) {
    return next(new appError("Room not found", 404, httpStatusText.FAIL));
  }

  const holdCutoff = new Date(Date.now() - 15 * 60 * 1000);

  const where = {
    roomId: id,
    [Op.or]: [
      { status: "confirmed" },
      { status: "pending", createdAt: { [Op.gt]: holdCutoff } },
    ],
  };

  if (from && to) {
    where[Op.and] = [
      { checkIn: { [Op.lt]: to } },
      { checkOut: { [Op.gt]: from } },
    ];
  }

  const bookings = await Booking.findAll({
    where,
    attributes: ["id", "checkIn", "checkOut", "status"],
    order: [["checkIn", "ASC"]],
  });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    results: bookings.length,
    data: bookings,
  });
});

// POST /api/v1/Bookings
const createBooking = asyncWrapper(async (req, res, next) => {
  const { roomId, checkIn, checkOut, guestsCount } = req.body;
  const userId = req.user.id;

  if (!roomId || !checkIn || !checkOut || !guestsCount) {
    return next(
      new appError(
        "roomId, checkIn, checkOut and guestsCount are required",
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  if (new Date(checkIn) < new Date()) {
    return next(
      new appError("checkIn cannot be in the past", 400, httpStatusText.FAIL),
    );
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    return next(
      new appError("checkOut must be after checkIn", 400, httpStatusText.FAIL),
    );
  }

  const room = await Room.findByPk(roomId);

  if (!room) {
    return next(
      new appError("There is no room with this ID", 404, httpStatusText.FAIL),
    );
  }

  if (guestsCount > room.capacity) {
    return next(
      new appError(
        `The maximum number of guests in this room is ${room.capacity}`,
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  if (room.status !== "available") {
    return next(
      new appError(
        `This room is under maintenance at the moment`,
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  const nights =
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
  const totalPrice = nights * room.pricePerNight;

  const t = await sequelize.transaction();
  try {
    // Cleanup the pending expired bookings
    await Booking.update(
      { status: "cancelled" },
      {
        where: {
          status: "pending",
          createdAt: {
            [Op.lt]: new Date(Date.now() - 15 * 60 * 1000),
          },
        },
        transaction: t,
      },
    );

    // Booking creation
    const booking = await Booking.create(
      {
        userId,
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        totalPrice,
        status: "pending",
      },
      { transaction: t },
    );

    await t.commit();

    return res.status(201).json({
      status: httpStatusText.SUCCESS,
      data: booking,
    });
  } catch (error) {
    console.error("DATABASE CATCH ERROR:", error);

    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rollbackErr) {
        console.error(
          "Rollback skipped (transaction already closed by trigger):",
          rollbackErr.message,
        );
      }
    }

    let aggregateMessages = [];
    if (Array.isArray(error.original?.errors)) {
      aggregateMessages = error.original.errors.map((err) => err.message || "");
    } else if (Array.isArray(error.parent?.errors)) {
      aggregateMessages = error.parent.errors.map((err) => err.message || "");
    }

    const aggregatedText = aggregateMessages.join(" ");

    const errorMessage =
      aggregateMessages[0] ||
      error.original?.message ||
      error.parent?.sqlMessage ||
      error.message ||
      "Internal server error";

    if (
      errorMessage.includes("overlap with an existing active booking") ||
      aggregatedText.includes("overlap with an existing active booking")
    ) {
      return next(
        new appError(
          "This room is already booked for these dates",
          409,
          httpStatusText.FAIL,
        ),
      );
    }

    if (
      error.name === "SequelizeExclusionConstraintError" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return next(
        new appError(
          "This room is already booked for these dates, or you have a pending booking awaiting payment",
          409,
          httpStatusText.FAIL,
        ),
      );
    }

    return next(new appError(errorMessage, 500, httpStatusText.FAIL));
  }
});

// PATCH /api/v1/Bookings/:id/cancel
const cancelBooking = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const booking = await Booking.findByPk(id);

  if (!booking) {
    return next(new appError("Booking not found", 404, httpStatusText.FAIL));
  }

  // Only the booking owner or an admin can cancel it
  if (
    booking.userId !== userId &&
    req.user.role !== "admin" &&
    req.user.role !== "manager"
  ) {
    return next(
      new appError(
        "Not authorized to cancel this booking",
        403,
        httpStatusText.FAIL,
      ),
    );
  }

  if (booking.status === "cancelled") {
    return next(
      new appError("Booking is already cancelled", 400, httpStatusText.FAIL),
    );
  }

  booking.status = "cancelled";
  await booking.save();

  res.status(200).json({ status: httpStatusText.SUCCESS, data: booking });
});

// POST /api/v1/Bookings/:id/checkout-session
const checkoutSession = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findByPk(id);
  if (!booking) {
    return next(new appError("Booking not found", 404, httpStatusText.FAIL));
  }
  if (booking.userId !== req.user.id) {
    return next(new appError("Not authorized", 403, httpStatusText.FAIL));
  }
  if (booking.status !== "pending") {
    return next(
      new appError("Booking is not pending payment", 400, httpStatusText.FAIL),
    );
  }
  if (Date.now() - new Date(booking.createdAt).getTime() > 15 * 60 * 1000) {
    return next(
      new appError(
        "Booking hold expired, please create a new booking",
        400,
        httpStatusText.FAIL,
      ),
    );
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Card Checkout",
          },
          unit_amount: Math.round(
            (Number(booking.totalPrice) +
              Number(booking.totalPrice) * Number(process.env.TAX_PERCENT)) *
              100,
          ),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `https://ae-hotel.vercel.app/bookings/${booking.id}`,
    cancel_url: `https://ae-hotel.vercel.app/checkout`,
    customer_email: req.user.email,
    client_reference_id: booking.id.toString(),
  });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    session: session.url,
  });
});

const webhookCheckout = asyncWrapper(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Modify Booking
  try {
    await modifyBooking(event);
  } catch (e) {
    return res.status(500).json({ error: "Webhook failed" });
  }

  res.status(200).json({ received: true });
});

export default {
  getAllBookings,
  getBooking,
  getRoomBookings,
  createBooking,
  cancelBooking,
  checkoutSession,
  webhookCheckout,
};
