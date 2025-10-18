import React from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import { StockOutlined } from '@ant-design/icons';

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

const ComingSoon = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  
  .icon {
    font-size: 64px;
    color: ${theme.colors.accentGold};
    margin-bottom: ${theme.spacing.lg};
  }
  
  h2 {
    color: ${theme.colors.textPrimary};
    margin-bottom: ${theme.spacing.md};
  }
  
  p {
    color: ${theme.colors.textSecondary};
  }
`;

export const Simulation: React.FC = () => {
  return (
    <Container>
      <Title>모의투자</Title>
      
      <GlassCard>
        <ComingSoon>
          <div className="icon"><StockOutlined /></div>
          <h2>모의투자 기능 구현 예정</h2>
          <p>실시간 모의 투자 시뮬레이션 기능이 추가될 예정입니다.</p>
        </ComingSoon>
      </GlassCard>
    </Container>
  );
};

