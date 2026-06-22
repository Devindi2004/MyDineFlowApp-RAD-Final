# DineFlow - Smart Restaurant Ordering and Management Platform

DineFlow is a full-stack restaurant ordering and operations system built with the MERN stack. It supports customer QR ordering, waiter and kitchen workflows, admin management, staff payroll, payments, reviews, realtime order updates, and a Google Vertex AI powered restaurant assistant that answers using live menu and order data.

## Project Summary

This project was developed as a Rapid Application Development style full-stack web application. The system follows a client-server architecture with a React frontend, Node.js and Express backend, MongoDB database, JWT authentication, Mongoose data models, and responsive UI design.

The application is designed around a real restaurant workflow:

- Customers scan a table QR, browse the menu, add items to cart, checkout, track orders, review service, and ask the AI assistant for menu help.
- Waiters manage active orders, table service, staff attendance, and manual order placement.
- Kitchen staff receive live order updates, update preparation status, and monitor stock.
- Admins manage menu items, users, staff payroll, tables, reservations, payments, analytics, reviews, and inventory.

## Coursework Requirement Mapping

| Requirement | DineFlow Implementation |
| --- | --- |
| MERN full-stack application | MongoDB, Express.js, React, Node.js |
| TypeScript usage | Backend is TypeScript; shared frontend types and many frontend modules use TypeScript/TSX patterns |
| Client-server architecture | REST API and Socket.IO backend consumed by React client |
| MongoDB data modelling | Mongoose models for users, restaurants, menu, orders, tables, payments, payroll, inventory, reservations, loyalty, reviews, and notifications |
| Authentication and security | JWT access/refresh tokens, bcrypt password hashing, role-based access control, protected API routes |
| Responsive UI | Mobile-friendly customer ordering, waiter dashboard, kitchen board, and admin panels |
| RAD principles | Modular feature delivery across customer, waiter, kitchen, admin, payroll, payments, and AI assistance |
| Version control | Git/GitHub ready project structure with ignored secrets, generated files, logs, and dependencies |
| Cloud/AI integration | Google Vertex AI Agent Engine endpoint connected through backend with live database context |

## Tech Stack

**Frontend**

- React 18
- Vite
- React Router
- Axios
- Socket.IO Client
- Recharts
- Lucide React icons
- TailwindCSS/PostCSS styling support

**Backend**

- Node.js
- Express.js
- TypeScript
- MongoDB with Mongoose
- Socket.IO
- JWT and bcryptjs
- Google Auth Library
- PayHere payment integration support
- Meta WhatsApp Cloud API support

**AI and Cloud**

- Google Vertex AI Agent Engine / Reasoning Engine
- Live MongoDB menu and order context injected into chatbot prompts
- Local fallback recommendation logic for graceful degradation

## Main Features

### Customer Experience

- QR/table-based restaurant entry
- Menu browsing and category filtering
- Cart and checkout flow
- PayHere-ready payment configuration
- Live order tracking
- Reviews and loyalty points
- AI food assistant connected to live menu data

### AI Restaurant Assistant

The assistant is integrated through the backend so API keys and Google credentials are never exposed to the browser.

It can answer questions such as:

- "Recommend Sri Lankan dishes from our menu"
- "Show me drinks"
- "What desserts are available?"
- "What is my order status?"

The backend sends live menu and recent order context to the deployed Vertex AI Agent Engine. If the cloud agent is unavailable, DineFlow falls back to database-matched recommendations instead of returning a blank response.

### Waiter Dashboard

- Active order overview
- Table-focused workflow
- Manual ordering
- Order ready notifications
- Staff attendance tools

### Kitchen Dashboard

- Realtime incoming orders
- Status updates from pending to preparing and ready
- Special instructions visibility
- Inventory and low-stock awareness

### Admin Dashboard

- Analytics overview
- User and staff management
- Menu and inventory management
- Table and QR management
- Orders, payments, reservations, reviews
- Payroll and attendance management
- WhatsApp payslip support

## Repository Structure

