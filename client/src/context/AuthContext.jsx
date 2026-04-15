import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(() => localStorage.getItem('yc_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('yc_username'));

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('yc_token',    res.data.token);
    localStorage.setItem('yc_username', res.data.username);
    setToken(res.data.token);
    setUsername(res.data.username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('yc_token');
    localStorage.removeItem('yc_username');
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
