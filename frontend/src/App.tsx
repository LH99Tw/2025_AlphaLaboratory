import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { Auth } from './components/Auth/Auth';
import { Dashboard } from './pages/Dashboard';
import { Portfolio } from './pages/Portfolio';
import { Backtest } from './pages/Backtest';
import { Simulation } from './pages/Simulation';
import { AlphaPool } from './pages/AlphaPool';
import { AlphaIncubator } from './pages/AlphaIncubator';

import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0A0E27'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={login} />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/alpha-pool" element={<AlphaPool />} />
          <Route path="/alpha-incubator" element={<AlphaIncubator />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider 
      locale={koKR}
      theme={{
        token: {
          colorPrimary: '#D4AF37',
          colorBgBase: '#0A0E27',
          colorTextBase: '#FFFFFF',
        },
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;

