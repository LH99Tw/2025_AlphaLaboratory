import axios from 'axios';
import type { 
  BacktestParams, 
  BacktestStatus, 
  GAParams, 
  ApiResponse,
  ChatMessage
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.defaults.withCredentials = true;

// 🏥 시스템 상태 확인
export const checkHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

// 📈 백테스트 API
export const runBacktest = async (params: BacktestParams): Promise<ApiResponse> => {
  const response = await api.post('/api/backtest', params, { withCredentials: true });
  return response.data;
};

export const getBacktestStatus = async (taskId: string): Promise<BacktestStatus> => {
  const response = await api.get(`/api/backtest/status/${taskId}`, { withCredentials: true });
  return response.data;
};

// 💼 포트폴리오 API
export const selectStocks = async (params: {
  alpha_factor: string;
  top_count: number;
  selection_method: string;
}) => {
  const response = await api.post('/api/portfolio/stocks', params);
  return response.data;
};

export const analyzePerformance = async (params: {
  alpha_factor: string;
  top_count: number;
  start_date: string;
  end_date: string;
  transaction_cost: number;
  rebalancing_frequency: string;
}) => {
  const response = await api.post('/api/portfolio/performance', params);
  return response.data;
};

// 🤖 AI 에이전트 API
export const sendChatMessage = async (message: string, userId: string = 'user123'): Promise<ChatMessage> => {
  const response = await api.post('/api/chat', { message, user_id: userId });
  return {
    role: 'assistant',
    content: response.data.response || response.data.message,
    timestamp: new Date(),
  };
};

// Alias for compatibility
export const chatWithAgent = async (message: string) => {
  const response = await api.post('/api/chat', { message });
  return response.data;
};

// Alpha Incubator GA API
export const startGAEvolution = async (params: {
  population_size?: number;
  generations?: number;
  max_depth?: number;
}) => {
  const response = await api.post('/api/ga/run', params, { withCredentials: true });
  return response.data;
};

export const getGAEvolutionStatus = async (taskId: string) => {
  const response = await api.get(`/api/ga/status/${taskId}`, { withCredentials: true });
  return response.data;
};

export const backtestGAAlphas = async (taskId: string, params: {
  start_date?: string;
  end_date?: string;
  rebalancing_frequency?: string;
  transaction_cost?: number;
  quantile?: number;
}) => {
  const response = await api.post(`/api/ga/backtest/${taskId}`, params, { withCredentials: true });
  return response.data;
};

// 🧬 GA 알고리즘 API
export const runGA = async (params: GAParams): Promise<ApiResponse & { task_id?: string; status_url?: string }> => {
  const response = await api.post('/api/ga/run', params, { withCredentials: true });
  return response.data;
};

export const getGAStatus = async (taskId: string) => {
  const response = await api.get(`/api/ga/status/${taskId}`, { withCredentials: true });
  return response.data;
};

export const saveUserAlphas = async (alphas: Array<{ name: string; expression: string; fitness: number }>) => {
  const response = await api.post('/api/user-alpha/save', { alphas }, { withCredentials: true });
  return response.data;
};

// 📊 데이터 API
export const getFactorsList = async () => {
  const response = await api.get('/api/data/factors');
  return response.data;
};

export const getDataStats = async () => {
  const response = await api.get('/api/data/stats');
  return response.data;
};

export default api;
