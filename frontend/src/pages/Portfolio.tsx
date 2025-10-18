import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Table, message, Modal } from 'antd';
import {
  FundOutlined,
  PlusOutlined,
  FallOutlined,
  RiseOutlined,
  StockOutlined,
} from '@ant-design/icons';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { theme } from '../styles/theme';
import type { PortfolioStock, InvestmentData } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 700;
`;

const PortfolioGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${theme.spacing.lg};
`;

const MetricCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricTitle = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricIcon = styled.div<{ $color: string }>`
  color: ${(props: { $color: string }) => props.$color};
  font-size: 24px;
`;

const MetricValue = styled.div`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  font-family: ${theme.typography.fontFamily.display};
`;

const MetricChange = styled.div<{ $positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${(props: { $positive: boolean }) =>
    props.$positive ? theme.colors.success : theme.colors.error};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
`;

const FormSection = styled(GlassCard)`
  margin-bottom: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  align-items: end;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
`;

const TableContainer = styled(GlassCard)`
  .ant-table {
    background: transparent !important;
  }
  
  .ant-table-thead > tr > th {
    background: ${theme.colors.liquidGlass} !important;
    border-bottom: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.textSecondary} !important;
    font-weight: 600;
  }
  
  .ant-table-tbody > tr > td {
    background: transparent !important;
    border-bottom: 1px solid ${theme.colors.liquidGlassBorder} !important;
    color: ${theme.colors.textPrimary} !important;
  }
  
  .ant-table-tbody > tr:hover > td {
    background: ${theme.colors.liquidGlassHover} !important;
  }
`;

const DangerButton = styled.button`
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.error};
  color: ${theme.colors.error};
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.08);
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const formInitialState = {
  ticker: '',
  companyName: '',
  quantity: '',
  price: '',
  currentPrice: '',
  sector: '',
};

const normalizePortfolio = (items: any[]): PortfolioStock[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    avg_price: Number(item.avg_price) || 0,
    current_price: Number(item.current_price) || 0,
  }));
};

