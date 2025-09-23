import axios from 'axios';

// API 베이스 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API 요청: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API 응답: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API 응답 오류:', error);
    return Promise.reject(error);
  }
);

// 타입 정의
export interface BacktestParams {
  start_date: string;
  end_date: string;
  factors: string[];
  rebalancing_frequency?: string;
  transaction_cost?: number;
  quantile?: number;
  max_factors?: number;
}

export interface BacktestResult {
  success: boolean;
  results: Record<string, any>;
  parameters: BacktestParams;
}

export interface BacktestAsyncResult {
  success: boolean;
  task_id: string;
  message: string;
  status_url: string;
}

export interface BacktestStatus {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: Record<string, any>;
  parameters?: BacktestParams;
  error?: string;
  start_time?: string;
  end_time?: string;
}

export interface GAParams {
  population_size: number;
  generations: number;
  max_depth: number;
  start_date?: string;
  end_date?: string;
  rebalancing_frequency?: string;
  transaction_cost?: number;
  quantile?: number;
  max_alphas?: number;
}

export interface GAAsyncResult {
  success: boolean;
  task_id: string;
  message: string;
  status_url: string;
}

export interface GAStatus {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: Array<{
    expression: string;
    fitness: number;
  }>;
  parameters?: GAParams;
  error?: string;
  start_time?: string;
  end_time?: string;
}

export interface GAResult {
  success: boolean;
  task_id: string;
  message: string;
}

export interface GABacktestParams {
  start_date: string;
  end_date: string;
  rebalancing_frequency?: string;
  transaction_cost?: number;
  quantile?: number;
}

export interface GABacktestResult {
  success: boolean;
  backtest_task_id: string;
  message: string;
  status_url: string;
}

export interface ChatMessage {
  message: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  timestamp: string;
}

export interface FactorList {
  success: boolean;
  factors: string[];
  total_count: number;
}

export interface DataStats {
  success: boolean;
  stats: {
    price_data?: {
      file_exists: boolean;
      columns: string[];
      sample_rows: number;
    };
    alpha_data?: {
      file_exists: boolean;
      total_columns: number;
      alpha_factors: number;
      sample_rows: number;
    };
  };
  timestamp: string;
}

export interface TickerList {
  success: boolean;
  tickers: string[];
  total_count: number;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
  systems: {
    backtest: boolean;
    ga: boolean;
    langchain: boolean;
    database: boolean;
  };
}

// API 함수들
export const apiService = {
  // 서버 상태 확인
  health: (): Promise<HealthCheck> => 
    api.get('/health').then(response => response.data),

  // 백테스트 실행 (비동기)
  runBacktest: (params: BacktestParams): Promise<BacktestAsyncResult> =>
    api.post('/backtest', params).then(response => response.data),

  // 백테스트 상태 확인
  getBacktestStatus: (taskId: string): Promise<BacktestStatus> =>
    api.get(`/backtest/status/${taskId}`).then(response => response.data),

  // GA 실행 (비동기)
  runGA: (params: GAParams): Promise<GAAsyncResult> =>
    api.post('/ga/run', params).then(response => response.data),

  // GA 상태 확인
  getGAStatus: (taskId: string): Promise<GAStatus> =>
    api.get(`/ga/status/${taskId}`).then(response => response.data),

  // GA 결과를 백테스트로 연결
  backtestGAResults: (taskId: string, params: GABacktestParams): Promise<GABacktestResult> =>
    api.post(`/ga/backtest/${taskId}`, params).then(response => response.data),

  // AI 에이전트와 채팅
  chat: (message: ChatMessage): Promise<ChatResponse> =>
    api.post('/chat', message).then(response => response.data),

  // 알파 팩터 목록 조회
  getFactors: (): Promise<FactorList> =>
    api.get('/data/factors').then(response => response.data),

  // 데이터 통계 조회
  getDataStats: (): Promise<DataStats> =>
    api.get('/data/stats').then(response => response.data),

  // 티커 목록 조회
  getTickerList: (): Promise<TickerList> =>
    api.get('/data/ticker-list').then(response => response.data),
};

export default api;
