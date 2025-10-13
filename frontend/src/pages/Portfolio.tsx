import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { Table, message } from 'antd';
import { 
  FundOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { theme } from '../styles/theme';

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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
  color: ${(props: { $positive: boolean }) => props.$positive ? theme.colors.success : theme.colors.error};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
`;

const FormSection = styled(GlassCard)`
  margin-bottom: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
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

const DeleteButton = styled.button`
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.error};
  color: ${theme.colors.error};
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  weight: number;
  price: number;
  change: number;
  value: number;
}

export const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newWeight, setNewWeight] = useState(0);

  // Mock 데이터
  useEffect(() => {
    setPortfolio([
      {
        id: '1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        weight: 0.25,
        price: 175.43,
        change: 2.34,
        value: 125000
      },
      {
        id: '2',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        weight: 0.20,
        price: 378.85,
        change: -1.23,
        value: 100000
      },
      {
        id: '3',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        weight: 0.15,
        price: 142.56,
        change: 0.87,
        value: 75000
      },
      {
        id: '4',
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        weight: 0.10,
        price: 155.12,
        change: -0.45,
        value: 50000
      },
      {
        id: '5',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        weight: 0.30,
        price: 248.50,
        change: 3.21,
        value: 150000
      }
    ]);
  }, []);

  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const totalChange = portfolio.reduce((sum, item) => sum + (item.change * item.value / 100), 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

  const handleAddStock = () => {
    if (!newSymbol || newWeight <= 0) {
      message.error('종목 코드와 비중을 입력해주세요');
      return;
    }

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      symbol: newSymbol.toUpperCase(),
      name: `${newSymbol} Corp.`,
      weight: newWeight / 100,
      price: Math.random() * 200 + 50,
      change: (Math.random() - 0.5) * 10,
      value: (newWeight / 100) * totalValue
    };

    setPortfolio([...portfolio, newItem]);
    setNewSymbol('');
    setNewWeight(0);
    message.success('종목이 추가되었습니다');
  };

  const handleDeleteStock = (id: string) => {
    setPortfolio(portfolio.filter(item => item.id !== id));
    message.success('종목이 삭제되었습니다');
  };

  const columns = [
    {
      title: '종목',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string, record: PortfolioItem) => (
        <div>
          <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{symbol}</div>
          <div style={{ fontSize: '0.8rem', color: theme.colors.textSecondary }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: '비중',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => `${(weight * 100).toFixed(1)}%`,
    },
    {
      title: '가격',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '변동',
      dataIndex: 'change',
      key: 'change',
      render: (change: number) => (
        <div style={{ 
          color: change >= 0 ? theme.colors.success : theme.colors.error,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {change >= 0 ? <RiseOutlined /> : <FallOutlined />}
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      ),
    },
    {
      title: '가치',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => `$${(value / 1000).toFixed(0)}K`,
    },
    {
      title: '액션',
      key: 'action',
      render: (_: any, record: PortfolioItem) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <GlassButton
            onClick={() => {
              // 편집 기능은 추후 구현
              message.info('편집 기능은 추후 구현 예정입니다');
            }}
            icon={<EditOutlined />}
          >
            편집
          </GlassButton>
          <DeleteButton
            onClick={() => handleDeleteStock(record.id)}
          >
            <DeleteOutlined />
            삭제
          </DeleteButton>
        </div>
      ),
    },
  ];

  return (
    <Container>
      <Title>포트폴리오 관리</Title>
      
      <PortfolioGrid>
        <MetricCard>
          <MetricHeader>
            <MetricTitle>총 가치</MetricTitle>
            <MetricIcon $color={theme.colors.accentGold}>
              <FundOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>${(totalValue / 1000000).toFixed(2)}M</MetricValue>
          <MetricChange $positive={totalChangePercent >= 0}>
            {totalChangePercent >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>보유 종목</MetricTitle>
            <MetricIcon $color={theme.colors.info}>
              📊
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{portfolio.length}</MetricValue>
          <MetricChange $positive={true}>
            <span>종목</span>
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>일일 손익</MetricTitle>
            <MetricIcon $color={totalChange >= 0 ? theme.colors.success : theme.colors.error}>
              {totalChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
            </MetricIcon>
          </MetricHeader>
          <MetricValue>${(totalChange / 1000).toFixed(1)}K</MetricValue>
          <MetricChange $positive={totalChange >= 0}>
            {totalChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%
          </MetricChange>
        </MetricCard>
      </PortfolioGrid>

      <FormSection>
        <h3 style={{ color: theme.colors.textPrimary, marginBottom: theme.spacing.lg }}>종목 추가</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: theme.spacing.md, alignItems: 'end' }}>
          <FormGroup>
            <Label>종목 코드</Label>
            <GlassInput
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="예: AAPL, MSFT"
            />
          </FormGroup>
          <FormGroup>
            <Label>비중 (%)</Label>
            <GlassInput
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(Number(e.target.value))}
              placeholder="예: 25"
            />
          </FormGroup>
          <GlassButton
            variant="primary"
            onClick={handleAddStock}
            icon={<PlusOutlined />}
          >
            추가
          </GlassButton>
        </div>
      </FormSection>

      <TableContainer>
        <h3 style={{ color: theme.colors.textPrimary, marginBottom: theme.spacing.lg }}>포트폴리오 구성</h3>
        <Table
          columns={columns}
          dataSource={portfolio}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </TableContainer>
    </Container>
  );
};

