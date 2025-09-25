import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Backtest from './pages/Backtest';
import GAEvolution from './pages/GAEvolution';
import AIAgent from './pages/AIAgent';
import DataExplorer from './pages/DataExplorer';

import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
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
          <Route path="/ga-evolution" element={<GAEvolution />} />
          <Route path="/ai-agent" element={<AIAgent />} />
          <Route path="/data-explorer" element={<DataExplorer />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={koKR}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
