import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShieldCheck, 
  Coffee,
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
    { name: 'Inventory', path: '/inventory', icon: Package, permission: 'manage_inventory' },
    { name: 'Users', path: '/users', icon: Users, permission: 'manage_users' },
    { name: 'Roles', path: '/roles', icon: ShieldCheck, permission: 'manage_users' },
  ];

  return (
    <aside className="w-64 glass flex flex-col h-full border-r border-gray-200">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary-900 p-2 rounded-lg">
          <Coffee className="text-white w-6 h-6" />
        </div>
        <h1 className="font-bold text-xl text-gray-800 tracking-tight">Mopping's Cafe</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          hasPermission(item.permission) && (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                  ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20' 
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          )
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="p-4 bg-gray-50 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center font-bold text-primary-900">
              {user?.name?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
