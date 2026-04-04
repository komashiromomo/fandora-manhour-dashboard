import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../shared/constants';
import { colors } from '../shared/styles';
import { useAuth } from './useAuth';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const buttonRef = useRef(null);
  const [error, setError] = useState('');

  const handleCredentialResponse = async (response) => {
    setError('');
    try {
      await login(response.credential);
    } catch (err) {
      setError(err.message || '登入失敗');
    }
  };

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: true,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Fandora</h1>
        <p style={styles.subtitle}>人工時管理系統</p>

        {isLoading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>正在確認權限...</p>
          </div>
        ) : (
          <div style={styles.buttonWrap}>
            <div ref={buttonRef} />
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.footer}>僅限 @fandora.co 帳號登入</p>
      </div>
    </div>
  );
}

const spinnerKeyframes = `
@keyframes fandora-spin {
  to { transform: rotate(360deg); }
}
`;

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = spinnerKeyframes;
  document.head.appendChild(styleEl);
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: 16,
  },
  card: {
    background: colors.white,
    maxWidth: 420,
    width: '100%',
    borderRadius: 16,
    padding: 48,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.primary,
    margin: 0,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 40,
  },
  buttonWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'fandora-spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 0,
  },
  footer: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 32,
    marginBottom: 0,
  },
};
