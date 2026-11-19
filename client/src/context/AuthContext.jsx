import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('urbanfix_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('urbanfix_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('urbanfix_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          localStorage.setItem('urbanfix_user', JSON.stringify(res.data.data.user));
        } catch (err) {
          if (err.response?.status === 401) {
            console.warn('[AuthContext] Session expired or invalid token:', err.message);
            localStorage.removeItem('urbanfix_token');
            localStorage.removeItem('urbanfix_user');
            setUser(null);
            setToken(null);
          } else {
            console.warn('[AuthContext] Backend unreachable, retaining offline session:', err.message);
          }
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, []);

  const portalLogin = async (email, password, portal = 'citizen') => {
    let endpoint = '/auth/login';
    if (portal === 'admin') endpoint = '/auth/admin/login';
    else if (portal === 'staff' || portal === 'department') endpoint = '/auth/department/login';
    else if (portal === 'police') endpoint = '/auth/police/login';

    const res = await api.post(endpoint, { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('urbanfix_token', receivedToken);
    localStorage.setItem('urbanfix_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const login = async (email, password, portal = 'citizen') => {
    return portalLogin(email, password, portal);
  };

  const register = async (name, email, password, phone) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('urbanfix_token', receivedToken);
    localStorage.setItem('urbanfix_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };



  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('urbanfix_token');
      localStorage.removeItem('urbanfix_user');
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('urbanfix_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
