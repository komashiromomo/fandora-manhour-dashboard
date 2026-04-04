import React from 'react';
import { AuthProvider } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import Layout from './components/Layout';
import LoginScreen from './auth/LoginScreen';
import { useAuth } from './auth/useAuth';

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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
