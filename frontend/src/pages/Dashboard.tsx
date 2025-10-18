import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Modal, Form, message, Popconfirm, Select, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { GlassButton } from '../components/common/GlassButton';
import { StoredAlpha, PortfolioStock } from '../types';
import { fetchUserAlphas, saveUserAlphas as saveUserAlphasApi, deleteUserAlpha as deleteUserAlphaApi } from '../services/api';

// Chart.js 등록
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement);

const defaultAlphaSummary = {
  shared_count: 0,
  private_count: 0,
  total_count: 0,
  registry_size: 0,
};

const normalizeAlpha = (alpha: any): StoredAlpha => {
  if (!alpha || typeof alpha !== 'object') {
    return {
      id: `alpha_${Math.random().toString(36).slice(2)}`,
      name: 'Unknown Alpha',
      source: 'shared',
      provider: 'unknown',
      description: '',
      tags: [],
      metadata: {},
    };
  }

  const metadata = (alpha.metadata && typeof alpha.metadata === 'object') ? alpha.metadata : {};
  const rawTags = alpha.tags ?? metadata.tags ?? [];
  const tags = Array.isArray(rawTags)
    ? rawTags.map((tag: any) => String(tag).trim()).filter(Boolean)
    : [];

  return {
    id: alpha.id || metadata.id || alpha.name || `alpha_${Math.random().toString(36).slice(2)}`,
    name: alpha.name || metadata.name || 'Unnamed Alpha',
    expression: alpha.expression || metadata.expression || '',
    source: alpha.source || 'shared',
    provider: alpha.provider || metadata.provider || 'user-defined',
    owner: alpha.owner || metadata.owner,
    created_at: alpha.created_at || metadata.created_at,
    updated_at: alpha.updated_at || metadata.updated_at,
    description: alpha.description || metadata.description || '',
    tags,
    metadata,
  };
};

