import { createContext, useState, useEffect, useCallback } from 'react';
import {
  GOOGLE_CLIENT_ID,
  ALLOWED_DOMAIN,
  AUTH_STORAGE_KEY,
  PERM_CACHE_KEY,
  DEFAULT_ROLE,
  ROLE_TABS,
} from '../shared/constants';
import { fetchUserRole } from '../api/permissions';

export const AuthContext = createContext(null);

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(
    decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  );
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [userRole, setUserRole] = useState(DEFAULT_ROLE);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!authUser;
  const allowedTabs = ROLE_TABS[userRole] || ROLE_TABS[DEFAULT_ROLE];

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PERM_CACHE_KEY);
    setAuthUser(null);
    setUserRole(DEFAULT_ROLE);
  }, []);

  const login = useCallback(async (credential) => {
    setIsLoading(true);
    try {
      const payload = parseJwt(credential);
      const email = payload.email || '';
      const domain = email.split('@')[1];

      if (domain !== ALLOWED_DOMAIN) {
        throw new Error(`僅限 @${ALLOWED_DOMAIN} 帳號登入`);
      }

      const user = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        exp: payload.exp,
        token: credential,
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setAuthUser(user);

      let role = DEFAULT_ROLE;
      try {
        role = await fetchUserRole(email);
      } catch {
        role = DEFAULT_ROLE;
      }

      setUserRole(role);
      localStorage.setItem(PERM_CACHE_KEY, role);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: restore session from localStorage
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;

        const user = JSON.parse(stored);
        if (!user.exp || user.exp <= Date.now() / 1000) {
          // Token expired — clean up
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(PERM_CACHE_KEY);
          return;
        }

        setAuthUser(user);

        // Try cached role first, otherwise re-fetch
        const cachedRole = localStorage.getItem(PERM_CACHE_KEY);
        if (cachedRole) {
          setUserRole(cachedRole);
        } else {
          let role = DEFAULT_ROLE;
          try {
            role = await fetchUserRole(user.email);
          } catch {
            role = DEFAULT_ROLE;
          }
          setUserRole(role);
          localStorage.setItem(PERM_CACHE_KEY, role);
        }
      } catch {
        // Corrupted storage — clear everything
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(PERM_CACHE_KEY);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const value = {
    authUser,
    userRole,
    isAuthenticated,
    isLoading,
    allowedTabs,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
