# AE-Hotel API

REST API for a hotel booking system: user accounts and roles, room management with image uploads, availability search, bookings with a temporary payment hold, and Stripe Checkout payments.

Built with **Node.js (ESM) · Express 5 · Sequelize 6 · PostgreSQL**.
The production frontend is expected at `https://ae-hotel.vercel.app`.

---

## 📑 API Documentation & Live Links

- 🦄 **Swagger API Docs:** https://app.swaggerhub.com/apis-docs/abdallah-1b2/ae-hotel/1.0.0?view=uiDocs
- 🐙 **GitHub Repository:** [abdallah-esmail/AE-Hotel-Api](https://github.com/Abdallah-Esmail/AE-Hotel-Api)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [Scripts](#scripts)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Booking & Payment Flow](#booking--payment-flow)
- [Query Features (filter / sort / paginate)](#query-features-filter--sort--paginate)
- [Response & Error Format](#response--error-format)
- [Code Style](#code-style)
- [Deployment Notes](#deployment-notes)

---

## Features

- **Authentication** – signup, login, JWT bearer tokens, password reset by emailed 6-digit code.
- **Roles** – `user`, `manager`, `admin` with route-level authorization.
- **Rooms** – CRUD (admin/manager), main image upload (processed with `sharp`, stored on Cloudinary), capacity, price per night, `available` / `maintenance` status.
- **Availability** – check one room or search all rooms by dates and guest count.
- **Bookings** – date-range bookings with total price calculated server-side, a 15-minute pending hold, cancellation, and overlap protection enforced in the database.
- **Payments** – Stripe Checkout sessions; booking is confirmed by a signed webhook; refunds are synced back from Stripe.
- **Security basics** – bcrypt password hashing, token invalidation after password change, request validation (`express-validator`), global rate limit, 20 KB JSON body limit, CORS allow-list.

## Tech Stack

| Area          | Library                                                     |
| ------------- | ----------------------------------------------------------- |
| Server        | Express 5                                                   |
| Database      | PostgreSQL (Supabase-style SSL) via Sequelize 6 + `pg`      |
| Auth          | `jsonwebtoken`, `bcryptjs`                                  |
| Validation    | `express-validator`                                         |
| Uploads       | `multer` (memory storage), `sharp`, `cloudinary`            |
| Payments      | `stripe`                                                    |
| Email         | `nodemailer`                                                |
| Rate limiting | `express-rate-limit`                                        |
| Tooling       | ESLint (airbnb-base) + Prettier, `nodemon`, `sequelize-cli` |

## Project Structure

```
.
├── index.js                     # App entry: middleware, routes, DB connect, server start
├── config/
│   ├── database.js              # Sequelize instance (PostgreSQL, SSL)
│   └── cloudinary.js            # Cloudinary client
├── controllers/
│   ├── auth.controller.js       # signup, login, protect, allowedTo, password reset
│   ├── user.controller.js       # profile + admin user management
│   ├── room.controller.js       # rooms, image processing, availability
│   ├── booking.controller.js    # bookings, Stripe checkout + webhook
│   └── handlersFactory.controller.js  # generic getAll/getOne/createOne/updateOne/deleteOne
├── middlewares/
│   ├── asyncWrapper.js
│   ├── errorMiddleware.js       # dev / prod error responses
│   ├── uploadImage.js           # multer config (images only, 5 MB)
│   └── validationMiddleware.js
├── migrations/                  # DB-level booking overlap protection
├── models/                      # User, Room, Booking (+ associations in index.js)
├── routes/                      # auth, users, rooms, bookings
└── utils/
    ├── apiFeatures.js           # filter / sort / fields / pagination
    ├── appError.js
    ├── createToken.js
    ├── sendEmail.js
    ├── httpStatusText.js
    └── validatorSchemas/        # express-validator chains per resource
```

## Getting Started

### Prerequisites

- Node.js 18+ (ESM and Express 5 required; Node 20+ recommended)
- A PostgreSQL database reachable over SSL (e.g. Supabase)
- A Cloudinary account (room images)
- A Stripe account (payments)
- An SMTP account (password-reset emails)

### Installation

```bash
git clone <your-repo-url> ae-hotel
cd ae-hotel
npm install
cp .env.example .env     # or create .env manually (see below)
```

### Run

```bash
# development (nodemon, loads .env)
npm run start:dev

# production
npm run start:prod
```

The server listens on `PORT` (default `5000`). On startup it authenticates against the database and runs `sequelize.sync({ force: false })`, which creates any missing tables.

## Environment Variables

Create a `.env` file in the project root:

```dotenv
# Server
PORT=5000
NODE_ENV=development            # development | production

# Database (PostgreSQL connection string, SSL is required by the config)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET_KEY=change-me-to-a-long-random-string
JWT_EXPIRE_TIME=7d

# Stripe
STRIPE_SECRET=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
TAX_PERCENT=0.14                # decimal fraction added on top of the booking price (0.14 = 14%)

# Cloudinary
CLOUD_NAME=your_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

# Email (SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=no-reply@example.com
EMAIL_PASS=your_smtp_password
```

> `TAX_PERCENT` must be set. If it is missing, the Stripe amount calculation produces `NaN` and checkout-session creation fails.
> Never commit `.env`; it is already in `.gitignore`.

## Database & Migrations

Tables are created by `sequelize.sync()` at startup. The migration in `migrations/` adds protections that `sync` cannot express:

1. A **partial unique index** `UX_Bookings_User_Pending`: a user can have only one `pending` booking at a time.
2. A **trigger** `trg_prevent_booking_overlap` (`check_booking_overlap()`): rejects inserts/updates whose date range overlaps another non-cancelled booking for the same room (check-out day may equal the next check-in day).

Because the migration alters the `"Bookings"` table, **start the app once first** so `sync` creates it, then run:

```bash
npm run db:migrate
```

`sequelize-cli` reads its connection settings from `config/config.json`. That file is not part of the repository, so create it before migrating:

```json
{
  "development": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": { "require": true, "rejectUnauthorized": false }
    }
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": { "require": true, "rejectUnauthorized": false }
    }
  }
}
```

> The project uses `"type": "module"`. If `sequelize-cli` fails to load the migration (ESM `export default`), rename the file to `.cjs` and convert it to `module.exports = { up, down }`.

## Scripts

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run start:dev`  | Start with `nodemon`, preloading `dotenv/config` |
| `npm run start:prod` | Start with `NODE_ENV=production`                 |
| `npm run db:migrate` | Run Sequelize migrations                         |
| `npm run lint`       | Run ESLint                                       |

## Roles & Permissions

| Role        | Capabilities                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------- |
| **user**    | Manage own profile/password, create bookings, view/cancel own bookings, pay for own bookings       |
| **manager** | Everything a user can, plus create/update/delete rooms, list all bookings, view/cancel any booking |
| **admin**   | Everything a manager can, plus user management and changing user roles                             |

New accounts always start as `user`. Only an admin can change a role.

## API Reference

Base URL: `/api/v1`. Protected routes need the header:

```
Authorization: Bearer <token>
```

### Auth — `/api/v1/auth`

| Method | Path                       | Auth | Description                                                |
| ------ | -------------------------- | ---- | ---------------------------------------------------------- |
| POST   | `/signup`                  | –    | Register a new user, returns `{ data, token }`             |
| POST   | `/login`                   | –    | Login, returns `{ data, token }`                           |
| POST   | `/forgetPassword`          | –    | Email a 6-digit reset code (valid 10 minutes)              |
| POST   | `/verifyPasswordResetCode` | –    | Verify the code                                            |
| PUT    | `/resetPassword`           | –    | Set a new password after verification, returns `{ token }` |

**Signup body**

```json
{
  "firstName": "Ahmed",
  "lastName": "Ali",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "password": "secret123",
  "passwordConfirmation": "secret123"
}
```

Rules: names 3–32 chars; phone must be an Egyptian or Saudi mobile number; password 8–100 chars, no spaces.

**Password reset flow**

```jsonc
// 1. POST /auth/forgetPassword            { "email": "ahmed@example.com" }
// 2. POST /auth/verifyPasswordResetCode   { "resetCode": "123456" }
// 3. PUT  /auth/resetPassword             { "email": "ahmed@example.com", "newPassword": "newSecret123" }
```

### Users — `/api/v1/users` (all routes require login)

| Method | Path                | Role  | Description                                                                         |
| ------ | ------------------- | ----- | ----------------------------------------------------------------------------------- |
| GET    | `/getMe`            | any   | Current user profile                                                                |
| PUT    | `/updateMe`         | any   | Update `firstName`, `lastName`, `phone`                                             |
| PUT    | `/changeMyPassword` | any   | Body: `currentPassword`, `newPassword`, `passwordConfirmation`; returns a new token |
| DELETE | `/deleteMe`         | any   | Deactivate own account (soft delete)                                                |
| PATCH  | `/:id/role`         | admin | Body: `{ "role": "user" \| "manager" \| "admin" }`                                  |
| GET    | `/`                 | admin | List users (supports query features)                                                |
| POST   | `/`                 | admin | Create a user                                                                       |
| PUT    | `/:id`              | admin | Update `firstName`, `lastName`, `phone`, `active`                                   |
| DELETE | `/:id`              | admin | Deactivate a user (soft delete)                                                     |

### Rooms — `/api/v1/rooms`

| Method | Path                                                                     | Auth           | Description                                               |
| ------ | ------------------------------------------------------------------------ | -------------- | --------------------------------------------------------- |
| GET    | `/`                                                                      | –              | List rooms (supports query features)                      |
| GET    | `/:id`                                                                   | –              | Get one room                                              |
| GET    | `/:id/check-availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`         | –              | `{ roomId, isAvailable }`                                 |
| GET    | `/check-available-rooms?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2` | –              | Rooms that are free for the dates and fit the guest count |
| POST   | `/`                                                                      | admin, manager | Create room (`multipart/form-data`)                       |
| PATCH  | `/:id`                                                                   | admin, manager | Update room (`multipart/form-data`)                       |
| DELETE | `/:id`                                                                   | admin, manager | Delete room                                               |

**Create/update room** is `multipart/form-data`:

| Field           | Type     | Notes                                                                                                              |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `roomNumber`    | string   | Required, unique                                                                                                   |
| `type`          | enum     | `single`, `double`, `suite`, `deluxe`                                                                              |
| `pricePerNight` | number   | Required, ≥ 0                                                                                                      |
| `capacity`      | integer  | Required, ≥ 1                                                                                                      |
| `status`        | enum     | `available` (default) or `maintenance`                                                                             |
| `description`   | string   | Optional                                                                                                           |
| `mainImage`     | file     | Required on create; images only, max 5 MB. Resized to 1920×1080 JPEG and uploaded to the Cloudinary `rooms` folder |
| `imageUrls`     | string[] | Optional list of extra image URLs                                                                                  |

A room is considered unavailable for a date range if it is in `maintenance`, or it has a `confirmed` booking overlapping the range, or a `pending` booking younger than 15 minutes overlapping the range.

### Bookings — `/api/v1/bookings` (all routes require login)

| Method | Path                    | Role                  | Description                                                               |
| ------ | ----------------------- | --------------------- | ------------------------------------------------------------------------- |
| GET    | `/`                     | admin, manager        | List all bookings (supports query features)                               |
| POST   | `/`                     | any                   | Create a pending booking                                                  |
| GET    | `/:id`                  | owner, manager, admin | Get a booking                                                             |
| PATCH  | `/:id/cancel`           | owner, manager, admin | Cancel a booking                                                          |
| POST   | `/:id/checkout-session` | owner                 | Create a Stripe Checkout session, returns `{ session: "<checkout url>" }` |

**Create booking body**

```json
{
  "roomId": "<room uuid>",
  "checkIn": "2026-11-01",
  "checkOut": "2026-11-04",
  "guestsCount": 2
}
```

`totalPrice` is always computed on the server: `nights × room.pricePerNight`. Any `userId` or `totalPrice` sent by the client is ignored.

Possible errors: `400` (past date, bad range, over capacity, room under maintenance), `404` (room not found), `409` (dates already booked, or you already have a pending booking).

### Stripe Webhook

| Method | Path                | Description                                                                               |
| ------ | ------------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/webhook-checkout` | Receives Stripe events. Not under `/api/v1`. Uses the raw body for signature verification |

Handled events:

- `checkout.session.completed` – if `payment_status` is `paid`, the booking becomes `confirmed` with `isPaid`, `paidAt`, `sessionId`, `paymentIntentId`.
- `charge.refunded` – the booking is marked `isRefunded` + `cancelled`.

## Booking & Payment Flow

```
1. Client  → POST /bookings                      booking created as "pending" (holds the room for 15 min)
2. Client  → POST /bookings/:id/checkout-session  gets a Stripe Checkout URL, redirects the user
3. User pays on Stripe
4. Stripe  → POST /webhook-checkout               booking → "confirmed", isPaid = true
5. Stripe redirects the user to  https://ae-hotel.vercel.app/bookings/:id
```

- Pending bookings older than 15 minutes are cancelled the next time anyone creates a booking, and they no longer block availability checks.
- The Stripe amount is `totalPrice + totalPrice × TAX_PERCENT`, in USD.
- Overlaps are rejected at the database level by a trigger (see [Database & Migrations](#database--migrations)).

## Query Features (filter / sort / paginate)

List endpoints (`GET /rooms`, `/users`, `/bookings`) accept:

| Param           | Example                                         | Meaning                                       |
| --------------- | ----------------------------------------------- | --------------------------------------------- |
| field filters   | `?type=suite&status=available`                  | Equality filter                               |
| operators       | `?pricePerNight[gte]=50&pricePerNight[lte]=200` | `gte`, `gt`, `lte`, `lt`                      |
| `sort`          | `?sort=-pricePerNight,capacity`                 | `-` prefix = descending; default `-createdAt` |
| `fields`        | `?fields=roomNumber,type,pricePerNight`         | Select columns                                |
| `page`, `limit` | `?page=2&limit=10`                              | Pagination (default page 1, limit 50)         |

Response:

```json
{
  "results": 10,
  "paginationResult": {
    "currentPage": 2,
    "limit": 10,
    "resultsCount": 37,
    "pagesCount": 4
  },
  "data": []
}
```

## Response & Error Format

Success (most endpoints):

```json
{ "status": "success", "data": {} }
```

Errors:

```json
{ "status": "fail", "message": "Booking not found" }
```

Validation errors (HTTP 400):

```json
{
  "errors": [
    { "msg": "Invalid email address", "path": "email", "location": "body" }
  ]
}
```

In `development` mode, error responses also include `code` and `stack`.

## Code Style

ESLint (airbnb-base) and Prettier are configured.

```bash
npm run lint
```

## Deployment Notes

- Set all [environment variables](#environment-variables) on the host. Use `NODE_ENV=production` (`npm run start:prod`).
- The CORS allow-list and the Stripe `success_url` / `cancel_url` currently point to `https://ae-hotel.vercel.app`. Change them in `index.js` and `controllers/booking.controller.js` if your frontend lives elsewhere.
- Register the production webhook endpoint in the Stripe dashboard: `https://<your-api-host>/webhook-checkout`, events `checkout.session.completed` and `charge.refunded`.
- If the API runs behind a reverse proxy or platform router, configure Express `trust proxy` so the rate limiter sees real client IPs.
- Run the migration once after the first start (see [Database & Migrations](#database--migrations)).

## License

ISC
