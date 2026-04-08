import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/constants';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 48,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    maxWidth: 400,
    width: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    margin: '0 0 32px 0',
  },
  buttonContainer: {
    minHeight: 48,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupText: {
    color: '#f44336',
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    lineHeight: 1.5,
  },
};

export default function LoginScreen() {
  const { renderSignInButton } = useAuth();
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current && GOOGLE_CLIENT_ID) {
      renderSignInButton(btnRef.current);
    }
  }, [renderSignInButton]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Fandora</h1>
        <p style={styles.subtitle}>人工時管理系統 v3.0</p>

        {!GOOGLE_CLIENT_ID ? (
          <>
            <p style={styles.setupText}>
              ⚠️ 需要設定 Google API credentials
            </p>
            <div style={styles.helpText}>
              <p>請在 <code>.env.local</code> 中設定：</p>
              <code style={{ display: 'block', background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 8 }}>
                VITE_GOOGLE_CLIENT_ID=你的client_id
              </code>
            </div>
          </>
        ) : (
          <div style={styles.buttonContainer} ref={btnRef} />
        )}
      </div>
    </div>
  );
}
