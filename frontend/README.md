# DineFlow Frontend

React + Vite frontend for the DineFlow restaurant ordering and management system.

## Stack

- React, Vite, React Router
- Tailwind CSS
- Axios
- Socket.io-client
- lucide-react icons
- Recharts analytics

## Setup

```bash
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

Copy `.env.example` to `.env.local` when you need custom URLs:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

## Main Routes

- `/` landing page
- `/menu/:tableId` QR table menu
- `/login`, `/register`
- `/customer`, `/customer/menu`, `/customer/cart`, `/customer/checkout`, `/customer/tracking`
- `/waiter`, `/waiter/tables`, `/waiter/manual-order`
- `/kitchen`, `/kitchen/inventory`
- `/admin`, `/admin/users`, `/admin/menu`, `/admin/tables`, `/admin/orders`, `/admin/payments`, `/admin/reviews`, `/admin/reservations`, `/admin/inventory`, `/admin/reports`

## Demo Logins

- `admin@example.com` / `Admin@123`
- `waiter@example.com` / `Waiter@123`
- `chef@example.com` / `Chef@123`
- `customer@example.com` / `Customer@123`
