import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AlertTriangle, Package, Store, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, lowStockCount: 0, storeCount: 0 });
  const socket = useSocket();

  const fetchData = async () => {
    try {
      const [invRes, storeRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/stores')
      ]);
      setInventory(invRes.data);
      setStores(storeRes.data);
      calculateStats(invRes.data, storeRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  const calculateStats = (inv, str) => {
    setStats({
      totalItems: inv.length,
      lowStockCount: inv.filter(i => i.quantity <= i.low_stock).length,
      storeCount: str.length
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('inventory:updated', (updatedRecord) => {
        setInventory(prev => {
          const next = prev.map(item => item.id === updatedRecord.id ? { ...item, ...updatedRecord } : item);
          calculateStats(next, stores);
          return next;
        });
      });
      return () => socket.off('inventory:updated');
    }
  }, [socket, stores]);

  const chartData = inventory.slice(0, 8).map(i => ({
    name: i.product,
    quantity: i.quantity,
    low_stock: i.low_stock
  }));

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass p-6 rounded-3xl border border-white/50 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Inventory Items" 
          value={stats.totalItems} 
          icon={Package} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          color="bg-red-100 text-red-600" 
        />
        <StatCard 
          title="Active Stores" 
          value={stats.storeCount} 
          icon={Store} 
          color="bg-green-100 text-green-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl shadow-sm border border-white/50">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Stock Overview
            </h4>
            <select className="bg-gray-50 border-none rounded-xl text-sm px-4 py-2 outline-none cursor-pointer">
              <option>Top 8 Items</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.quantity <= entry.low_stock ? '#ef4444' : '#43302b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock List */}
        <div className="glass p-8 rounded-3xl shadow-sm border border-white/50">
          <h4 className="text-xl font-bold text-gray-900 mb-6">Critical Alerts</h4>
          <div className="space-y-4">
            {inventory.filter(i => i.quantity <= i.low_stock).slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-100">
                <div className="w-10 h-10 rounded-xl bg-red-200 flex items-center justify-center text-red-700 font-bold">
                  !
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-red-900">{item.product}</p>
                  <p className="text-xs text-red-700">{item.store}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-900">{item.quantity} {item.unit}</p>
                  <p className="text-[10px] text-red-600 uppercase tracking-wider font-semibold">Low Stock</p>
                </div>
              </div>
            ))}
            {stats.lowStockCount === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">All stock levels healthy.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
