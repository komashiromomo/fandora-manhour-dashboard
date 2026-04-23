import React, { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../shared/constants';
import { useAuth } from './useAuth';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    const initGoogleSignIn = () => {
      if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleSignIn, 200);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) login(response.credential);
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
        <div style={styles.brand}>
          <div style={styles.brandMark}>F</div>
          <div>
            <div style={styles.brandName}>Fandora</div>
            <div style={styles.brandSub}>人工時系統</div>
          </div>
        </div>

        <h1 style={styles.title}>歡迎回來</h1>
        <p style={styles.subtitle}>請使用 @fandora.co 帳號登入</p>

        <div style={{ marginTop: 28, minHeight: 60 }}>
          {isLoading ? (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <span>正在確認權限…</span>
            </div>
          ) : (
            <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.hint}>Workforce Hours · v2.3</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0B111F 0%, #1A3C45 100%)',
    padding: 24,
    fontFamily: 'var(--font-sans)',
  },
  card: {
    background: '#ffffff',
    maxWidth: 420,
    width: '100%',
    borderRadius: 16,
    padding: 40,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  brandMark: {
    width: 40, height: 40,
    borderRadius: 10,
    background: '#00A4C6',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'var(--font-numeric)',
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: '-.02em',
  },
  brandName: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 18,
    fontWeight: 700,
    color: '#0B111F',
    letterSpacing: '.02em',
  },
  brandSub: {
    fontSize: 11,
    fontWeight: 500,
    color: '#999',
    letterSpacing: '.06em',
    marginTop: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0B111F',
    margin: 0,
    letterSpacing: '-.015em',
  },
  subtitle: {
    fontSize: 14,
    color: '#5F6767',
    margin: '6px 0 0',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#5F6767',
    fontSize: 14,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid #EBEDF0',
    borderTop: '2px solid #00A4C6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#E14D4D',
    fontSize: 13,
    marginTop: 16,
    padding: '8px 12px',
    background: 'rgba(225,77,77,0.08)',
    borderRadius: 8,
  },
  hint: {
    color: '#999',
    fontSize: 11,
    marginTop: 32,
    letterSpacing: '.06em',
    textAlign: 'center',
    fontFamily: 'var(--font-numeric)',
  },
};
