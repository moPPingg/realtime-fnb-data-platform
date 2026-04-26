import React, { useState } from 'react';
import api from '../../api/axios';
import { X, Loader2, User, Mail, Lock, Shield, Power } from 'lucide-react';

const UserModal = ({ user, roles, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role_id: user?.role_id || '',
    active: user ? user.active : true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (user) {
        await api.put(`/users/${user.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative glass w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary-50/30">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user ? 'Edit User' : 'Create New User'}</h3>
            <p className="text-sm text-gray-500">Configure user credentials and access levels.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white text-gray-400 transition-colors shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
              <div className="relative group">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Password {user && '(leave blank to keep)'}</label>
              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required={!user}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Role</label>
              <div className="relative group">
                <Shield className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl transition-all appearance-none"
                >
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${formData.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Power className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Account Status</p>
                <p className="text-xs text-gray-500">{formData.active ? 'User can login' : 'Access disabled'}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.active} 
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-900"></div>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4">
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
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