const normalizeAlphaList = (list?: any): StoredAlpha[] => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(normalizeAlpha);
};

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  min-height: calc(100vh - 200px);
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
  background: transparent;
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
  
  /* 호버 효과 */
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    color: ${theme.colors.textPrimary};
    transform: scale(1.02);
  }
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
  const [dashboardData, setDashboardData] = useState({
    cash: 0,
    stocks: 0,
    total: 0,
    changes: {
      cash: 0,
      cash_percent: 0,
      stocks: 0,
      stocks_percent: 0,
    },
  });
  const [portfolioData, setPortfolioData] = useState<PortfolioStock[]>([]);
  const [loading, setLoading] = useState(true);

  // 알파 관리 상태
  const [privateAlphas, setPrivateAlphas] = useState<StoredAlpha[]>([]);
  const [sharedAlphas, setSharedAlphas] = useState<StoredAlpha[]>([]);
  const [alphaSummary, setAlphaSummary] = useState({ ...defaultAlphaSummary });
  const [alphaLoading, setAlphaLoading] = useState(false);
  const [isAlphaModalVisible, setIsAlphaModalVisible] = useState(false);
  const [editingAlpha, setEditingAlpha] = useState<StoredAlpha | null>(null);
  const [alphaForm] = Form.useForm();


  // 알파 관리 함수들
  const loadAlphas = useCallback(async () => {
    try {
      setAlphaLoading(true);
      const data = await fetchUserAlphas();
      setSharedAlphas(normalizeAlphaList(data.shared_alphas));
      setPrivateAlphas(normalizeAlphaList(data.private_alphas));
      setAlphaSummary(data.summary ? { ...defaultAlphaSummary, ...data.summary } : { ...defaultAlphaSummary });
    } catch (error) {
      console.error('알파 목록 로드 실패:', error);
      setSharedAlphas([]);
      setPrivateAlphas([]);
      setAlphaSummary({ ...defaultAlphaSummary });
    } finally {
      setAlphaLoading(false);
    }
  }, []);

  const handleSaveAlpha = async (values: any) => {
    if (!user) {
      message.error('알파를 저장하려면 로그인이 필요합니다.');
      return;
    }

    try {
      const alphaData = {
        id: editingAlpha?.id,
        name: values.name,
        expression: values.expression,
        description: values.description || '',
        tags: values.tags || [],
        fitness: values.fitness !== undefined && values.fitness !== null ? Number(values.fitness) : undefined,
      };

      const response = await saveUserAlphasApi([alphaData]);

      if (response.success) {
        message.success('알파가 성공적으로 저장되었습니다.');
        setIsAlphaModalVisible(false);
        alphaForm.resetFields();
        setPrivateAlphas(normalizeAlphaList(response.private_alphas));
        setSharedAlphas(normalizeAlphaList(response.shared_alphas));
        setAlphaSummary(response.summary ? { ...defaultAlphaSummary, ...response.summary } : { ...defaultAlphaSummary });
      } else {
        message.error(response.error || '알파 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('알파 저장 실패:', error);
      message.error('알파 저장에 실패했습니다.');
    }
  };

  const handleDeleteAlpha = async (alphaId: string) => {
    if (!user) {
      message.error('알파를 삭제하려면 로그인이 필요합니다.');
      return;
    }

    try {
      const response = await deleteUserAlphaApi(alphaId);

      if (response.success) {
        message.success('알파가 성공적으로 삭제되었습니다.');
        setPrivateAlphas(normalizeAlphaList(response.private_alphas));
        setSharedAlphas(normalizeAlphaList(response.shared_alphas));
        setAlphaSummary(response.summary ? { ...defaultAlphaSummary, ...response.summary } : { ...defaultAlphaSummary });
      } else {
        message.error(response.error || '알파 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('알파 삭제 실패:', error);
      message.error('알파 삭제에 실패했습니다.');
    }
  };

  const handleEditAlpha = (alpha: StoredAlpha) => {
    setEditingAlpha(alpha);
    alphaForm.setFieldsValue({
      name: alpha.name,
      expression: alpha.expression || alpha.metadata?.expression || '',
      description: alpha.description || '',
      tags: alpha.tags || [],
      fitness: alpha.metadata?.fitness ?? undefined,
    });
    setIsAlphaModalVisible(true);
  };

  const handleAddAlpha = () => {
    setEditingAlpha(null);
    alphaForm.resetFields();
    setIsAlphaModalVisible(true);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

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

          // 거래 내역 로드 (알파 관리에서는 사용하지 않음)
          // const transactionResponse = await fetch('/api/csv/user/transactions', {
          //   credentials: 'include'
          // });

          // if (transactionResponse.ok) {
          //   const transactionResult = await transactionResponse.json();
          //   setTransactionData(transactionResult.transactions || []);
          // }

          // 자산 데이터 설정
          const totalAssets = parseFloat(investment.total_assets) || 0;
          const cash = parseFloat(investment.cash) || 0;
          const stocks = parseFloat(investment.stock_value) || 0;

          // 변동 데이터 계산 (실제로는 백엔드에서 계산되어야 함)
          // 임시로 하드코딩된 변동 데이터 사용
          setDashboardData({
            cash,
            stocks,
            total: totalAssets,
            changes: {
              cash: -150000,
              cash_percent: -0.6,
              stocks: 9256265,
              stocks_percent: 28.8,
            },
          });
        }
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    loadAlphas(); // 알파 데이터 로드
  }, [user, loadAlphas]);

  // 도넛 차트 데이터 (실제 데이터 기반)
  const doughnutData = {
    labels: ['주식', '현금'],
    datasets: [
      {
        data: [
          dashboardData.total > 0 ? (dashboardData.stocks / dashboardData.total) * 100 : 0,
          dashboardData.total > 0 ? (dashboardData.cash / dashboardData.total) * 100 : 0
        ],
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

  const renderAlphaManagement = () => {
    const sortedPrivate = [...privateAlphas].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
    const combinedAlphas = [...sortedPrivate, ...sharedAlphas];

    return (
      <>
        {/* 알파 관리 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
        <div>
          <h2 style={{ margin: 0, color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.h2, fontWeight: 600 }}>
            알파 관리
          </h2>
          <p style={{ margin: `${theme.spacing.sm} 0 0 0`, color: theme.colors.textSecondary }}>
            공용 알파와 개인 알파를 관리하세요
          </p>
        </div>
        <GlassButton
          variant="primary"
          icon={<PlusOutlined />}
          onClick={handleAddAlpha}
        >
          새 알파 추가
        </GlassButton>
      </div>

      <CardsGrid>
        {/* 공용 알파 섹션 */}
        <ChartCard>
          <ChartTitle style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <ThunderboltOutlined style={{ color: theme.colors.accentGold }} />
            공용 알파 라이브러리
          </ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{
              padding: theme.spacing.lg,
              background: theme.colors.liquidGlass,
              border: `1px solid ${theme.colors.liquidGlassBorder}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.body, marginBottom: theme.spacing.sm }}>
                저장된 공용 알파
              </div>
              <div style={{ color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.h3, fontWeight: 600 }}>
                {sharedAlphas.length}개 사용 가능
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: theme.spacing.sm,
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {sharedAlphas
                .slice(0, 20)
                .map(alpha => (
                  <Tag key={alpha.id} color="gold" style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {alpha.name}
                  </Tag>
                ))}
              {sharedAlphas.length > 20 && (
                <Tag color="default" style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '12px'
                }}>
                  +{sharedAlphas.length - 20}개 더
                </Tag>
              )}
            </div>
          </div>
        </ChartCard>

        {/* 개인 알파 섹션 */}
        <ChartCard>
          <ChartTitle style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <EyeOutlined style={{ color: theme.colors.accentPrimary }} />
            내 알파 컬렉션
          </ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{
              padding: theme.spacing.lg,
              background: theme.colors.liquidGoldGradient,
              border: `1px solid ${theme.colors.liquidGoldBorder}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.body, marginBottom: theme.spacing.sm, fontWeight: 600 }}>
                저장된 개인 알파
              </div>
              <div style={{ color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.h3, fontWeight: 700 }}>
                {alphaSummary.private_count || privateAlphas.length}개
              </div>
            </div>
          </div>
        </ChartCard>
      </CardsGrid>

      {/* 알파 목록 */}
      <ChartCard>
        <ChartTitle>알파 목록</ChartTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {alphaLoading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              알파 목록을 불러오는 중...
            </div>
          ) : combinedAlphas.length > 0 ? (
            combinedAlphas.map(alpha => {
              const fitnessValue =
                typeof alpha.metadata?.fitness === 'number'
                  ? Number(alpha.metadata?.fitness)
                  : null;
              const tags = Array.isArray(alpha.tags) ? alpha.tags : [];
              const expressionDisplay =
                alpha.expression ||
                alpha.metadata?.expression ||
                alpha.metadata?.python_source ||
                '수식 정보 없음';

              return (
                <div key={alpha.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: theme.spacing.lg,
                  background: alpha.source === 'private' ? theme.colors.liquidGoldGradient : theme.colors.liquidGlass,
                  border: `1px solid ${alpha.source === 'private' ? theme.colors.liquidGoldBorder : theme.colors.liquidGlassBorder}`,
                  borderRadius: '12px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                      <span style={{
                        color: theme.colors.textPrimary,
                        fontWeight: 600,
                        fontSize: theme.typography.fontSize.body
                      }}>
                        {alpha.name}
                      </span>
                      <Tag color={alpha.source === 'private' ? 'gold' : 'blue'}>
                        {alpha.source === 'private' ? '개인' : '공용'}
                      </Tag>
                      {fitnessValue !== null && Number.isFinite(fitnessValue) && (
                        <Tag color="green">
                          적합도: {fitnessValue.toFixed(3)}
                        </Tag>
                      )}
                    </div>
                    <div style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.caption,
                      marginBottom: theme.spacing.sm
                    }}>
                      {alpha.description || '설명이 없습니다.'}
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: theme.typography.fontSize.caption,
                      color: theme.colors.accentGold,
                      background: theme.colors.backgroundTertiary,
                      padding: theme.spacing.sm,
                      borderRadius: '6px',
                      maxWidth: '400px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      wordBreak: 'break-all'
                    }}>
                      {expressionDisplay}
                    </div>
                    {tags.length > 0 && (
                      <div style={{ marginTop: theme.spacing.sm, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {tags.map((tag, idx) => (
                          <Tag key={idx} style={{ fontSize: '11px' }}>
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  {alpha.source === 'private' && (
                    <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                      <Tooltip title="편집">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => handleEditAlpha(alpha)}
                          style={{ color: theme.colors.textSecondary }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="알파 삭제"
                        description="정말로 이 알파를 삭제하시겠습니까?"
                        onConfirm={() => handleDeleteAlpha(alpha.id)}
                        okText="삭제"
                        cancelText="취소"
                      >
                        <Tooltip title="삭제">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              <ThunderboltOutlined style={{ fontSize: '48px', marginBottom: theme.spacing.md, opacity: 0.5 }} />
              <div>아직 알파가 없습니다</div>
              <div style={{ fontSize: theme.typography.fontSize.caption, marginTop: theme.spacing.sm }}>
                새 알파를 추가하거나 공용 알파를 활용해보세요
              </div>
            </div>
          )}
        </div>
      </ChartCard>
      </>
    );
  };

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
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              주식 데이터를 불러오는 중...
            </div>
          ) : portfolioData.length > 0 ? (
            portfolioData.map((stock, idx) => {
              const totalValue = stock.quantity * stock.current_price;
              const profitLoss = ((stock.current_price - stock.avg_price) / stock.avg_price) * 100;

              return (
                <StockListItem key={idx}>
                  <div>
                    <div style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{stock.company_name}</div>
                    <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>{stock.ticker}</div>
                  </div>
                  <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.body }}>{stock.quantity}주</span>
                  <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.body }}>{Number(stock.avg_price).toLocaleString()}원</span>
                  <span style={{ textAlign: 'right', color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>{totalValue.toLocaleString()}원</span>
                  <span style={{ textAlign: 'right', color: profitLoss >= 0 ? theme.colors.accentGold : theme.colors.textSecondary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>
                    {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}%
                  </span>
                </StockListItem>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              보유 주식이 없습니다
            </div>
          )}
        </div>
      </ChartCard>

      <ChartsContainer>
        <ChartCard>
          <ChartTitle>섹터별 분포</ChartTitle>
          <DoughnutWrapper>
            <Doughnut
              data={(() => {
                if (portfolioData.length === 0) {
                  return {
                    labels: ['데이터 없음'],
                    datasets: [{
                      data: [100],
                      backgroundColor: ['rgba(154, 160, 166, 0.5)'],
                      borderColor: ['rgba(95, 99, 104, 0.5)'],
                      borderWidth: 2,
                    }],
                  };
                }

                // 섹터별 데이터 집계
                const sectorData = portfolioData.reduce<Record<string, number>>((acc, stock) => {
                  const sector = stock.sector || '기타';
                  const value = stock.quantity * stock.current_price;
                  acc[sector] = (acc[sector] ?? 0) + value;
                  return acc;
                }, {} as Record<string, number>);

                const totalValue = Object.values(sectorData).reduce((sum, value) => sum + value, 0);
                const sectors = Object.keys(sectorData);
                const safeTotalValue = totalValue === 0 ? 1 : totalValue;
                const percentages = sectors.map(sector => (sectorData[sector] / safeTotalValue) * 100);

                return {
                  labels: sectors,
                  datasets: [{
                    data: percentages,
                    backgroundColor: [
                      'rgba(212, 175, 55, 0.9)',
                      'rgba(184, 134, 11, 0.7)',
                      'rgba(232, 234, 237, 0.6)',
                      'rgba(154, 160, 166, 0.5)',
                      'rgba(107, 114, 128, 0.4)',
                    ].slice(0, sectors.length),
                    borderColor: [
                      'rgba(184, 134, 11, 1)',
                      'rgba(160, 120, 8, 1)',
                      'rgba(255, 255, 255, 0.3)',
                      'rgba(95, 99, 104, 0.5)',
                      'rgba(75, 85, 99, 0.5)',
                    ].slice(0, sectors.length),
                    borderWidth: 2,
                  }],
                };
              })()}
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
            {loading ? (
              <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
                매매 내역을 불러오는 중...
              </div>
            ) : portfolioData.length > 0 ? (
              // 포트폴리오 구매 날짜를 매매 내역으로 표시
              portfolioData
                .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
                .slice(0, 5)
                .map((stock, idx) => (
                  <TransactionItem key={idx}>
                    <div>
                      <div style={{ color: theme.colors.textPrimary, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>
                        {stock.company_name} 매수
                      </div>
                      <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>
                        {new Date(stock.purchase_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: theme.colors.accentGold, fontWeight: 600, fontSize: theme.typography.fontSize.body }}>
                        {stock.quantity}주 @ {Number(stock.avg_price).toLocaleString()}원
                      </div>
                      <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.caption }}>
                        {(stock.quantity * stock.avg_price).toLocaleString()}원
                      </div>
                    </div>
                  </TransactionItem>
                ))
            ) : (
              <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
                매매 내역이 없습니다
              </div>
            )}
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
          알파 관리
        </DynamicIslandButton>
        <DynamicIslandButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          보유 주식 관리
        </DynamicIslandButton>
      </DynamicIslandNav>

      <TabContent>
        {activeTab === 0 && renderAssetOverview()}
        {activeTab === 1 && renderAlphaManagement()}
        {activeTab === 2 && renderStockManagement()}
      </TabContent>

      {/* 알파 추가/수정 모달 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <ThunderboltOutlined style={{ color: theme.colors.accentGold }} />
            {editingAlpha ? '알파 수정' : '새 알파 추가'}
          </div>
        }
        open={isAlphaModalVisible}
        onCancel={() => {
          setIsAlphaModalVisible(false);
          alphaForm.resetFields();
        }}
        footer={null}
        width={600}
        centered
        bodyStyle={{
          background: theme.colors.backgroundSecondary,
          borderRadius: '16px',
        }}
      >
        <Form
          form={alphaForm}
          layout="vertical"
          onFinish={handleSaveAlpha}
          style={{ marginTop: theme.spacing.lg }}
        >
          <Form.Item
            name="name"
            label="알파 이름"
            rules={[
              { required: true, message: '알파 이름을 입력해주세요' },
              { min: 2, message: '알파 이름은 최소 2자 이상이어야 합니다' }
            ]}
          >
            <Input
              placeholder="예: 모멘텀 전략, 가치 투자"
              style={{
                background: theme.colors.liquidGlass,
                border: `1px solid ${theme.colors.liquidGlassBorder}`,
                borderRadius: '8px',
                color: theme.colors.textPrimary,
              }}
            />
          </Form.Item>

          <Form.Item
            name="expression"
            label="알파 표현식"
            rules={[
              { required: true, message: '알파 표현식을 입력해주세요' },
              {
                pattern: /^[a-zA-Z0-9\s_(),\-+*/.]+$/,
                message: '올바른 표현식을 입력해주세요'
              }
            ]}
            help="예: ts_rank(close, 20), sma(volume, 10) 등"
          >
            <Input.TextArea
              rows={3}
              placeholder="ts_rank(close, 20), sma(volume, 10) 등"
              style={{
                background: theme.colors.liquidGlass,
                border: `1px solid ${theme.colors.liquidGlassBorder}`,
                borderRadius: '8px',
                color: theme.colors.textPrimary,
                fontFamily: 'monospace',
              }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <Input.TextArea
              rows={2}
              placeholder="이 알파에 대한 설명을 입력하세요"
              style={{
                background: theme.colors.liquidGlass,
                border: `1px solid ${theme.colors.liquidGlassBorder}`,
                borderRadius: '8px',
                color: theme.colors.textPrimary,
              }}
            />
          </Form.Item>

          <Form.Item
            name="fitness"
            label="적합도 (선택사항)"
            help="GA에서 계산된 적합도 값 (0.0 ~ 1.0)"
          >
            <Input
              type="number"
              min={0}
              max={1}
              step={0.001}
              placeholder="0.85"
              style={{
                background: theme.colors.liquidGlass,
                border: `1px solid ${theme.colors.liquidGlassBorder}`,
                borderRadius: '8px',
                color: theme.colors.textPrimary,
              }}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="태그 (선택사항)"
            help="쉼표로 구분하여 입력하세요"
          >
            <Select
              mode="tags"
              placeholder="태그를 입력하세요 (예: 모멘텀, 가치, 기술적)"
              style={{
                background: theme.colors.liquidGlass,
                borderRadius: '8px',
              }}
              dropdownStyle={{
                background: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
              }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end', marginTop: theme.spacing.xl }}>
            <GlassButton
              variant="secondary"
              onClick={() => {
                setIsAlphaModalVisible(false);
                alphaForm.resetFields();
              }}
            >
              취소
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => alphaForm.submit()}
            >
              {editingAlpha ? '수정' : '추가'}
            </GlassButton>
          </div>
        </Form>
      </Modal>
    </DashboardContainer>
  );
};
