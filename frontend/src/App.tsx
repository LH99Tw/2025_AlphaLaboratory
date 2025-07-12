import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface StockData {
  id: number;
  symbol: string;
  date: string;
  close_price: number;
  volume: number;
  ma20: number;
  ma60: number;
  rsi: number;
  volatility: number;
}

interface ApiResponse {
  tickers?: string[];
  message?: string;
  data?: StockData[];
}

function App() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchTickers();
  }, []);

  const fetchTickers = async () => {
    try {
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/tickers`);
      setTickers(response.data.tickers || []);
    } catch (error) {
      console.error('티커 조회 실패:', error);
    }
  };

  const collectData = async () => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse>(`${API_BASE_URL}/collect-data`);
      setMessage(response.data.message || '');
    } catch (error) {
      setMessage('데이터 수집 실패');
      console.error('데이터 수집 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async (symbol: string) => {
    try {
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/stock/${symbol}`);
      setSelectedStock(response.data.data || []);
    } catch (error) {
      console.error('주식 데이터 조회 실패:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📈 주식 분석 대시보드</h1>
      </header>
      
      <main>
        <section className="controls">
          <h2>데이터 관리</h2>
          <button 
            onClick={collectData} 
            disabled={loading}
            className="collect-btn"
          >
            {loading ? '수집 중...' : '데이터 수집'}
          </button>
          {message && <p className="message">{message}</p>}
        </section>

        <section className="tickers">
          <h2>S&P 500 종목 목록</h2>
          <div className="ticker-grid">
            {tickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => fetchStockData(ticker)}
                className="ticker-btn"
              >
                {ticker}
              </button>
            ))}
          </div>
        </section>

        {selectedStock.length > 0 && (
          <section className="stock-data">
            <h2>{selectedStock[0]?.symbol} 주가 데이터</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>종가</th>
                    <th>거래량</th>
                    <th>MA20</th>
                    <th>MA60</th>
                    <th>RSI</th>
                    <th>변동성</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStock.slice(0, 10).map((data) => (
                    <tr key={data.id}>
                      <td>{new Date(data.date).toLocaleDateString()}</td>
                      <td>${data.close_price?.toFixed(2)}</td>
                      <td>{data.volume?.toLocaleString()}</td>
                      <td>{data.ma20?.toFixed(2)}</td>
                      <td>{data.ma60?.toFixed(2)}</td>
                      <td>{data.rsi?.toFixed(2)}</td>
                      <td>{data.volatility?.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
