import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';

// Chart.js 등록
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  min-height: calc(100vh - 200px);
  padding: 0;
  margin: 0;
`;

// 다이나믹 아일랜드 스타일 네비게이션 컨테이너
const DynamicIslandNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.liquidGlass};
  backdrop-filter: blur(20px);
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 28px;
  margin: ${theme.spacing.lg} ${theme.spacing.lg};
  box-shadow: ${theme.shadows.glass};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${theme.colors.liquidGlass};
    border-radius: 28px;
    z-index: -1;
  }
`;

// 다이나믹 아일랜드 스타일 네비게이션 버튼
const DynamicIslandButton = styled.button<{ $active: boolean }>`
  position: relative;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$active ? theme.colors.liquidGoldGradient : 'transparent'};
  border: none;
  border-radius: 20px;
  color: ${props => props.$active ? theme.colors.textPrimary : theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${props => props.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 120px;
  text-align: center;
  z-index: 1;
  
  /* 다이나믹 아일랜드 호버 효과 */
  &:hover {
    background: ${props => props.$active ? theme.colors.liquidGoldGradient : theme.colors.liquidGlassHover};
  color: ${theme.colors.textPrimary};
    transform: scale(1.02);
  }
  
  /* 활성 상태 강조 */
  ${props => props.$active && `
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
  `}
`;

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  padding: ${theme.spacing.xl};
  flex: 1;
  overflow: visible;
  background: ${theme.colors.backgroundDark};
  border-radius: 20px;
  margin: 0 ${theme.spacing.lg};
  box-shadow: ${theme.shadows.glass};
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AssetCard = styled(GlassCard)<{ $isPositive?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl};
  background: ${props => props.$isPositive ? theme.colors.liquidGoldGradient : theme.colors.liquidGlass};
  border: 1px solid ${props => props.$isPositive ? theme.colors.liquidGoldBorder : theme.colors.liquidGlassBorder};
`;

const CardLabel = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const CardAmount = styled.div`
  font-size: 2rem;
  color: ${theme.colors.textPrimary};
  font-weight: 700;
  font-family: ${theme.typography.fontFamily.display};
  line-height: 1.2;
`;

const CardChange = styled.div<{ $positive: boolean }>`
  font-size: ${theme.typography.fontSize.body};
  color: ${props => props.$positive ? theme.colors.accentGold : theme.colors.textSecondary};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: ${theme.spacing.lg};

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.xl};
`;

const ChartTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 600;
`;

const PeriodSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
`;

const PeriodLabel = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.body};
  min-width: 60px;
`;

const PeriodToggle = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const PeriodButton = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$active ? theme.colors.accentGold : theme.colors.liquidGlass};
  border: 1px solid ${props => props.$active ? theme.colors.accentGold : theme.colors.border};
  border-radius: 8px;
  color: ${props => props.$active ? '#000000' : theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${props => props.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);

  &:hover {
    background: ${props => props.$active ? theme.colors.accentGold : theme.colors.liquidGlassHover};
    border-color: ${theme.colors.accentGold};
  }
`;

const DoughnutWrapper = styled.div`
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DoughnutCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
`;

const TotalLabel = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const TotalAmount = styled.div`
  font-size: ${theme.typography.fontSize.h2};
  color: ${theme.colors.textPrimary};
  font-weight: 700;
`;

const StockListHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.liquidGoldGradient};
  border: 1px solid ${theme.colors.liquidGoldBorder};
  border-radius: 8px;
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.caption};
`;

const StockListItem = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);

  &:hover {
    background: ${theme.colors.liquidGlassHover};
    border-color: ${theme.colors.borderHover};
  }
