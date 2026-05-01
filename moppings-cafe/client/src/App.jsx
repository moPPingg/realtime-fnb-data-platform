import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/Toast';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import RolesPermissions from './pages/RolesPermissions';
import TransactionHistory from './pages/TransactionHistory';

import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

const ProtectedRoute = ({ children, permission }) => {
  const { user, hasPermission, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" />;
  
  return children;
};

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute permission="view_dashboard">
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute permission="manage_inventory">
                <Layout><Inventory /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute permission="manage_users">
                <Layout><Users /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/roles" element={
              <ProtectedRoute permission="manage_users">
                <Layout><RolesPermissions /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/transactions" element={
              <ProtectedRoute permission="view_dashboard">
                <Layout><TransactionHistory /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
