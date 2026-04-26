import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('moppings_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('moppings_token');
      if (token && !user) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.user);
          localStorage.setItem('moppings_user', JSON.stringify(data.user));
        } catch (err) {
          localStorage.removeItem('moppings_token');
          localStorage.removeItem('moppings_user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [user]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('moppings_token', data.token);
    localStorage.setItem('moppings_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('moppings_token');
    localStorage.removeItem('moppings_user');
    setUser(null);
  };

  const hasPermission = (perm) => {
    // Note: User object from login includes basic role/info.
    // For specific permissions, we check against what's loaded or role-based logic.
    // Admin has everything.
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // For others, if we want dynamic permissions from server:
    // We could store permissions in the user object or fetch them.
    // Given the backend loads them into req.user, the client can also store them.
    return user.permissions?.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
