// 📊 알파 팩터 타입
export interface AlphaFactor {
  id: string;
  name: string;
  description?: string;
  formula?: string;
}

// 📈 백테스트 파라미터
export interface BacktestParams {
  start_date: string;
  end_date: string;
  factors: string[];
  rebalancing_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  transaction_cost: number;
  quantile: number;
}

// 📊 백테스트 결과
export interface BacktestResult {
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  ic_mean: number;
  win_rate: number;
  volatility: number;
  total_return?: number;
  cumulative_returns?: Array<{ date: string; value: number }>;
}

// 💼 포트폴리오 종목
export interface PortfolioStock {
  ticker: string;
  weight: number;
  alpha_value: number;
  expected_return?: number;
}

// 👤 사용자 정보
export interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
}

// 📊 대시보드 메트릭
export interface DashboardMetrics {
  totalAlphas: number;
  activeBacktests: number;
  portfolioValue: number;
  dailyPnL: number;
}

// 🤖 AI 채팅 메시지
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// 🧬 GA 파라미터
export interface GAParams {
  start_date: string;
  end_date: string;
  population_size: number;
  generations: number;
  max_alphas: number;
  rebalancing_frequency: string;
  transaction_cost: number;
  quantile: number;
}

// 📊 차트 데이터 포인트
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ⚙️ API 응답
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 🔄 백테스트 상태
export interface BacktestStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: Record<string, BacktestResult>;
  error?: string;
}

