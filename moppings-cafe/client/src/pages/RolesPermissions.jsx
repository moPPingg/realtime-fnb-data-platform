import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  Shield, 
  Key, 
  Check, 
  Info,
  Loader2,
  Save,
  Plus
} from 'lucide-react';

const RolesPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePerms, setRolePerms] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [roleRes, permRes] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(roleRes.data);
      setPermissions(permRes.data);
      if (roleRes.data.length > 0) {
        handleRoleSelect(roleRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch roles/perms', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    try {
      const { data } = await api.get(`/roles/${role.id}/permissions`);
      setRolePerms(data.map(p => p.id));
    } catch (err) {
      console.error('Failed to fetch role permissions', err);
    }
  };

  const togglePermission = (permId) => {
    setRolePerms(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissionIds: rolePerms
      });
      // Refresh local roles list to reflect new permission count
      fetchData();
      alert('Permissions updated successfully!');
    } catch (err) {
      alert('Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Roles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-gray-900">User Roles</h4>
          <button className="p-2 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-primary-900 shadow-sm transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleSelect(role)}
            className={`w-full text-left p-6 rounded-3xl border transition-all relative overflow-hidden group ${
              selectedRole?.id === role.id 
              ? 'bg-primary-900 border-primary-900 text-white shadow-xl shadow-primary-900/20' 
              : 'glass border-white/50 text-gray-600 hover:border-primary-200'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                  selectedRole?.id === role.id ? 'text-primary-200' : 'text-primary-600'
                }`}>
                  {role.permissions.length} Functions
                </p>
                <h5 className="font-bold text-lg leading-tight capitalize">{role.name}</h5>
              </div>
              <Shield className={`w-6 h-6 ${
                selectedRole?.id === role.id ? 'text-primary-300' : 'text-gray-200 group-hover:text-primary-200'
              }`} />
            </div>
            <p className={`mt-3 text-sm leading-relaxed ${
              selectedRole?.id === role.id ? 'text-primary-100' : 'text-gray-400'
            }`}>
              {role.description}
            </p>
          </button>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass rounded-3xl border border-white/50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary-50/20">
            <div>
              <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2 capitalize">
                <Key className="w-5 h-5 text-primary-600" />
                {selectedRole?.name} Permissions
              </h4>
              <p className="text-sm text-gray-500 mt-1">Assign system functions to this role.</p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedRole}
              className="bg-primary-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissions.map((perm) => (
              <div 
                key={perm.id}
                onClick={() => togglePermission(perm.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-start gap-4 ${
                  rolePerms.includes(perm.id)
                  ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/5'
                  : 'bg-white border-gray-100 hover:border-primary-100'
                }`}
              >
                <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                  rolePerms.includes(perm.id)
                  ? 'bg-primary-900 border-primary-900 text-white'
                  : 'border-gray-200 text-transparent group-hover:border-primary-300'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                
                <div>
                  <p className="font-bold text-gray-900">{perm.label}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{perm.key}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-gray-500 italic text-sm">
            <Info className="w-4 h-4" />
            Changes will take effect for users upon their next session refresh.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
