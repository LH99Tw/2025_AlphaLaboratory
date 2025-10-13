import React, { useState } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { Select, DatePicker, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { theme } from '../styles/theme';
import { runBacktest, getBacktestStatus } from '../services/api';
import type { BacktestParams, BacktestStatus } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const BacktestContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  height: calc(100vh - 150px);
`;

const LeftPanel = styled.div`
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const RightPanel = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.md} 0;
  font-weight: 700;
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

const StyledSelect = styled(Select)`
  .ant-select-selector {
    background: ${theme.colors.liquidGlass} !important;
    border: 1px solid ${theme.colors.liquidGlassBorder} !important;
    color: ${theme.colors.textPrimary} !important;
  }

  .ant-select-selection-item {
    color: ${theme.colors.textPrimary} !important;
  }
`;

const StyledRangePicker = styled(RangePicker)`
  background: ${theme.colors.liquidGlass} !important;
  border: 1px solid ${theme.colors.liquidGlassBorder} !important;
  
  input {
    color: ${theme.colors.textPrimary} !important;
  }
`;

const ResultCard = styled(GlassCard)`
  margin-bottom: ${theme.spacing.lg};
`;

const ResultTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.lg} 0;
  font-weight: 600;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.md} 0;
  border-bottom: 1px solid ${theme.colors.liquidGlassBorder};

  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  color: ${theme.colors.textSecondary};
`;

const MetricValue = styled.span<{ $positive?: boolean }>`
  color: ${(props: { $positive?: boolean }) => 
    props.$positive !== undefined 
      ? (props.$positive ? theme.colors.success : theme.colors.error)
      : theme.colors.textPrimary
  };
  font-weight: 600;
  font-family: ${theme.typography.fontFamily.display};
`;

export const Backtest: React.FC = () => {
  const [params, setParams] = useState<BacktestParams>({
    start_date: '2020-01-01',
    end_date: '2024-12-31',
    factors: [],
    rebalancing_frequency: 'weekly',
    transaction_cost: 0.001,
    quantile: 0.1,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestStatus | null>(null);

  const handleRunBacktest = async () => {
    if (params.factors.length === 0) {
      message.error('알파 팩터를 선택해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await runBacktest(params);
      if (response.success && response.data?.task_id) {
        message.success('백테스트가 시작되었습니다');
        pollBacktestStatus(response.data.task_id);
      }
    } catch (error) {
      message.error('백테스트 실행 중 오류가 발생했습니다');
      setLoading(false);
    }
  };

  const pollBacktestStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getBacktestStatus(taskId);
        if (status.status === 'completed') {
          setResults(status);
          setLoading(false);
          clearInterval(interval);
          message.success('백테스트가 완료되었습니다');
        } else if (status.status === 'failed') {
          setLoading(false);
          clearInterval(interval);
          message.error('백테스트가 실패했습니다');
        }
      } catch (error) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <BacktestContainer>
      <LeftPanel>
        <Title>백테스트</Title>

        <GlassCard>
          <FormGroup>
            <Label>알파 팩터</Label>
            <StyledSelect
              mode="multiple"
              placeholder="알파 팩터 선택"
              value={params.factors}
              onChange={(value) => setParams({ ...params, factors: value as string[] })}
              options={[
                { value: 'alpha001', label: 'Alpha 001' },
                { value: 'alpha002', label: 'Alpha 002' },
                { value: 'alpha003', label: 'Alpha 003' },
                { value: 'alpha004', label: 'Alpha 004' },
              ]}
            />
          </FormGroup>

          <FormGroup>
            <Label>기간</Label>
            <StyledRangePicker
              value={[
                dayjs(params.start_date),
                dayjs(params.end_date)
              ]}
              onChange={(dates: any) => {
                if (dates) {
                  setParams({
                    ...params,
                    start_date: dates[0]?.format('YYYY-MM-DD') || '',
                    end_date: dates[1]?.format('YYYY-MM-DD') || '',
                  });
                }
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>리밸런싱 주기</Label>
            <StyledSelect
              value={params.rebalancing_frequency}
              onChange={(value) => setParams({ ...params, rebalancing_frequency: value as 'daily' | 'weekly' | 'monthly' | 'quarterly' })}
              options={[
                { value: 'daily', label: '일간' },
                { value: 'weekly', label: '주간' },
                { value: 'monthly', label: '월간' },
                { value: 'quarterly', label: '분기' },
              ]}
            />
          </FormGroup>

          <FormGroup>
            <Label>거래비용 (%)</Label>
            <GlassInput
              type="number"
              value={params.transaction_cost * 100}
              onChange={(e) => setParams({ 
                ...params, 
                transaction_cost: Number(e.target.value) / 100 
              })}
            />
          </FormGroup>

          <FormGroup>
            <Label>분위수</Label>
            <GlassInput
              type="number"
              value={params.quantile}
              onChange={(e) => setParams({ 
                ...params, 
                quantile: Number(e.target.value) 
              })}
            />
          </FormGroup>

          <GlassButton
            variant="primary"
            onClick={handleRunBacktest}
            loading={loading}
            icon={<PlayCircleOutlined />}
          >
            백테스트 실행
          </GlassButton>
        </GlassCard>
      </LeftPanel>

      <RightPanel>
        {results && results.results && (
          <>
            {Object.entries(results.results).map(([factor, result]) => (
              <ResultCard key={factor}>
                <ResultTitle>{factor} 결과</ResultTitle>
                <MetricRow>
                  <MetricLabel>CAGR</MetricLabel>
                  <MetricValue $positive={result.cagr > 0}>
                    {(result.cagr * 100).toFixed(2)}%
                  </MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>Sharpe Ratio</MetricLabel>
                  <MetricValue>{result.sharpe_ratio.toFixed(3)}</MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>Max Drawdown</MetricLabel>
                  <MetricValue $positive={false}>
                    {(result.max_drawdown * 100).toFixed(2)}%
                  </MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>IC</MetricLabel>
                  <MetricValue>{result.ic_mean.toFixed(4)}</MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>승률</MetricLabel>
                  <MetricValue>{(result.win_rate * 100).toFixed(2)}%</MetricValue>
                </MetricRow>
              </ResultCard>
            ))}
          </>
        )}

        {!results && (
          <GlassCard>
            <p style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              백테스트를 실행하여 결과를 확인하세요
            </p>
          </GlassCard>
        )}
      </RightPanel>
    </BacktestContainer>
  );
};