const normalizeInvestment = (data: any): InvestmentData | null => {
  if (!data) return null;
  return {
    user_id: data.user_id,
    total_assets: Number(data.total_assets) || 0,
    cash: Number(data.cash) || 0,
    stock_value: Number(data.stock_value) || 0,
    updated_at: data.updated_at,
  };
};

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('ko-KR')} 원`;

const formatNumber = (value: number, fractionDigits = 2) =>
  value.toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<PortfolioStock | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [formState, setFormState] = useState(formInitialState);

  const loadPortfolioData = useCallback(async () => {
    setLoading(true);
    try {
      const [portfolioRes, investmentRes] = await Promise.all([
        fetch('/api/csv/user/portfolio', { credentials: 'include' }),
        fetch('/api/csv/user/investment', { credentials: 'include' }),
      ]);

      if (portfolioRes.ok) {
        const portfolioJson = await portfolioRes.json();
        setPortfolio(normalizePortfolio(portfolioJson.portfolio || []));
      }

      if (investmentRes.ok) {
        const investmentJson = await investmentRes.json();
        const normalized = normalizeInvestment(investmentJson.investment_data);
        if (normalized) {
          setInvestmentData(normalized);
        }
      }
    } catch (error) {
      console.error('포트폴리오 데이터 로드 실패:', error);
      message.error('포트폴리오 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  const totalCost = useMemo(
    () =>
      portfolio.reduce(
        (sum, item) => sum + (Number(item.avg_price) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [portfolio]
  );

  const portfolioValue = useMemo(
    () =>
      portfolio.reduce(
        (sum, item) =>
          sum + (Number(item.current_price) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [portfolio]
  );

  const unrealizedProfit = portfolioValue - totalCost;
  const unrealizedPercent = totalCost > 0 ? (unrealizedProfit / totalCost) * 100 : 0;

  const handleFormChange = (field: keyof typeof formInitialState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleAddStock = async () => {
    if (adding) return;

    const ticker = formState.ticker.trim().toUpperCase();
    const quantity = Number(formState.quantity);
    const price = Number(formState.price);
    const currentPrice = formState.currentPrice
      ? Number(formState.currentPrice)
      : price;

    if (!ticker || Number.isNaN(quantity) || Number.isNaN(price) || quantity <= 0 || price <= 0) {
      message.error('유효한 종목 코드, 수량, 가격을 입력해주세요.');
      return;
    }

    if (!investmentData) {
      message.error('투자 데이터가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const tradeAmount = quantity * price;
    if (investmentData.cash < tradeAmount) {
      message.error('보유 현금이 부족합니다.');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/csv/user/portfolio/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticker,
          company_name: formState.companyName || ticker,
          quantity,
          price,
          current_price: currentPrice,
          sector: formState.sector,
          note: '포트폴리오 페이지에서 수동 추가',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '포트폴리오 추가에 실패했습니다.');
      }

      setPortfolio(normalizePortfolio(result.portfolio || []));
      const normalizedInvestment = normalizeInvestment(result.investment);
      if (normalizedInvestment) {
        setInvestmentData(normalizedInvestment);
      }

      setFormState(formInitialState);
      message.success(result.message || '종목이 추가되었습니다.');
    } catch (error) {
      console.error('포트폴리오 추가 실패:', error);
      message.error(error instanceof Error ? error.message : '포트폴리오 추가에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const openSellModal = (stock: PortfolioStock) => {
    setSelectedStock(stock);
    setSellQuantity(Number(stock.quantity) || 0);
    setSellPrice(Number(stock.current_price) || 0);
    setSellModalVisible(true);
  };

  const handleSell = async () => {
    if (!selectedStock || sellLoading) return;

    if (sellQuantity <= 0) {
      message.error('매도 수량을 입력해주세요.');
      return;
    }

    if (sellQuantity > selectedStock.quantity) {
      message.error('보유 수량을 초과할 수 없습니다.');
      return;
    }

    if (sellPrice <= 0) {
      message.error('매도 가격을 입력해주세요.');
      return;
    }

    setSellLoading(true);
    try {
      const response = await fetch('/api/csv/user/portfolio/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticker: selectedStock.ticker,
          quantity: sellQuantity,
          price: sellPrice,
          note: '포트폴리오 페이지에서 수동 매도',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '매도 처리에 실패했습니다.');
      }

      const updatedPortfolio = normalizePortfolio(result.portfolio || []);
      setPortfolio(updatedPortfolio);
      const normalizedInvestment = normalizeInvestment(result.investment);
      if (normalizedInvestment) {
        setInvestmentData(normalizedInvestment);
      }

      const remaining = updatedPortfolio.find(item => item.ticker === selectedStock.ticker)?.quantity || 0;
      const successMessage = result.message || (remaining > 0
        ? `매도가 완료되었습니다. 남은 수량: ${formatNumber(remaining, 0)}주`
        : '매도가 완료되었습니다. 보유 목록에서 제거되었습니다.');

      message.success(successMessage);
      setSellModalVisible(false);
      setSelectedStock(null);
    } catch (error) {
      console.error('포트폴리오 매도 실패:', error);
      message.error(error instanceof Error ? error.message : '매도 처리에 실패했습니다.');
    } finally {
      setSellLoading(false);
    }
  };

  const columns = [
    {
      title: '종목',
      dataIndex: 'ticker',
      key: 'ticker',
      render: (_: string, record: PortfolioStock) => (
        <div>
          <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>
            {record.company_name || record.ticker}
          </div>
          <div style={{ fontSize: '0.8rem', color: theme.colors.textSecondary }}>
            {record.ticker}
          </div>
        </div>
      ),
    },
    {
      title: '보유 수량',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (quantity: number) => `${formatNumber(quantity, 0)}주`,
    },
    {
      title: '평균 매수가',
      dataIndex: 'avg_price',
      key: 'avg_price',
      align: 'right' as const,
      render: (price: number) => formatCurrency(price),
    },
    {
      title: '현재가',
      dataIndex: 'current_price',
      key: 'current_price',
      align: 'right' as const,
      render: (price: number) => formatCurrency(price),
    },
    {
      title: '평가 금액',
      key: 'valuation',
      align: 'right' as const,
      render: (_: any, record: PortfolioStock) =>
        formatCurrency((Number(record.current_price) || 0) * (Number(record.quantity) || 0)),
    },
    {
      title: '평가 손익',
      key: 'profit',
      align: 'right' as const,
      render: (_: any, record: PortfolioStock) => {
        const qty = Number(record.quantity) || 0;
        const profit = (Number(record.current_price) - Number(record.avg_price)) * qty;
        const color = profit >= 0 ? theme.colors.success : theme.colors.error;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {profit >= 0 ? '+' : ''}
            {formatCurrency(profit)}
          </span>
        );
      },
    },
    {
      title: '수익률',
      key: 'return',
      align: 'right' as const,
      render: (_: any, record: PortfolioStock) => {
        const profitPercent =
          Number(record.avg_price) > 0
            ? ((Number(record.current_price) - Number(record.avg_price)) / Number(record.avg_price)) * 100
            : 0;
        const color = profitPercent >= 0 ? theme.colors.success : theme.colors.error;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {profitPercent >= 0 ? '+' : ''}
            {formatNumber(profitPercent)}%
          </span>
        );
      },
    },
    {
      title: '섹터',
      dataIndex: 'sector',
      key: 'sector',
      align: 'center' as const,
      render: (sector?: string) => sector || '기타',
    },
    {
      title: '액션',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: PortfolioStock) => (
        <DangerButton onClick={() => openSellModal(record)}>
          <FallOutlined />
          매도
        </DangerButton>
      ),
    },
  ];

  return (
    <Container>
      <Title>포트폴리오 관리</Title>

      <PortfolioGrid>
        <MetricCard>
          <MetricHeader>
            <MetricTitle>총 평가금액</MetricTitle>
            <MetricIcon $color={theme.colors.accentGold}>
              <FundOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{formatCurrency(portfolioValue)}</MetricValue>
          <MetricChange $positive={unrealizedProfit >= 0}>
            {unrealizedProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {unrealizedProfit >= 0 ? '+' : ''}
            {formatCurrency(unrealizedProfit)}
            ({unrealizedProfit >= 0 ? '+' : ''}
            {formatNumber(unrealizedPercent)}%)
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>보유 현금</MetricTitle>
            <MetricIcon $color={theme.colors.info}>
              <StockOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>
            {formatCurrency(investmentData?.cash ?? 0)}
          </MetricValue>
          <MetricChange $positive={(investmentData?.cash ?? 0) >= 0}>
            {(investmentData?.cash ?? 0) >= 0 ? '+' : ''}
            {formatCurrency(investmentData?.cash ?? 0)}
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>총 자산</MetricTitle>
            <MetricIcon $color={theme.colors.accentPrimary}>
              <FundOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>
            {formatCurrency(investmentData?.total_assets ?? portfolioValue)}
          </MetricValue>
          <MetricChange $positive>
            평가 + 현금 기준
          </MetricChange>
        </MetricCard>
      </PortfolioGrid>

      <FormSection>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <h3 style={{ color: theme.colors.textPrimary, margin: 0 }}>종목 추가</h3>
          <p style={{ color: theme.colors.textSecondary, margin: 0 }}>
            새로 편입할 종목의 기본 정보를 입력하면 즉시 포트폴리오와 투자 요약이 갱신됩니다.
          </p>
        </div>

        <FormGrid>
          <FormGroup>
            <Label>종목 코드</Label>
            <GlassInput
              value={formState.ticker}
              onChange={handleFormChange('ticker')}
              placeholder="예: AAPL"
            />
          </FormGroup>
          <FormGroup>
            <Label>회사명</Label>
            <GlassInput
              value={formState.companyName}
              onChange={handleFormChange('companyName')}
              placeholder="예: Apple Inc."
            />
          </FormGroup>
          <FormGroup>
            <Label>보유 수량</Label>
            <GlassInput
              type="number"
              value={formState.quantity}
              onChange={handleFormChange('quantity')}
              placeholder="예: 10"
            />
          </FormGroup>
          <FormGroup>
            <Label>매수가 (원)</Label>
            <GlassInput
              type="number"
              value={formState.price}
              onChange={handleFormChange('price')}
              placeholder="예: 15000"
            />
          </FormGroup>
          <FormGroup>
            <Label>현재가 (원)</Label>
            <GlassInput
              type="number"
              value={formState.currentPrice}
              onChange={handleFormChange('currentPrice')}
              placeholder="미입력 시 매수가로 저장"
            />
          </FormGroup>
          <FormGroup>
            <Label>섹터</Label>
            <GlassInput
              value={formState.sector}
              onChange={handleFormChange('sector')}
              placeholder="예: 테크놀로지"
            />
          </FormGroup>
          <GlassButton
            variant="primary"
            onClick={handleAddStock}
            icon={<PlusOutlined />}
            loading={adding}
          >
            종목 추가
          </GlassButton>
        </FormGrid>
      </FormSection>

      <TableContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <h3 style={{ color: theme.colors.textPrimary, margin: 0 }}>포트폴리오 구성</h3>
          <span style={{ color: theme.colors.textSecondary }}>
            총 {portfolio.length}개 종목 · 평가금액 {formatCurrency(portfolioValue)}
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={portfolio}
          rowKey="portfolio_id"
          pagination={false}
          loading={loading}
          size="middle"
        />
      </TableContainer>

      <Modal
        title={selectedStock ? `${selectedStock.company_name || selectedStock.ticker} 매도` : '매도'}
        open={sellModalVisible}
        onCancel={() => {
          setSellModalVisible(false);
          setSelectedStock(null);
        }}
        onOk={handleSell}
        okText="매도 확정"
        cancelText="취소"
        confirmLoading={sellLoading}
        okButtonProps={{
          style: {
            background: theme.colors.error,
            borderColor: theme.colors.error,
          },
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <FormGroup>
            <Label>매도 수량</Label>
            <GlassInput
              type="number"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(Number(e.target.value))}
              placeholder="매도할 수량을 입력하세요"
            />
          </FormGroup>
          <FormGroup>
            <Label>매도 단가 (원)</Label>
            <GlassInput
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              placeholder="매도 단가를 입력하세요"
            />
          </FormGroup>
          {selectedStock && (
            <p style={{ color: theme.colors.textSecondary, margin: 0, fontSize: theme.typography.fontSize.caption }}>
              보유 수량 {formatNumber(selectedStock.quantity, 0)}주 · 평균 매수가 {formatCurrency(selectedStock.avg_price)}
            </p>
          )}
        </div>
      </Modal>
    </Container>
  );
};
