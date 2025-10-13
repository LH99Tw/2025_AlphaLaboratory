import React from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import { FundOutlined } from '@ant-design/icons';

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

export const Portfolio: React.FC = () => {
  return (
    <Container>
      <Title>포트폴리오 관리</Title>
      
      <GlassCard>
        <ComingSoon>
          <div className="icon"><FundOutlined /></div>
          <h2>포트폴리오 기능 구현 예정</h2>
          <p>알파 팩터 기반 종목 선별 및 포트폴리오 성과 분석 기능이 추가될 예정입니다.</p>
        </ComingSoon>
      </GlassCard>
    </Container>
  );
};

