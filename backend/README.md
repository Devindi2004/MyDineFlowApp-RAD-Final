# DineFlow Backend

Express.js + TypeScript + MongoDB + Socket.IO backend for the DineFlow restaurant ordering and management system.

## Tech Stack

- Node.js, Express.js, TypeScript
- MongoDB + Mongoose
- JWT authentication with role-based access control
- bcrypt password hashing
- Socket.IO realtime order updates
- PayHere test payloads and mock payment mode
- Gemini/OpenAI recommendation placeholder with rule-based fallback

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

API URL: `http://localhost:5000/api/v1`

## Main Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /menu`
- `POST /orders`
- `GET /orders/my`
- `POST /payments`
- `POST /reviews`
- `POST /reservations`
- `GET /waiter/orders`
- `PATCH /waiter/orders/:id/served`
- `PATCH /waiter/tables/:id/status`
- `GET /kitchen/orders`
- `PATCH /kitchen/orders/:id/status`
- `GET /admin/analytics`
- `CRUD /admin/users`
- `CRUD /admin/menu`
- `CRUD /admin/tables`
- `CRUD /admin/orders`
- `GET /admin/payments`
- `CRUD /admin/reviews`
- `CRUD /admin/reservations`
- `CRUD /admin/inventory`
- `POST /ai/recommendations`

## Demo Credentials

- Admin: `admin@example.com` / `Admin@123`
- Waiter: `waiter@example.com` / `Waiter@123`
- Chef: `chef@example.com` / `Chef@123`
- Customer: `customer@example.com` / `Customer@123`

## Socket.IO Events

- `order:new`
- `order:accepted`
- `order:preparing`
- `order:ready`
- `order:served`
- `waiter:alert`
- `kitchen:alert`
- `payment:updated`

The server also emits `order:update`, `payment-updated`, and `kitchen:ping` for the frontend dashboards.
