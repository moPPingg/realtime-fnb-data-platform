# Mopping's Cafe

A production-ready multi-store cafe management system with role-based access control, real-time inventory monitoring, and analytics dashboard.

## Features

- **RBAC System**: Admin, Manager, and Staff roles with granular permissions
- **Dynamic Permissions**: view_dashboard, manage_inventory, manage_users, manage_roles
- **Real-time Updates**: Socket.io powered inventory changes
- **Multi-store Support**: Track inventory across 10 store locations
- **Analytics Dashboard**: KPIs, trends, low stock alerts
- **Audit Logging**: Track all changes with detailed audit logs
- **Transaction History**: Complete log of all inventory movements

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) + TailwindCSS + Recharts |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL (Supabase or Local) |
| Auth | JWT + bcryptjs |

## Project Structure

```
moppings-cafe/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # Axios configuration
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React contexts (Auth, Socket, Toast)
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app with routes
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation, RBAC
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── db.js          # Database connection
│   │   ├── index.js       # Server entry point
│   │   └── schema.sql     # Database schema
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker setup
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Supabase)
- npm or yarn

### 1. Clone & Setup

```bash
git clone <repo-url>
cd moppings-cafe
```

### 2. Backend Setup

```bash
cd server

# Copy environment file
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL=postgresql://postgres:password@host:5432/moppings_cafe
# JWT_SECRET=your-secure-secret-key

# Install dependencies
npm install

# Initialize database (creates tables)
npm run db:init

# Seed with sample data (optional - recommended)
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@moppings.cafe | admin123 |
| Manager | central@moppings.cafe | manager123 |
| Staff | staff1@moppings.cafe | staff123 |

## Docker Setup (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Seed the database (first time only)
docker exec -it moppings_server npm run seed

# Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:4000
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user info

### Inventory
- `GET /inventory` - List inventory (filtered by store)
- `GET /inventory/low-stock` - Get low stock items
- `PUT /inventory/:id` - Update stock level
- `POST /inventory` - Add inventory item

### Transactions
- `GET /inventory/transactions` - List transactions
- `POST /inventory/transactions` - Create transaction

### Analytics
- `GET /analytics/kpi` - Dashboard KPIs
- `GET /analytics/top-selling` - Top selling products
- `GET /analytics/low-stock` - Low stock items
- `GET /analytics/sales-trend` - Sales over time

### Management (requires permissions)
- `/users` - User CRUD
- `/roles` - Role & permission management
- `/stores` - Store management
- `/products` - Product management

## Permissions

| Permission | Description |
|------------|-------------|
| view_dashboard | Access to dashboard and analytics |
| manage_inventory | Add/edit inventory and transactions |
| manage_users | Create/edit/delete users |
| manage_roles | Configure roles and permissions |

## Role Permissions

| Role | view_dashboard | manage_inventory | manage_users | manage_roles |
|------|----------------|------------------|--------------|--------------|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | - | - |
| Staff | ✓ | - | - | - |

## Security Features

- JWT authentication with 8-hour expiry
- bcrypt password hashing (10 rounds)
- Rate limiting on login (20 attempts/15min)
- Input validation and sanitization
- Socket.io authentication
- Store-specific access control (managers limited to their store)

## Database Schema

See `server/src/schema.sql` for complete schema including:
- roles, permissions, role_permissions
- users, stores, products
- inventory, inventory_transactions
- audit_logs

## License

MIT