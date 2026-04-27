import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import {
  GOOGLE_CLIENT_ID, ALLOWED_DOMAIN, AUTH_STORAGE_KEY, DRIVE_READONLY_SCOPE,
  DEFAULT_ROLE, LS_ACCESS_TOKEN, ADMIN_EMAILS,
} from '../config/constants';
import { fetchUserRole } from '../api/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState(DEFAULT_ROLE);
  const tokenClientRef = useRef(null);

  const initializeGIS = () => {
    if (!GOOGLE_CLIENT_ID) { setIsLoading(false); return; }
    if (!window.google?.accounts?.id) { console.warn('[Auth] GIS not loaded'); return; }
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: true,
      cancel_on_tap_outside: false,
    });
  };

  const initializeTokenClient = () => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.oauth2) return;
    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_READONLY_SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem(LS_ACCESS_TOKEN, tokenResponse.access_token);
        }
      },
    });
  };

  const handleCredentialResponse = (response) => {
    if (!response.credential) { console.warn('[Auth] No credential'); return; }
    try {
      const parts = response.credential.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');
      const payload = JSON.parse(atob(parts[1]));
      const { email, name, picture, hd } = payload;
      if (hd && hd !== ALLOWED_DOMAIN) {
        console.warn(`[Auth] Domain mismatch: got "${hd}", expected "${ALLOWED_DOMAIN}"`);
      }
      setAuthUser({ email, name, picture });
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email, name, picture }));
      if (tokenClientRef.current) tokenClientRef.current.requestAccessToken({ hint: email });
    } catch (err) {
      console.error('[Auth] JWT decode failed:', err);
    }
  };

  const renderSignInButton = (elementRef) => {
    if (!GOOGLE_CLIENT_ID || !elementRef?.current || !window.google?.accounts?.id) return;
    google.accounts.id.renderButton(elementRef.current, {
      type: 'standard', size: 'large', text: 'signin_with', theme: 'outline', locale: 'zh_TW',
    });
  };

  const refreshToken = () => {
    return new Promise((resolve, reject) => {
      if (!tokenClientRef.current) { reject(new Error('Token client not ready')); return; }
      const originalCallback = tokenClientRef.current.callback;
      tokenClientRef.current.callback = (tokenResponse) => {
        if (tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem(LS_ACCESS_TOKEN, tokenResponse.access_token);
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('No access_token'));
        }
        tokenClientRef.current.callback = originalCallback;
      };
      tokenClientRef.current.requestAccessToken();
    });
  };

  const logout = () => {
    setAuthUser(null);
    setAccessToken(null);
    setRole(DEFAULT_ROLE);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LS_ACCESS_TOKEN);
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) { setIsLoading(false); return; }
    const waitForGIS = () => {
      if (window.google?.accounts?.id) {
        initializeGIS();
        initializeTokenClient();
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          try {
            setAuthUser(JSON.parse(stored));
          } catch (err) {
            console.warn('[Auth] Restore failed:', err);
          }
        }
        const storedToken = localStorage.getItem(LS_ACCESS_TOKEN);
        if (storedToken) setAccessToken(storedToken);
        setIsLoading(false);
      } else {
        setTimeout(waitForGIS, 100);
      }
    };
    waitForGIS();
  }, []);

  // 解析使用者角色：先用 ADMIN_EMAILS 白名單，再 fallback 到 PERM_SHEET_ID 查表
  useEffect(() => {
    if (!authUser?.email) {
      setRole(DEFAULT_ROLE);
      return;
    }
    const email = authUser.email.toLowerCase();
    if (ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
      setRole('admin');
      return;
    }
    if (!accessToken) return;
    fetchUserRole(email, accessToken)
      .then((r) => setRole(r))
      .catch(() => setRole(DEFAULT_ROLE));
  }, [authUser, accessToken]);

  // 已有 authUser 但 accessToken 缺失（從 localStorage 恢復 / token 過期）→ silent 補抓一次
  useEffect(() => {
    if (!authUser?.email || accessToken || !tokenClientRef.current) return;
    try {
      tokenClientRef.current.requestAccessToken({ prompt: '', hint: authUser.email });
    } catch (err) {
      console.warn('[Auth] silent token request failed:', err);
    }
  }, [authUser, accessToken]);

  /** 顯式觸發 Drive 授權（user gesture 內呼叫） */
  const requestDriveAccess = () => {
    if (!tokenClientRef.current) return;
    try {
      tokenClientRef.current.requestAccessToken({ hint: authUser?.email });
    } catch (err) {
      console.warn('[Auth] requestDriveAccess failed:', err);
    }
  };

  const value = { authUser, isAuthenticated: !!authUser, isLoading, accessToken, role, renderSignInButton, logout, refreshToken, requestDriveAccess };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