`;

const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);

  &:hover {
    background: ${theme.colors.liquidGlassHover};
    border-color: ${theme.colors.borderHover};
  }
`;

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<'1년' | '30일'>('1년');
  const [dashboardData] = useState({
    cash: 23946010,
    stocks: 32000000,
    total: 55946010,
    changes: {
      cash: -150000,
      cash_percent: -0.6,
      stocks: 9256265,
      stocks_percent: 28.8,
    },
  });

  useEffect(() => {
    // 데이터 로드 (나중에 API 연동)
    // API 호출 시 user.id 사용
  }, [user]);

  // 도넛 차트 데이터 (흰색과 부드러운 금색 팔레트만 사용)
  const doughnutData = {
    labels: ['주식', '현금'],
    datasets: [
      {
        data: [57.2, 42.8],
        backgroundColor: [
          'rgba(212, 175, 55, 0.8)',
          'rgba(232, 234, 237, 0.6)',
        ],
        borderColor: [
          'rgba(184, 134, 11, 1)',
          'rgba(255, 255, 255, 0.3)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: theme.colors.textPrimary,
          font: {
            size: 14,
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: theme.colors.backgroundTertiary,
        titleColor: theme.colors.textPrimary,
        bodyColor: theme.colors.textSecondary,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
    },
  };

  // 바 차트 데이터 (흰색과 부드러운 금색 팔레트만 사용)
  const barData = {
    labels: [
      '24-02', '24-03', '24-04', '24-05', '24-06',
      '24-07', '24-08', '24-09', '24-10', '24-11',
      '24-12', '25-01', '25-02'
    ],
    datasets: [
      {
        label: '주식',
        data: [20000000, 22000000, 23000000, 25000000, 28000000, 30000000, 32000000, 35000000, 38000000, 40000000, 42000000, 45000000, 48000000],
        backgroundColor: 'rgba(212, 175, 55, 0.8)',
        borderColor: 'rgba(184, 134, 11, 1)',
        borderWidth: 1,
      },
      {
        label: '현금',
        data: [10000000, 10500000, 11000000, 11500000, 12000000, 12500000, 13000000, 13200000, 13400000, 13500000, 13600000, 13700000, 13800000],
        backgroundColor: 'rgba(232, 234, 237, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: theme.colors.textSecondary,
          font: {
            size: 11,
          },
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: theme.colors.textSecondary,
          callback: function(value: any) {
            return (value / 1000000) + 'M';
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: theme.colors.textPrimary,
          font: {
            size: 12,
          },
          padding: 15,
          boxWidth: 15,
        },
      },
      tooltip: {
        backgroundColor: theme.colors.backgroundTertiary,
        titleColor: theme.colors.textPrimary,
        bodyColor: theme.colors.textSecondary,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
    },
  };

  const renderAssetOverview = () => (
    <>
      <CardsGrid>
        <AssetCard>
          <CardLabel>현금 자산</CardLabel>
          <CardAmount>{dashboardData.cash.toLocaleString()} 원</CardAmount>
          <CardChange $positive={dashboardData.changes.cash_percent > 0}>
            {dashboardData.changes.cash_percent > 0 ? '▲' : '▼'} {Math.abs(dashboardData.changes.cash).toLocaleString()} 원 ({dashboardData.changes.cash_percent}%)
          </CardChange>
        </AssetCard>

        <AssetCard $isPositive>
          <CardLabel>주식 자산</CardLabel>
          <CardAmount>{dashboardData.stocks.toLocaleString()} 원</CardAmount>
          <CardChange $positive={dashboardData.changes.stocks_percent > 0}>
            {dashboardData.changes.stocks_percent > 0 ? '▲' : '▼'} {Math.abs(dashboardData.changes.stocks).toLocaleString()} 원 ({dashboardData.changes.stocks_percent}%)
          </CardChange>
        </AssetCard>
      </CardsGrid>

      <PeriodSelector>
        <PeriodLabel>기간:</PeriodLabel>
        <PeriodToggle>
          <PeriodButton $active={period === '1년'} onClick={() => setPeriod('1년')}>
            1년
          </PeriodButton>
          <PeriodButton $active={period === '30일'} onClick={() => setPeriod('30일')}>
            30일
          </PeriodButton>
        </PeriodToggle>
      </PeriodSelector>

      <ChartsContainer>
        <ChartCard>
          <ChartTitle>내 자산 분포</ChartTitle>
          <DoughnutWrapper>
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <DoughnutCenter>
              <TotalLabel>총 자산</TotalLabel>
              <TotalAmount>{(dashboardData.total / 10000).toLocaleString()}만원</TotalAmount>
            </DoughnutCenter>
          </DoughnutWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>자산 성장 추이</ChartTitle>
          <div style={{ height: '350px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </ChartCard>
      </ChartsContainer>
    </>
  );

  const renderAssetManagement = () => (
    <>
      <CardsGrid>
        <ChartCard>
          <ChartTitle>현금 자산 상세</ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: theme.spacing.lg, background: theme.colors.liquidGlass, border: `1px solid ${theme.colors.liquidGlassBorder}`, borderRadius: '12px' }}>
              <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.body }}>보유 현금</span>
              <span style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.h3 }}>{dashboardData.cash.toLocaleString()} 원</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard>
          <ChartTitle>주식 자산 상세</ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: theme.spacing.lg, background: theme.colors.liquidGlass, border: `1px solid ${theme.colors.liquidGlassBorder}`, borderRadius: '12px' }}>
              <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.body }}>총 평가금액</span>
              <span style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.h3 }}>{dashboardData.stocks.toLocaleString()} 원</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: theme.spacing.lg, background: theme.colors.liquidGoldGradient, border: `1px solid ${theme.colors.liquidGoldBorder}`, borderRadius: '12px' }}>
              <span style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>평가손익</span>
              <span style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.h3 }}>+{dashboardData.changes.stocks.toLocaleString()} 원 (+{dashboardData.changes.stocks_percent}%)</span>
            </div>
          </div>
        </ChartCard>
      </CardsGrid>

      <ChartCard>
        <ChartTitle>최근 거래 내역</ChartTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {[
            { date: '2025-02-14', type: '입금', amount: 5000000, description: '급여 입금' },
            { date: '2025-02-10', type: '출금', amount: -2000000, description: '주식 매수' },
            { date: '2025-02-05', type: '배당', amount: 1000000, description: '배당금 입금' },
            { date: '2025-02-01', type: '출금', amount: -500000, description: '생활비' },
          ].map((transaction, idx) => (
            <TransactionItem key={idx}>
              <div>
                <div style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{transaction.description}</div>
                <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption, marginTop: '4px' }}>{transaction.date}</div>
              </div>
              <div style={{ color: transaction.amount > 0 ? theme.colors.accentGold : theme.colors.textSecondary, fontWeight: 600, fontSize: theme.typography.fontSize.h3 }}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} 원
              </div>
            </TransactionItem>
          ))}
        </div>
      </ChartCard>
    </>
  );

  const renderStockManagement = () => (
    <>
      <ChartCard>
        <ChartTitle>보유 주식</ChartTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <StockListHeader>
            <span>종목명</span>
            <span style={{ textAlign: 'right' }}>수량</span>
            <span style={{ textAlign: 'right' }}>평균단가</span>
            <span style={{ textAlign: 'right' }}>평가금액</span>
            <span style={{ textAlign: 'right' }}>수익률</span>
          </StockListHeader>
          {[
            { ticker: 'AAPL', name: 'Apple Inc.', quantity: 50, avgPrice: 150000, currentPrice: 180000 },
            { ticker: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgPrice: 300000, currentPrice: 350000 },
            { ticker: 'GOOGL', name: 'Alphabet Inc.', quantity: 20, avgPrice: 120000, currentPrice: 140000 },
            { ticker: 'TSLA', name: 'Tesla Inc.', quantity: 15, avgPrice: 200000, currentPrice: 190000 },
          ].map((stock, idx) => {
            const totalValue = stock.quantity * stock.currentPrice;
            const profitLoss = ((stock.currentPrice - stock.avgPrice) / stock.avgPrice) * 100;

  return (
              <StockListItem key={idx}>
      <div>
                  <div style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{stock.name}</div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>{stock.ticker}</div>
                </div>
                <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.body }}>{stock.quantity}주</span>
                <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.body }}>{stock.avgPrice.toLocaleString()}원</span>
                <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{totalValue.toLocaleString()}원</span>
                <span style={{ textAlign: 'right', color: profitLoss >= 0 ? theme.colors.accentGold : theme.colors.textSecondary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>
                  {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}%
                </span>
              </StockListItem>
            );
          })}
      </div>
      </ChartCard>

      <ChartsContainer>
        <ChartCard>
          <ChartTitle>섹터별 분포</ChartTitle>
          <DoughnutWrapper>
            <Doughnut 
              data={{
                labels: ['기술', '금융', '헬스케어', '에너지'],
                datasets: [{
                  data: [45, 25, 20, 10],
                  backgroundColor: [
                    'rgba(212, 175, 55, 0.9)',
                    'rgba(184, 134, 11, 0.7)',
                    'rgba(232, 234, 237, 0.6)',
                    'rgba(154, 160, 166, 0.5)',
                  ],
                  borderColor: [
                    'rgba(184, 134, 11, 1)',
                    'rgba(160, 120, 8, 1)',
                    'rgba(255, 255, 255, 0.3)',
                    'rgba(95, 99, 104, 0.5)',
                  ],
                  borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      color: theme.colors.textPrimary,
                      font: {
                        size: 12,
                      },
                      padding: 15,
                    },
                  },
                  tooltip: {
                    backgroundColor: theme.colors.backgroundTertiary,
                    titleColor: theme.colors.textPrimary,
                    bodyColor: theme.colors.textSecondary,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                },
              }}
            />
          </DoughnutWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>최근 매매 내역</ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {[
              { date: '2025-02-14', type: '매수', ticker: 'AAPL', quantity: 10, price: 180000 },
              { date: '2025-02-10', type: '매도', ticker: 'TSLA', quantity: 5, price: 190000 },
              { date: '2025-02-05', type: '매수', ticker: 'MSFT', quantity: 5, price: 350000 },
            ].map((trade, idx) => (
              <TransactionItem key={idx}>
                <div>
                  <div style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{trade.ticker} {trade.type}</div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>{trade.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: trade.type === '매수' ? theme.colors.textSecondary : theme.colors.accentGold, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>
                    {trade.quantity}주 @ {trade.price.toLocaleString()}원
                  </div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>
                    {(trade.quantity * trade.price).toLocaleString()}원
                  </div>
                </div>
              </TransactionItem>
            ))}
          </div>
        </ChartCard>
      </ChartsContainer>
    </>
  );

  return (
    <DashboardContainer>
      <DynamicIslandNav>
        <DynamicIslandButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          내 자산 한눈에 보기
        </DynamicIslandButton>
        <DynamicIslandButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          자산 관리
        </DynamicIslandButton>
        <DynamicIslandButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          보유 주식 관리
        </DynamicIslandButton>
      </DynamicIslandNav>

      <TabContent>
        {activeTab === 0 && renderAssetOverview()}
        {activeTab === 1 && renderAssetManagement()}
        {activeTab === 2 && renderStockManagement()}
      </TabContent>
    </DashboardContainer>
  );
};
