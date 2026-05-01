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
  Cell,
  LineChart,
  Line
} from 'recharts';
import { AlertTriangle, Package, Store, TrendingUp, ShoppingCart, ArrowUp, ArrowDown } from 'lucide-react';

const Dashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [trendData, setTrendData] = useState({ sales: [], imports: [] });
  const [selectedStore, setSelectedStore] = useState('all');
  const socket = useSocket();

  const fetchData = async () => {
    try {
      const storeId = selectedStore !== 'all' ? selectedStore : undefined;
      const [kpiRes, trendRes, invRes, storeRes] = await Promise.all([
        api.get('/analytics/kpi', { params: { storeId } }),
        api.get('/analytics/sales-trend', { params: { storeId, days: 14 } }),
        api.get('/inventory', { params: { storeId } }),
        api.get('/stores')
      ]);
      setKpi(kpiRes.data);
      setTrendData(trendRes.data);
      setInventory(invRes.data);
      setStores(storeRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  useEffect(() => {
    if (socket) {
      socket.on('inventory:updated', (updatedRecord) => {
        setInventory(prev => prev.map(item => 
          item.id === updatedRecord.id ? { ...item, ...updatedRecord } : item
        ));
        fetchData();
      });
      return () => socket.off('inventory:updated');
    }
  }, [socket]);

  const chartData = inventory.slice(0, 8).map(i => ({
    name: i.product?.substring(0, 15) || 'Unknown',
    quantity: i.quantity,
    low_stock: i.low_stock
  }));

  const trendChartData = trendData.sales.map((s, i) => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: s.total_sales,
    imports: trendData.imports[i]?.total_imports || 0
  }));

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="glass p-6 rounded-3xl border border-white/50 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value ?? 0}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex items-center gap-2">
          <select 
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Stock" 
          value={kpi?.total_stock || 0} 
          icon={Package} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={kpi?.low_stock_count || 0} 
          icon={AlertTriangle} 
          color="bg-red-100 text-red-600" 
          subtitle={kpi?.low_stock_count > 0 ? "Items need attention" : "All healthy"}
        />
        <StatCard 
          title="Active Stores" 
          value={kpi?.store_count || 0} 
          icon={Store} 
          color="bg-green-100 text-green-600" 
        />
        <StatCard 
          title="Daily Sales" 
          value={kpi?.daily_sales || 0} 
          icon={ShoppingCart} 
          color="bg-purple-100 text-purple-600" 
          subtitle="Transactions today"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl shadow-sm border border-white/50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Stock Overview
            </h4>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
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
            {(!inventory.filter(i => i.quantity <= i.low_stock).length) && (
              <div className="text-center py-12">
                <p className="text-gray-400">All stock levels healthy.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl shadow-sm border border-white/50">
        <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Sales & Import Trend (Last 14 Days)
        </h4>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="sales" stroke="#43302b" strokeWidth={2} dot={false} name="Sales" />
              <Line type="monotone" dataKey="imports" stroke="#22c55e" strokeWidth={2} dot={false} name="Imports" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-900"></div>
            <span className="text-sm text-gray-600">Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Imports</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