```text
MyDineFlowApp/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── public/
│   ├── types/
│   └── package.json
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- Optional: Google Cloud credentials for Vertex AI Agent Engine

### 1. Clone the Repository

```bash
git clone https://github.com/Devindi2004/MyDineFlowApp.git
cd MyDineFlowApp
```

### 2. Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run seed:demo
npm run dev
```

Backend API:

```text
http://localhost:5000/api/v1
```

Health check:

```text
http://localhost:5000/health
```

### 3. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend app:

```text
http://localhost:3000
```

If Vite chooses another port, use the URL printed in the terminal.

## Environment Configuration

Create `backend/.env` from `backend/.env.example`.

Important values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/dineflow
JWT_SECRET=change_this_secret_before_production
JWT_REFRESH_SECRET=change_this_refresh_secret_before_production
CLIENT_URL=http://localhost:3000
CLIENT_URLS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
```

### Vertex AI Assistant

The current backend supports a deployed Google Vertex AI Agent Engine endpoint:

```env
GOOGLE_CLOUD_PROJECT=parking-system-489607
VERTEX_AI_REASONING_ENGINE_URL=https://us-west1-aiplatform.googleapis.com/v1/projects/parking-system-489607/locations/us-west1/reasoningEngines/295029756057878528:query
VERTEX_AI_REASONING_ENGINE=projects/parking-system-489607/locations/us-west1/reasoningEngines/295029756057878528
VERTEX_AI_LOCATION=us-west1
VERTEX_AI_USE_STREAM_QUERY=true
VERTEX_AI_SEND_CONTEXT_IN_MESSAGE=true
GOOGLE_APPLICATION_CREDENTIALS=
```

For local Google authentication:

```bash
gcloud auth application-default login
gcloud config set project parking-system-489607
```

For production, use a service account with permission to invoke the Vertex AI Agent Engine.

### PayHere Payments

```env
PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
PAYHERE_SANDBOX=true
API_PUBLIC_URL=https://your-public-backend-url
```

`API_PUBLIC_URL` must be reachable by PayHere for payment callbacks.

### WhatsApp Payslips

```env
WHATSAPP_GRAPH_VERSION=v20.0
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_DEFAULT_COUNTRY_CODE=94
```

If WhatsApp credentials are not configured, payroll records still work and payslips can be resent later.

## Demo Logins

After running:

```bash
npm run seed:demo
```

Use these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin@123` |
| Waiter | `waiter@example.com` | `Waiter@123` |
| Chef | `chef@example.com` | `Chef@123` |
| Customer | `customer@example.com` | `Customer@123` |

## Useful Scripts

### Backend

```bash
npm run dev       # Start backend with ts-node-dev
npm run build     # Compile TypeScript
npm run start     # Run compiled backend
npm run seed      # Full seed, resets data
npm run seed:demo # Non-destructive demo data upsert
```

### Frontend

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

## API Modules

The backend exposes REST routes under:

```text
/api/v1
```

Main route groups:

- `/auth`
- `/menu`
- `/orders`
- `/reservations`
- `/reviews`
- `/tables`
- `/inventory`
- `/analytics`
- `/payments`
- `/ai`
- `/users`
- `/waiter`
- `/kitchen`
- `/admin/*`
- `/staff/attendance`

## Security Notes

- `.env` files are ignored and must not be committed.
- Passwords are hashed with bcrypt.
- Access is controlled with JWT and role-based middleware.
- Google and payment credentials should be rotated before production use if they were ever shared.
- Generated folders such as `node_modules`, `dist`, logs, `.claude`, `.codex-logs`, and local MongoDB data are ignored.

## Validation

Recent checks:

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both backend TypeScript compilation and frontend production build pass.

## Future Improvements

- Complete migration of the primary frontend entry file from JSX to TSX for stricter TypeScript compliance.
- Add automated API tests and frontend component tests.
- Add production Docker files and deployment pipeline.
- Add richer analytics reports and export options.
- Add more advanced AI tool calling for reservations and live order modification.

## Author

Developed by Devindi as a full-stack MERN restaurant management final project.
