import React, { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../shared/constants';
import { useAuth } from './useAuth';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    const initGoogleSignIn = () => {
      if (typeof google === 'undefined' || !google.accounts) {
        // 等 Google 腳本載入
        setTimeout(initGoogleSignIn, 200);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            login(response.credential);
          }
        },
        auto_select: true,
      });
      if (buttonRef.current) {
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
        });
      }
    };
    initGoogleSignIn();
  }, [login]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Fandora</h1>
        <h2 style={styles.subtitle}>人工時管理系統</h2>

        <div style={{ marginTop: 32, minHeight: 60 }}>
          {isLoading ? (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <span>正在確認權限...</span>
            </div>
          ) : (
            <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.hint}>僅限 @fandora.co 帳號登入</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: 24,
  },
  card: {
    background: '#ffffff',
    maxWidth: 420,
    width: '100%',
    borderRadius: 16,
    padding: 48,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#00BCD4',
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 400,
    color: '#666',
    margin: '8px 0 0',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#666',
    fontSize: 14,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid #e0e0e0',
    borderTop: '2px solid #00BCD4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#e53935',
    fontSize: 14,
    marginTop: 16,
  },
  hint: {
    color: '#999',
    fontSize: 12,
    marginTop: 24,
  },
};
