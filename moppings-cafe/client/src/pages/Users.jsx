import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import UserModal from '../components/Users/UserModal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchData = async () => {
    try {
      const [userRes, roleRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles')
      ]);
      setUsers(userRes.data);
      setRoles(roleRes.data);
    } catch (err) {
      console.error('Failed to fetch user data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:w-96">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none rounded-2xl text-sm transition-all shadow-sm"
          />
        </div>

        <button 
          onClick={handleCreate}
          className="bg-primary-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Create User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="glass p-6 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(user)}
                  className="p-2 bg-white rounded-xl text-gray-400 hover:text-primary-900 shadow-sm border border-gray-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(user.id)}
                  className="p-2 bg-white rounded-xl text-gray-400 hover:text-red-600 shadow-sm border border-gray-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-900">
                {user.name[0].toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900 leading-tight">{user.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium uppercase mt-1">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email}
              </div>
              <div className="flex items-center gap-3">
                {user.active ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 uppercase bg-green-50 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Account
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 uppercase bg-red-50 px-3 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" />
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-50 text-[10px] text-gray-400 font-medium">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          roles={roles} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default Users;
