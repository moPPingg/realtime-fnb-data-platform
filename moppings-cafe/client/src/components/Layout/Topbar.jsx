import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, Settings } from 'lucide-react';

const Topbar = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="h-20 glass border-b border-gray-200 flex items-center justify-between px-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
        <p className="text-sm text-gray-500">Welcome back to Mopping's management portal.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600" />
          <input 
            type="text" 
            placeholder="Search something..." 
            className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none rounded-xl text-sm transition-all w-64"
          />
        </div>
        
        <button className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <button className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
