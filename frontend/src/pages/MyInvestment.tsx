import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { GlassCard } from '../components/common/GlassCard';
import { LiquidBackground } from '../components/common/LiquidBackground';
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
  min-height: calc(100vh - 200px);
  position: relative;
`;

const PageTitle = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  max-width: 800px;
  margin: 0 auto ${theme.spacing.xl};
`;

const AssetOverviewCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
`;

const CardTitle = styled.h2`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const AssetSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.liquidGlass};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.liquidGlassBorder};
`;

const AssetLabel = styled.span`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textSecondary};
`;

const AssetValue = styled.span`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.textPrimary};
`;

const ChartContainer = styled.div`
  height: 300px;
  margin: ${theme.spacing.lg} 0;
`;

const InfoText = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-top: ${theme.spacing.md};
`;

interface UserData {
  totalAssets: number;
  cash: number;
  investments: number;
  name: string;
  email: string;
}

const MyInvestment: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    totalAssets: 0,
    cash: 0,
    investments: 0,
    name: '',
    email: ''
  });
  const [assetHistory, setAssetHistory] = useState<AssetHistory[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioStock[]>([]);
  const [loading, setLoading] = useState(true);

  // 실제 투자 데이터 로드
  React.useEffect(() => {
    const fetchInvestmentData = async () => {
      try {
        setLoading(true);

        // 투자 데이터 로드
        const investmentResponse = await fetch('/api/csv/user/investment', {
          credentials: 'include'
        });

        if (investmentResponse.ok) {
          const investmentData = await investmentResponse.json();
          const investment = investmentData.investment_data;

          // 포트폴리오 데이터 로드
          const portfolioResponse = await fetch('/api/csv/user/portfolio', {
            credentials: 'include'
          });

          if (portfolioResponse.ok) {
            const portfolioResult = await portfolioResponse.json();
            setPortfolioData(portfolioResult.portfolio || []);
          }

          // 자산 변동 이력 로드
          const historyResponse = await fetch(`/api/csv/user/asset-history?limit=30`, {
            credentials: 'include'
          });
          if (historyResponse.ok) {
            const historyResult = await historyResponse.json();
            setAssetHistory(historyResult.history || []);
          }

          setUserData({
            totalAssets: parseFloat(investment.total_assets) || 0,
            cash: parseFloat(investment.cash) || 0,
            investments: parseFloat(investment.stock_value) || 0,
            name: '',  // 필요시 user info에서 가져오기
            email: ''  // 필요시 user info에서 가져오기
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

  // 도넛 차트 데이터 (실제 자산 비중)
  const doughnutData = {
    labels: ['현금', '투자'],
    datasets: [
      {
        data: [
          userData.totalAssets > 0 ? (userData.cash / userData.totalAssets) * 100 : 0,
          userData.totalAssets > 0 ? (userData.investments / userData.totalAssets) * 100 : 0
        ],
        backgroundColor: [
          theme.colors.accentGold,
          theme.colors.accentPrimary,
        ],
        borderColor: [
          theme.colors.accentGold,
          theme.colors.accentPrimary,
        ],
        borderWidth: 2,
      },
    ],
  };

  // 바 차트 데이터 (실제 자산 변화)
  const barData = React.useMemo(() => {
    if (assetHistory.length === 0) {
      return null;
    }

    const history = assetHistory.slice(0, 6).reverse();
    return {
      labels: history.map(h => new Date(h.recorded_at).toLocaleDateString('ko-KR', { month: 'short' })),
      datasets: [
        {
          label: '총 자산',
          data: history.map(h => h.total_assets),
          backgroundColor: theme.colors.accentGold,
          borderColor: theme.colors.accentPrimary,
          borderWidth: 1,
        },
      ],
    };
  }, [assetHistory]);

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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  if (loading) {
    return (
      <MyInvestmentContainer>
        <LiquidBackground />
        <PageTitle>내 투자</PageTitle>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
          투자 데이터를 불러오는 중...
        </div>
      </MyInvestmentContainer>
    );
  }

  return (
    <MyInvestmentContainer>
      <LiquidBackground />
      <PageTitle>내 투자</PageTitle>

      <ContentGrid>
        {/* 자산 현황 */}
        <AssetOverviewCard>
          <CardTitle>자산 현황</CardTitle>

          <AssetSummary>
            <AssetLabel>총 자산</AssetLabel>
            <AssetValue>{formatCurrency(userData.totalAssets)}</AssetValue>
          </AssetSummary>

          <ChartContainer>
            <Doughnut data={doughnutData} options={chartOptions} />
          </ChartContainer>

          <InfoText>
            현금: {formatCurrency(userData.cash)} ({userData.totalAssets > 0 ? ((userData.cash / userData.totalAssets) * 100).toFixed(1) : 0}%)<br/>
            투자: {formatCurrency(userData.investments)} ({userData.totalAssets > 0 ? ((userData.investments / userData.totalAssets) * 100).toFixed(1) : 0}%)<br/>
            보유 종목: {portfolioData.length}개
          </InfoText>
        </AssetOverviewCard>
      </ContentGrid>

      {/* 자산 변화 차트 */}
      <GlassCard style={{ padding: theme.spacing.xl }}>
        <CardTitle>자산 변화 추이</CardTitle>
        {barData ? (
          <ChartContainer>
            <Bar data={barData} options={chartOptions} />
          </ChartContainer>
        ) : (
          <InfoText>자산 변동 이력이 아직 없습니다. 거래가 기록되면 그래프가 표시됩니다.</InfoText>
        )}
      </GlassCard>
    </MyInvestmentContainer>
  );
};

export default MyInvestment;
