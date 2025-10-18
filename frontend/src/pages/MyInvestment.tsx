import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { theme } from '../styles/theme';
import { GlassCard } from '../components/common/GlassCard';
import { LiquidBackground } from '../components/common/LiquidBackground';
import { AmbientWordMatrix } from '../components/common/AmbientWordMatrix';
import { HoloStatTicker } from '../components/common/HoloStatTicker';
import { NeuralField } from '../components/common/NeuralField';
import { AssetHistory, PortfolioStock } from '../types';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const MyInvestmentContainer = styled.div`
  position: relative;
  min-height: 100vh;
  padding: calc(${theme.spacing.xxl} + 32px) ${theme.spacing.xl} ${theme.spacing.xxl};
  display: flex;
  justify-content: center;
  overflow: hidden;
`;

const MainContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xxl};
  max-width: 1220px;
  width: 100%;
`;

const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  color: ${theme.colors.textPrimary};
  position: relative;
`;

const HeroBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.28), rgba(138, 180, 248, 0.1));
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: fit-content;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
`;

const PageTitle = styled.h1`
  font-size: clamp(2.25rem, 4vw, 3.2rem);
  font-weight: ${theme.typography.fontWeight.extrabold};
  letter-spacing: -0.02em;
  margin: 0;
  color: ${theme.colors.textPrimary};
  text-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
`;

const HeroDescription = styled.p`
  max-width: 580px;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(232, 234, 237, 0.75);
`;

const TickerWrapper = styled.div`
  margin-top: ${theme.spacing.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const CinematicDeck = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xxl};
`;

const PrimaryColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, 1.25fr) minmax(280px, 1fr);
  gap: ${theme.spacing.xl};

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const SecondaryColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: ${theme.spacing.xl};
`;

const CinematicCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
  position: relative;
  overflow: hidden;
  min-height: 320px;
`;

const CardTitle = styled.h2`
  font-size: ${theme.typography.fontSize.h3};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.lg};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CardSubtitle = styled.p`
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const MetricItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.textSecondary};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const MetricValue = styled.span<{ $accent?: boolean }>`
  font-size: 1.2rem;
  font-weight: ${theme.typography.fontWeight.bold};
  font-family: ${theme.typography.fontFamily.display};
  color: ${({ $accent }) => ($accent ? theme.colors.accentPrimary : theme.colors.textPrimary)};
`;

const MetricDelta = styled.span<{ $positive: boolean }>`
  font-size: 0.75rem;
  color: ${({ $positive }) => ($positive ? theme.colors.success : theme.colors.error)};
  letter-spacing: 0.04em;
`;

const ChartContainer = styled.div`
  height: 320px;
`;

const EmptyState = styled.div`
  color: ${theme.colors.textSecondary};
  text-align: center;
  padding: ${theme.spacing.xl};
  font-size: 0.95rem;
`;

const HoldingsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const HoldingRow = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
`;

const HoldingTicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  span:first-child {
    font-size: 0.95rem;
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.textPrimary};
  }

  span:last-child {
    font-size: 0.75rem;
    color: ${theme.colors.textSecondary};
  }
`;

const HoldingValue = styled.div`
  display: flex;
  flex-direction: column;
  text-align: right;
  gap: 4px;
  font-family: ${theme.typography.fontFamily.display};
