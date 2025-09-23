import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Backtest from './pages/Backtest';
import GAEvolution from './pages/GAEvolution';
import AIAgent from './pages/AIAgent';
import DataExplorer from './pages/DataExplorer';

import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={koKR}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/backtest" element={<Backtest />} />
            <Route path="/ga-evolution" element={<GAEvolution />} />
            <Route path="/ai-agent" element={<AIAgent />} />
            <Route path="/data-explorer" element={<DataExplorer />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
