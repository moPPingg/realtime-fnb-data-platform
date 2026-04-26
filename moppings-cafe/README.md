# Mopping's Cafe

A minimal but production-structured web application for cafe management with role-based access control and real-time inventory monitoring.

## 🚀 Features

- **RBAC**: Admin, Manager, and Staff roles with granular permissions.
- **Real-time Inventory**: Stock updates reflect instantly on all dashboards via WebSockets.
- **Admin Panel**: Manage users, roles, and system permissions dynamically.
- **Inventory Control**: Multi-store stock tracking with low-stock alerts.
- **Premium UI**: Clean, modern dashboard built with TailwindCSS and Recharts.

## 🛠 Tech Stack

- **Frontend**: React + Vite + TailwindCSS + Recharts
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL
- **Auth**: JWT + bcryptjs

---

## 🛠 Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or use Docker)

### 1. Database Setup
If using local Postgres:
1. Create a database named `moppings_cafe`.
2. Run `server/schema.sql` to initialize tables.

### 2. Backend Setup
```bash
cd server
cp .env.example .env  # Update DATABASE_URL
npm install
npm run seed          # Populate initial roles, users, and products
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 4. Default Accounts
- **Admin**: `admin@moppings.cafe` / `admin123`
- **Manager**: `manager@moppings.cafe` / `manager123`
- **Staff**: `staff@moppings.cafe` / `staff123`

---

## 🐳 Docker Setup
Run everything with a single command:
```bash
docker-compose up --build
```
The app will be available at `http://localhost:5173`.
