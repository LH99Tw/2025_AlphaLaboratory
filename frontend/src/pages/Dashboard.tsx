import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { 
  RiseOutlined, 
  FallOutlined, 
  ThunderboltOutlined, 
  ExperimentOutlined 
} from '@ant-design/icons';
import { theme } from '../styles/theme';
import { checkHealth } from '../services/api';
import type { DashboardMetrics } from '../types';

const DashboardContainer = styled.div`
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

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
`;

const MetricCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  
  /* 특정 메트릭 카드에 리퀴드 글래스 금색 적용 */
  &:nth-child(2), &:nth-child(4) {
    background: ${theme.colors.liquidGoldGradient};
    border: 1px solid ${theme.colors.liquidGoldBorder};
    backdrop-filter: blur(15px);
    box-shadow: 0 4px 20px rgba(212, 175, 55, 0.1);
  }
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

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${theme.spacing.lg};
`;

const ChartCard = styled(GlassCard)`
  min-height: 300px;
`;

const ChartTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.lg} 0;
  font-weight: 600;
`;

const StatusBadge = styled.div<{ $status: 'healthy' | 'unhealthy' }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${(props: { $status: 'healthy' | 'unhealthy' }) => 
    props.$status === 'healthy' 
      ? 'rgba(16, 185, 129, 0.1)' 
      : 'rgba(239, 68, 68, 0.1)'
  };
  border: 1px solid ${(props: { $status: 'healthy' | 'unhealthy' }) => 
    props.$status === 'healthy' 
      ? theme.colors.success 
      : theme.colors.error
  };
  border-radius: 8px;
  color: ${(props: { $status: 'healthy' | 'unhealthy' }) => 
    props.$status === 'healthy' 
      ? theme.colors.success 
      : theme.colors.error
  };
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
`;

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAlphas: 0,
    activeBacktests: 0,
    portfolioValue: 0,
    dailyPnL: 0,
  });

  const [systemStatus, setSystemStatus] = useState<'healthy' | 'unhealthy'>('healthy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 시스템 상태 확인
    checkHealth()
      .then(data => {
        setSystemStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
        // Mock 메트릭 데이터 (실제 API가 있다면 여기서 호출)
        setMetrics({
          totalAlphas: 101,
          activeBacktests: 3,
          portfolioValue: 1250000,
          dailyPnL: 15420,
        });
      })
      .catch(() => {
        setSystemStatus('unhealthy');
        // 오프라인 모드 - 기본값 유지
        setMetrics({
          totalAlphas: 101,
          activeBacktests: 0,
          portfolioValue: 0,
          dailyPnL: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardContainer>
        <div style={{ textAlign: 'center', padding: theme.spacing.xxl }}>
          <p style={{ color: theme.colors.textSecondary }}>Loading...</p>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <div>
        <Title>대시보드</Title>
        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
          퀀트 트레이딩 시스템 개요
        </p>
      </div>

        <StatusBadge $status={systemStatus}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: systemStatus === 'healthy' ? theme.colors.success : theme.colors.error 
        }} />
        {systemStatus === 'healthy' ? '시스템 온라인' : '시스템 점검 필요'}
      </StatusBadge>

      <MetricsGrid>
        <MetricCard>
          <MetricHeader>
            <MetricTitle>등록된 알파</MetricTitle>
            <MetricIcon $color={theme.colors.accentGold}>
              <ThunderboltOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{metrics.totalAlphas}</MetricValue>
          <MetricChange $positive={true}>
            <RiseOutlined />
            +5 (이번 주)
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>활성 백테스트</MetricTitle>
            <MetricIcon $color={theme.colors.info}>
              <ExperimentOutlined />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{metrics.activeBacktests}</MetricValue>
          <MetricChange $positive={true}>
            <span>실행 중</span>
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>포트폴리오 가치</MetricTitle>
            <MetricIcon $color={theme.colors.success}>
              $
            </MetricIcon>
          </MetricHeader>
          <MetricValue>${(metrics.portfolioValue / 1000000).toFixed(2)}M</MetricValue>
          <MetricChange $positive={true}>
            <RiseOutlined />
            +2.3% (오늘)
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricTitle>일일 손익</MetricTitle>
            <MetricIcon $color={metrics.dailyPnL >= 0 ? theme.colors.success : theme.colors.error}>
              {metrics.dailyPnL >= 0 ? <RiseOutlined /> : <FallOutlined />}
            </MetricIcon>
          </MetricHeader>
          <MetricValue>${(metrics.dailyPnL / 1000).toFixed(1)}K</MetricValue>
          <MetricChange $positive={metrics.dailyPnL >= 0}>
            {metrics.dailyPnL >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {((metrics.dailyPnL / metrics.portfolioValue) * 100).toFixed(2)}%
          </MetricChange>
        </MetricCard>
      </MetricsGrid>

      <ChartsSection>
        <ChartCard>
          <ChartTitle>최근 백테스트 성과</ChartTitle>
          <p style={{ color: theme.colors.textSecondary }}>
            차트 구현 예정 (Coming Soon)
          </p>
        </ChartCard>

        <ChartCard>
          <ChartTitle>알파 팩터 분포</ChartTitle>
          <p style={{ color: theme.colors.textSecondary }}>
            차트 구현 예정 (Coming Soon)
          </p>
        </ChartCard>
      </ChartsSection>

      <GlassCard>
        <ChartTitle>최근 활동</ChartTitle>
        <p style={{ color: theme.colors.textSecondary }}>
          활동 로그 테이블 구현 예정 (Coming Soon)
        </p>
      </GlassCard>
    </DashboardContainer>
  );
};

