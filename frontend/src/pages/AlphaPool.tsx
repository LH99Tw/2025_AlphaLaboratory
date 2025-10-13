import React from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import { ThunderboltOutlined } from '@ant-design/icons';

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

export const AlphaPool: React.FC = () => {
  return (
    <Container>
      <Title>알파 풀 (GA 진화 알고리즘)</Title>
      
      <GlassCard>
        <ComingSoon>
          <div className="icon"><ThunderboltOutlined /></div>
          <h2>유전 알고리즘 기능 구현 예정</h2>
          <p>GA를 활용한 알파 팩터 자동 생성 및 최적화 기능이 추가될 예정입니다.</p>
        </ComingSoon>
      </GlassCard>
    </Container>
  );
};

