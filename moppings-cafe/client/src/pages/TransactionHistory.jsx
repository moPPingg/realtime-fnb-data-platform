import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const limit = 20;
  const socket = useSocket();

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        storeId: selectedStore !== 'all' ? selectedStore : undefined,
        type: selectedType !== 'all' ? selectedType : undefined
      };
      
      const [transRes, storeRes] = await Promise.all([
        api.get('/inventory/transactions', { params }),
        api.get('/stores')
      ]);
      
      setTransactions(transRes.data.data || transRes.data);
      setStores(storeRes.data);
      if (transRes.data.pagination) {
        setPagination(transRes.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, selectedStore, selectedType]);

  useEffect(() => {
    if (socket) {
      socket.on('transaction:created', (trans) => {
        setTransactions(prev => [trans, ...prev].slice(0, 50));
      });
      return () => socket.off('transaction:created');
    }
  }, [socket]);

  const filteredTransactions = transactions.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.product_name?.toLowerCase().includes(term) ||
      t.product?.toLowerCase().includes(term) ||
      t.type?.toLowerCase().includes(term)
    );
  });

  const TypeIcon = ({ type }) => {
    if (type === 'import') return <ArrowUpCircle className="w-5 h-5 text-green-600" />;
    if (type === 'sale') return <ArrowDownCircle className="w-5 h-5 text-red-600" />;
    return <Package className="w-5 h-5 text-gray-600" />;
  };

  const TypeBadge = ({ type }) => {
    const styles = {
      import: 'bg-green-50 text-green-700 border-green-100',
      sale: 'bg-red-50 text-red-700 border-red-100',
      adjustment: 'bg-gray-50 text-gray-700 border-gray-100'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[type] || styles.adjustment}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <History className="w-7 h-7" />
          Transaction History
        </h2>
      </div>

      <div className="glass p-6 rounded-3xl border border-white/50 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative group flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl text-sm transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedStore}
            onChange={(e) => { setSelectedStore(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-100 rounded-xl text-sm px-4 py-3 outline-none cursor-pointer"
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>

          <select 
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-100 rounded-xl text-sm px-4 py-3 outline-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="import">Imports</option>
            <option value="sale">Sales</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-3xl border border-white/50 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Store</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No transactions found</p>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((trans) => (
                <tr key={trans.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon type={trans.type} />
                      <TypeBadge type={trans.type} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900">{trans.product_name || trans.product}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{trans.store_name || trans.store}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${trans.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trans.change_amount > 0 ? '+' : ''}{trans.change_amount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(trans.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Page {pagination.pages > 0 ? page : 0} of {pagination.pages || 1}
        </p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="p-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;