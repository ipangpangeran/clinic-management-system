import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('deflow_token') || null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(15);
  
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
      fetchClinicSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Idle Timer Activity Listener
  useEffect(() => {
    if (!token || !user) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetActivity));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastActivityRef.current) / (1000 * 60);

      if (elapsedMinutes >= idleTimeoutMinutes) {
        clearInterval(checkInterval);
        logout();
        alert(`Sesi login Anda telah berakhir otomatis karena tidak ada aktivitas selama ${idleTimeoutMinutes} menit. Silakan login kembali.`);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, resetActivity));
      clearInterval(checkInterval);
    };
  }, [token, user, idleTimeoutMinutes]);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      setPermissions(res.data.permissions);
    } catch (err) {
      console.error('Session expired or invalid token');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicSettings = async () => {
    try {
      const res = await axios.get('/api/clinic-profile');
      if (res.data && res.data.idle_timeout_minutes) {
        setIdleTimeoutMinutes(res.data.idle_timeout_minutes);
      }
    } catch (err) {
      console.error('Error fetching idle timeout settings', err);
    }
  };

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token: authToken, user: userData, permissions: permData } = res.data;
    localStorage.setItem('deflow_token', authToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(userData);
    setPermissions(permData);
    lastActivityRef.current = Date.now();
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('deflow_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (moduleKey, action = 'can_read') => {
    if (!user) return false;
    if (user.role === 'Admin System' || user.role === 'Admin Klinik') return true;
    const perm = permissions.find(p => p.module_key === moduleKey);
    return perm ? Boolean(perm[action]) : false;
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout, hasPermission, idleTimeoutMinutes }}>
      {children}
    </AuthContext.Provider>
  );
};
