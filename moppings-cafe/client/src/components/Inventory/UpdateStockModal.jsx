import React, { useState } from 'react';
import api from '../../api/axios';
import { X, Loader2, Save } from 'lucide-react';

const UpdateStockModal = ({ item, onClose }) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [lowStock, setLowStock] = useState(item.low_stock);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await api.put(`/inventory/${item.id}`, {
        quantity: parseInt(quantity),
        low_stock: parseInt(lowStock)
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative glass w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Update Stock</h3>
            <p className="text-sm text-gray-500">{item.product} ({item.store})</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Current Quantity ({item.unit})</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              required
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all shadow-sm font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Low Stock Threshold</label>
            <input
              type="number"
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              min="0"
              required
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all shadow-sm"
            />
            <p className="mt-2 text-xs text-gray-400 px-1">We'll alert you when stock falls below this level.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary-900 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateStockModal;
