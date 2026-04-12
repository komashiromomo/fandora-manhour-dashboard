import React from 'react';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#f5f7fa',
      fontSize: 18, color: '#666',
    }}>
      載入中...
    </div>
  );
}

export default function App() {
  return <LoadingScreen />;
}