`;

const WordMatrixLayer = styled(AmbientWordMatrix)`
  opacity: 0.55;
  filter: blur(0.2px);

  @media (max-width: 1024px) {
    display: none;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: 0.95rem;
`;

const AMBIENT_COLUMNS = [
  {
    title: 'Adjectives',
    words: ['Front', 'Wider', 'Rear', 'Top', 'Tall', 'Safe', 'Oven', 'Outer', 'Bottom'],
    speed: 36,
  },
  {
    title: 'Nouns',
    words: ['Door', 'Eyes', 'Mouth', 'Window', 'Drawer', 'Gate', 'Crack', 'Refrigerator'],
    speed: 42,
  },
  {
    title: 'Verbs',
    words: ['Look', 'See', 'Speak', 'Close', 'Step', 'Read', 'Shut', 'Protest', 'Scream'],
    speed: 52,
  },
  {
    title: 'Adverbs',
    words: ['Again', 'Slowly', 'Once', 'Enough', 'Immediately', 'Quietly', 'Slightly', 'Softly', 'Cautiously'],
    speed: 48,
  },
];

interface UserData {
  totalAssets: number;
  cash: number;
  investments: number;
  name: string;
  email: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);

const formatCompactCurrency = (amount: number) =>
  `₩${new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)}`;

const formatTimecode = (date: Date) =>
  date
    .toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace('오전', '')
    .replace('오후', '')
    .trim();

const MyInvestment: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    totalAssets: 0,
    cash: 0,
    investments: 0,
    name: '',
    email: '',
  });
  const [assetHistory, setAssetHistory] = useState<AssetHistory[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [timecode, setTimecode] = useState(() => formatTimecode(new Date()));

  useEffect(() => {
    const fetchInvestmentData = async () => {
      try {
        setLoading(true);

        const investmentResponse = await fetch('/api/csv/user/investment', {
          credentials: 'include',
        });

        if (investmentResponse.ok) {
          const investmentData = await investmentResponse.json();
          const investment = investmentData.investment_data;

          const portfolioResponse = await fetch('/api/csv/user/portfolio', {
            credentials: 'include',
          });

          if (portfolioResponse.ok) {
            const portfolioResult = await portfolioResponse.json();
            setPortfolioData(portfolioResult.portfolio || []);
          }

          const historyResponse = await fetch(`/api/csv/user/asset-history?limit=30`, {
            credentials: 'include',
          });
          if (historyResponse.ok) {
            const historyResult = await historyResponse.json();
            setAssetHistory(historyResult.history || []);
          }

          setUserData({
            totalAssets: parseFloat(investment.total_assets) || 0,
            cash: parseFloat(investment.cash) || 0,
            investments: parseFloat(investment.stock_value) || 0,
            name: '',
            email: '',
          });
        }
      } catch (error) {
        console.error('투자 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestmentData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTimecode(formatTimecode(new Date())), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedHistory = useMemo(() => {
    if (!assetHistory.length) return [];
    return [...assetHistory].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  }, [assetHistory]);

  const latestSnapshot = sortedHistory[sortedHistory.length - 1];
  const previousSnapshot = sortedHistory[sortedHistory.length - 2];

  const totalDelta =
    latestSnapshot && previousSnapshot ? latestSnapshot.total_assets - previousSnapshot.total_assets : 0;
  const totalDeltaPercent =
    latestSnapshot && previousSnapshot && previousSnapshot.total_assets !== 0
      ? (totalDelta / previousSnapshot.total_assets) * 100
      : 0;

  const doughnutData = {
    labels: ['현금', '투자'],
    datasets: [
      {
        data: [
          userData.totalAssets > 0 ? (userData.cash / userData.totalAssets) * 100 : 0,
          userData.totalAssets > 0 ? (userData.investments / userData.totalAssets) * 100 : 0,
        ],
        backgroundColor: [theme.colors.accentGold, theme.colors.accentPrimary],
        borderColor: [theme.colors.accentGold, theme.colors.accentPrimary],
        borderWidth: 2,
      },
    ],
  };

  const barData = useMemo(() => {
    if (sortedHistory.length === 0) {
      return null;
    }

    const history = [...sortedHistory]
      .slice(-8)
      .map((entry) => ({
        label: new Date(entry.recorded_at).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
        total: entry.total_assets,
      }));

    return {
      labels: history.map((entry) => entry.label),
      datasets: [
        {
          label: '총 자산',
          data: history.map((entry) => entry.total),
          backgroundColor: theme.colors.accentGold,
          borderColor: theme.colors.accentPrimary,
          borderWidth: 1,
          borderRadius: 12,
        },
      ],
    };
  }, [sortedHistory]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme.colors.textPrimary,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.colors.textSecondary,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      y: {
        ticks: {
          color: theme.colors.textSecondary,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
      },
    },
  };

  const topHoldings = useMemo(() => {
    if (!portfolioData.length) return [];
    return [...portfolioData]
      .sort((a, b) => b.quantity * b.current_price - a.quantity * a.current_price)
      .slice(0, 4);
  }, [portfolioData]);

  const tickerStats = useMemo(
    () => [
      {
        label: 'Timecode',
        value: timecode,
        caption: 'LAB SYSTEM SYNC',
      },
      {
        label: 'Total Assets',
        value: formatCompactCurrency(userData.totalAssets),
        caption: '실시간 평가금액',
      },
      {
        label: 'Cash Reserve',
        value: formatCompactCurrency(userData.cash),
        caption: '가용 유동성',
      },
      {
        label: 'Holdings',
        value: `${portfolioData.length} 종목`,
        caption: '포트폴리오',
      },
    ],
    [portfolioData.length, timecode, userData.cash, userData.totalAssets]
  );

  if (loading) {
    return (
      <MyInvestmentContainer>
        <LiquidBackground />
        <LoadingState>투자 데이터를 불러오는 중...</LoadingState>
      </MyInvestmentContainer>
    );
  }

  return (
    <MyInvestmentContainer>
      <LiquidBackground />
      <NeuralField intensity={0.9} />
      <WordMatrixLayer columns={AMBIENT_COLUMNS} />

      <MainContent>
        <HeroSection>
          <HeroBadge>Alpha Lab Investment Command</HeroBadge>
          <PageTitle>내 투자 · 시네마틱 모니터링 보드</PageTitle>
          <HeroDescription>
            실시간 자산 흐름과 유동성을 Three.js 무드의 공간감으로 시각화했습니다. 데이터는 30초마다 자동으로
            동기화되며, 파티클 네트워크는 자산 변동성에 반응하는 HUD 계층을 형성합니다.
          </HeroDescription>
          <TickerWrapper>
            <HoloStatTicker stats={tickerStats} />
          </TickerWrapper>
        </HeroSection>

        <CinematicDeck>
          <PrimaryColumns>
            <CinematicCard>
              <CardTitle>자산 현황</CardTitle>
              <CardSubtitle>현금 대비 투자 비중과 최근 변동률</CardSubtitle>

              <MetricGrid>
                <MetricItem>
                  <MetricLabel>총 자산</MetricLabel>
                  <MetricValue $accent>{formatCurrency(userData.totalAssets)}</MetricValue>
                  <MetricDelta $positive={totalDelta >= 0}>
                    {totalDelta >= 0 ? '+' : ''}
                    {formatCurrency(totalDelta)} ({totalDeltaPercent >= 0 ? '+' : ''}
                    {totalDeltaPercent.toFixed(2)}%)
                  </MetricDelta>
                </MetricItem>
                <MetricItem>
                  <MetricLabel>현금</MetricLabel>
                  <MetricValue>{formatCurrency(userData.cash)}</MetricValue>
                  <MetricDelta $positive={userData.cash >= userData.investments}>
                    비중{' '}
                    {userData.totalAssets > 0
                      ? ((userData.cash / userData.totalAssets) * 100).toFixed(1)
                      : 0}
                    %
                  </MetricDelta>
                </MetricItem>
                <MetricItem>
                  <MetricLabel>투자 자산</MetricLabel>
                  <MetricValue>{formatCurrency(userData.investments)}</MetricValue>
                  <MetricDelta $positive={userData.investments >= userData.cash}>
                    비중{' '}
                    {userData.totalAssets > 0
                      ? ((userData.investments / userData.totalAssets) * 100).toFixed(1)
                      : 0}
                    %
                  </MetricDelta>
                </MetricItem>
              </MetricGrid>

              <ChartContainer>
                <Doughnut data={doughnutData} options={chartOptions} />
              </ChartContainer>
            </CinematicCard>

            <CinematicCard>
              <CardTitle>자산 변화 추이</CardTitle>
              <CardSubtitle>최근 8회 기록을 기준으로 총 자산 모멘텀</CardSubtitle>
              {barData ? (
                <ChartContainer>
                  <Bar data={barData} options={chartOptions} />
                </ChartContainer>
              ) : (
                <EmptyState>자산 변동 이력이 아직 없습니다. 거래가 기록되면 시각화가 업데이트됩니다.</EmptyState>
              )}
            </CinematicCard>
          </PrimaryColumns>

          <SecondaryColumns>
            <CinematicCard>
              <CardTitle>상위 보유 종목</CardTitle>
              <CardSubtitle>실시간 평가금액 기준 정렬</CardSubtitle>
              {topHoldings.length ? (
                <HoldingsList>
                  {topHoldings.map((stock) => {
                    const positionValue = stock.quantity * stock.current_price;
                    return (
                      <HoldingRow key={stock.ticker}>
                        <HoldingTicker>
                          <span>{stock.ticker}</span>
                          <span>{stock.company_name}</span>
                        </HoldingTicker>
                        <HoldingValue>
                          <span>{formatCurrency(positionValue)}</span>
                          <span>
                            {stock.quantity}주 · {formatCurrency(stock.current_price)}
                          </span>
                        </HoldingValue>
                      </HoldingRow>
                    );
                  })}
                </HoldingsList>
              ) : (
                <EmptyState>포트폴리오 데이터가 아직 없습니다.</EmptyState>
              )}
            </CinematicCard>

            <CinematicCard>
              <CardTitle>시스템 알림</CardTitle>
              <CardSubtitle>모션 HUD는 자산 이벤트에 맞춰 발광합니다</CardSubtitle>
              <EmptyState>
                다음 자산 이벤트를 대기 중입니다. 거래가 발생하면 실시간 시네마틱 피드가 활성화됩니다.
              </EmptyState>
            </CinematicCard>
          </SecondaryColumns>
        </CinematicDeck>
      </MainContent>
    </MyInvestmentContainer>
  );
};

export default MyInvestment;

