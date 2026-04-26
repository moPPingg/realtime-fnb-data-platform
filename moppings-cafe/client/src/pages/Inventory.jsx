import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { 
  Search, 
  Filter, 
  Edit3, 
  ChevronRight, 
  ChevronLeft,
  Package,
  AlertCircle
} from 'lucide-react';
import UpdateStockModal from '../components/Inventory/UpdateStockModal';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const socket = useSocket();

  const fetchData = async () => {
    try {
      const [invRes, storeRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/stores')
      ]);
      setInventory(invRes.data);
      setStores(storeRes.data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('inventory:updated', (updatedRecord) => {
        setInventory(prev => prev.map(item => 
          item.id === updatedRecord.id ? { ...item, ...updatedRecord } : item
        ));
      });
      return () => socket.off('inventory:updated');
    }
  }, [socket]);

  const filteredInventory = inventory.filter(item => {
    const matchesStore = selectedStore === 'all' || item.store_id.toString() === selectedStore;
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStore && matchesSearch;
  });

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="glass p-6 rounded-3xl border border-white/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
          <div className="relative group w-full md:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600" />
            <input 
              type="text" 
              placeholder="Search products or categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl text-sm transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setSelectedStore('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedStore === 'all' 
                ? 'bg-white text-primary-900 shadow-sm border border-gray-100' 
                : 'text-gray-500 hover:text-primary-900'
              }`}
            >
              All Stores
            </button>
            {stores.map(store => (
              <button 
                key={store.id}
                onClick={() => setSelectedStore(store.id.toString())}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedStore === store.id.toString() 
                  ? 'bg-white text-primary-900 shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:text-primary-900'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>

        <button className="bg-primary-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
          <Package className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-3xl border border-white/50 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Store</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Level</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-900 font-bold text-xs">
                      {item.unit}
                    </div>
                    <span className="font-bold text-gray-900">{item.product}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-[11px] font-bold text-gray-600 uppercase">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600">{item.store}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{item.quantity}</span>
                    <span className="text-gray-400 text-xs">/ {item.low_stock} {item.unit}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {item.quantity <= item.low_stock ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                      Healthy
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 rounded-xl hover:bg-primary-100 text-gray-400 hover:text-primary-900 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredInventory.length === 0 && (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No items found matching your filters.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <UpdateStockModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Inventory;
