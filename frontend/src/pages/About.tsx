import React from 'react';
import styled from 'styled-components';
import { GlassCard } from '../components/common/GlassCard';
import { theme } from '../styles/theme';
import { 
  RocketOutlined, 
  TeamOutlined, 
  BulbOutlined,
  TrophyOutlined,
  LineChartOutlined,
  SafetyOutlined
} from '@ant-design/icons';

const AboutContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const HeroSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px ${theme.spacing.xl};
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border-radius: 24px;
  border: 1px solid ${theme.colors.liquidGlassBorder};
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.lg} 0;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroDescription = styled.p`
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textSecondary};
  max-width: 700px;
  line-height: 1.6;
  margin: 0;
`;

const SectionTitle = styled.h2`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
`;

const ValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
`;

const ValueCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  }
`;

const ValueIcon = styled.div`
  font-size: 40px;
  color: ${theme.colors.textPrimary};
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
`;

const ValueTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  margin: 0;
`;

const ValueDescription = styled.p`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const MissionSection = styled(GlassCard)`
  padding: 48px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  text-align: center;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    padding: ${theme.spacing.xl};
  }
`;

const MissionTitle = styled.h2`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  margin: 0;
`;

const MissionText = styled.p`
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textSecondary};
  line-height: 1.8;
  margin: 0;
  max-width: 800px;
  margin: 0 auto;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.lg};
`;

const StatCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  font-family: ${theme.typography.fontFamily.display};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

export const About: React.FC = () => {
  const values = [
    {
      icon: <BulbOutlined />,
      title: '혁신',
      description: '최첨단 AI 기술과 알고리즘을 통해 금융 시장의 새로운 가능성을 제시합니다.'
    },
    {
      icon: <SafetyOutlined />,
      title: '신뢰',
      description: '투명하고 검증된 백테스팅으로 안전하고 신뢰할 수 있는 투자 전략을 제공합니다.'
    },
    {
      icon: <LineChartOutlined />,
      title: '성과',
      description: '데이터 기반의 의사결정으로 지속 가능한 수익 창출을 목표로 합니다.'
    },
    {
      icon: <TeamOutlined />,
      title: '협력',
      description: '전문가들과의 긴밀한 협업으로 최고의 퀀트 솔루션을 개발합니다.'
    },
    {
      icon: <RocketOutlined />,
      title: '성장',
      description: '끊임없는 연구와 개발로 시장을 선도하는 기술 혁신을 추구합니다.'
    },
    {
      icon: <TrophyOutlined />,
      title: '우수성',
      description: '업계 최고 수준의 알파 팩터로 탁월한 투자 성과를 제공합니다.'
    }
  ];

  return (
    <AboutContainer>
      <HeroSection>
        <HeroTitle>Smart Analytics</HeroTitle>
        <HeroDescription>
          알파팩터를 디자인하고 구현할 수 있는
          <br />
          알고리즘 트레이딩 플랫폼
        </HeroDescription>
      </HeroSection>

      <MissionSection>
        <MissionTitle>Our Mission</MissionTitle>
        <MissionText>
          우리는 최첨단 AI 기술과 금융 공학을 결합하여,
          투자자들이 더 나은 의사결정을 할 수 있도록 돕습니다.
          데이터 기반의 알파 팩터 생성부터 백테스팅, 포트폴리오 최적화까지
          전 과정을 자동화하여 누구나 쉽게 퀀트 투자를 시작할 수 있습니다.
        </MissionText>
      </MissionSection>

      <div>
        <SectionTitle>핵심 가치</SectionTitle>
        <ValuesGrid>
          {values.map((value, index) => (
            <ValueCard key={index}>
              <ValueIcon>{value.icon}</ValueIcon>
              <ValueTitle>{value.title}</ValueTitle>
              <ValueDescription>{value.description}</ValueDescription>
            </ValueCard>
          ))}
        </ValuesGrid>
      </div>

      <div>
        <SectionTitle>Our Impact</SectionTitle>
        <StatsSection>
          <StatCard>
            <StatNumber>100+</StatNumber>
            <StatLabel>알파 팩터</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>10년+</StatNumber>
            <StatLabel>백테스팅 기간</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>500+</StatNumber>
            <StatLabel>S&P 500 종목</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>99.9%</StatNumber>
            <StatLabel>시스템 안정성</StatLabel>
          </StatCard>
        </StatsSection>
      </div>
    </AboutContainer>
  );
};

