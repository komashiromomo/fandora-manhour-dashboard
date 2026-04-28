/**
 * LoginScreen — 套上 Fandora V2 設計風格
 * 保留 Google Sign In 整合（ref + GIS renderButton）邏輯
 */
import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/constants';

export default function LoginScreen() {
  const { renderSignInButton } = useAuth();
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current && GOOGLE_CLIENT_ID) {
      renderSignInButton(btnRef);
    }
  }, [renderSignInButton]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 20% 0%, var(--accent-tint, #D9F1F6) 0%, transparent 55%), radial-gradient(circle at 80% 100%, rgba(0,164,198,0.18) 0%, transparent 50%), var(--bg-page-alt, #F2F5FA)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景品牌光暈 */}
      <div
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, var(--accent, #00A4C6) 0%, transparent 70%)',
          opacity: 0.16,
          filter: 'blur(60px)',
          top: -160,
          right: -120,
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '40px 36px',
          textAlign: 'center',
          borderRadius: 'var(--r-lg, 16px)',
          boxShadow: 'var(--shadow-3)',
          background: 'var(--bg-surface, #fff)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 24px',
            borderRadius: 14,
            background: 'var(--accent, #00A4C6)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-numeric)',
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '-0.02em',
            boxShadow: 'var(--shadow-brand)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          F
        </div>

        <div
          className="eyebrow"
          style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', marginBottom: 8 }}
        >
          FANDORA · V3
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            color: 'var(--fg-1, #0B111F)',
          }}
        >
          人工時管理系統
        </h1>
        <p style={{ color: 'var(--fg-3, #595959)', fontSize: 13, margin: '0 0 32px' }}>
          請使用 Fandora 公司帳號登入
        </p>

        {!GOOGLE_CLIENT_ID ? (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: 'rgba(225,77,77,0.08)',
              border: '1px solid rgba(225,77,77,0.2)',
              color: 'var(--state-error, #E14D4D)',
              fontSize: 13,
              lineHeight: 1.6,
              textAlign: 'left',
            }}
          >
            <strong>⚠ 需要設定 Google API credentials</strong>
            <div style={{ marginTop: 8, color: 'var(--fg-2)' }}>
              請在 <code>.env.local</code> 中設定：
            </div>
            <code
              style={{
                display: 'block',
                background: 'var(--bg-page-alt)',
                padding: 8,
                borderRadius: 4,
                marginTop: 8,
                fontSize: 12,
                color: 'var(--fg-1)',
              }}
            >
              VITE_GOOGLE_CLIENT_ID=你的 client_id
            </code>
          </div>
        ) : (
          <div
            ref={btnRef}
            style={{
              minHeight: 48,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          />
        )}

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--border-1, #EBEDF0)',
            fontSize: 11,
            color: 'var(--fg-muted, #999)',
            letterSpacing: '0.04em',
          }}
        >
          僅限 @fandora.co 網域
        </div>
      </div>
    </div>
  );
}
