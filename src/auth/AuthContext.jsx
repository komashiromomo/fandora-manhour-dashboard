import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { GOOGLE_CLIENT_ID, ALLOWED_DOMAIN, AUTH_STORAGE_KEY, PERM_CACHE_KEY, DEFAULT_ROLE, ROLE_TABS, DEFAULT_API_KEY, LS_API_KEY } from '../shared/constants';
import { fetchUserRole } from '../api/permissions';

export const AuthContext = createContext(null);

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  ));
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [userRole, setUserRole] = useState(DEFAULT_ROLE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isAuthenticated = authUser !== null;
  const allowedTabs = useMemo(() => ROLE_TABS[userRole] || ROLE_TABS.member, [userRole]);

  const getApiKeyValue = useCallback(() => {
    return localStorage.getItem(LS_API_KEY) || DEFAULT_API_KEY;
  }, []);

  // 載入角色
  const loadRole = useCallback(async (email) => {
    try {
      // 先檢查快取
      const cached = localStorage.getItem(PERM_CACHE_KEY);
      if (cached) {
        setUserRole(cached);
        return;
      }
      const apiKey = getApiKeyValue();
      const role = await fetchUserRole(email, apiKey);
      setUserRole(role);
      localStorage.setItem(PERM_CACHE_KEY, role);
    } catch {
      setUserRole(DEFAULT_ROLE);
    }
  }, [getApiKeyValue]);

  // 登入
  const login = useCallback(async (credential) => {
    setError('');
    setIsLoading(true);
    try {
      const payload = parseJwt(credential);
      const email = payload.email || '';
      const domain = email.split('@')[1];

      if (domain !== ALLOWED_DOMAIN) {
        setError(`僅限 @${ALLOWED_DOMAIN} 帳號登入`);
        setIsLoading(false);
        return;
      }

      const user = {
        name: payload.name || email.split('@')[0],
        email,
        picture: payload.picture || '',
        exp: payload.exp,
      };

      setAuthUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      await loadRole(email);
    } catch (err) {
      setError('登入失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadRole]);

  // 登出
  const logout = useCallback(() => {
    setAuthUser(null);
    setUserRole(DEFAULT_ROLE);
    setError('');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PERM_CACHE_KEY);
  }, []);

  // 初始載入：檢查 localStorage
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored);
          // 檢查 JWT 是否過期
          if (user.exp && user.exp * 1000 > Date.now()) {
            setAuthUser(user);
            await loadRole(user.email);
          } else {
            // 過期，清除
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(PERM_CACHE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, [loadRole]);

  const value = {
    authUser,
    userRole,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    allowedTabs,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
