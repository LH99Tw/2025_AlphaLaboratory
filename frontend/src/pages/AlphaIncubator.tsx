import React from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import { RobotOutlined } from '@ant-design/icons';

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

export const AlphaIncubator: React.FC = () => {
  return (
    <Container>
      <Title>알파 부화장 (AI 에이전트)</Title>
      
      <GlassCard>
        <ComingSoon>
          <div className="icon"><RobotOutlined /></div>
          <h2>AI 에이전트 기능 구현 예정</h2>
          <p>LLM 기반 대화형 알파 분석 및 전문가 에이전트 시스템이 추가될 예정입니다.</p>
        </ComingSoon>
      </GlassCard>
    </Container>
  );
};

