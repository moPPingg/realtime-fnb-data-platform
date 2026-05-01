# Mopping's Cafe — Frontend Client

A clean, modern React dashboard for cafe management.

## 🚀 Features
- **Dashboard**: Real-time inventory metrics and charts.
- **Inventory Management**: Update stock levels across multiple stores.
- **Admin Panel**: Manage users, roles, and dynamic permissions.
- **Role-Based UI**: Navigation and actions adjust based on user role (Admin, Manager, Staff).

## 🛠 Tech Stack
- **React + Vite**
- **TailwindCSS** for styling.
- **Recharts** for data visualization.
- **Socket.io-client** for real-time updates.
- **Axios** for API requests.

## 🛠 Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (optional, defaults to `http://localhost:4000`):
   ```env
   VITE_API_URL=http://localhost:4000
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🐳 Docker
When running via Docker Compose in the root, the client is available at `http://localhost:5173`.
