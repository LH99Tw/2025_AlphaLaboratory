import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  DashboardOutlined, 
  ExperimentOutlined, 
  FundOutlined, 
  RobotOutlined, 
  ThunderboltOutlined,
  StockOutlined 
} from '@ant-design/icons';
import { theme } from '../../styles/theme';

const NavContainer = styled.nav`
  width: 240px;
  height: 100vh;
  background: rgba(20, 27, 61, 0.8);
  backdrop-filter: blur(20px);
  border-right: 1px solid ${theme.colors.liquidGlassBorder};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  position: fixed;
  left: 0;
  top: 0;
`;

const Logo = styled.div`
  color: ${theme.colors.accentGold};
  font-size: ${theme.typography.fontSize.h2};
  font-weight: 700;
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
  font-family: ${theme.typography.fontFamily.display};
`;

const NavItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: 12px 16px;
  border-radius: 8px;
  color: ${(props: { $active: boolean }) => props.$active ? theme.colors.accentGold : theme.colors.textSecondary};
  background: ${(props: { $active: boolean }) => props.$active ? 'rgba(212, 175, 55, 0.15)' : 'transparent'};
  border-left: ${(props: { $active: boolean }) => props.$active ? `3px solid ${theme.colors.accentGold}` : '3px solid transparent'};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  font-weight: ${(props: { $active: boolean }) => props.$active ? '600' : '400'};

  &:hover {
    background: rgba(212, 175, 55, 0.1);
    color: ${theme.colors.accentGold};
  }

  .anticon {
    font-size: 20px;
  }
`;

const NavSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

const SectionTitle = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${theme.spacing.sm};
  padding-left: ${theme.spacing.md};
`;

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <DashboardOutlined />, label: '대시보드' },
  ];

  const analysisItems = [
    { path: '/backtest', icon: <ExperimentOutlined />, label: '백테스트' },
    { path: '/portfolio', icon: <FundOutlined />, label: '포트폴리오' },
  ];

  const alphaItems = [
    { path: '/alpha-pool', icon: <ThunderboltOutlined />, label: '알파 풀' },
    { path: '/alpha-incubator', icon: <RobotOutlined />, label: '알파 부화장' },
  ];

  const tradingItems = [
    { path: '/simulation', icon: <StockOutlined />, label: '모의투자' },
  ];

  return (
    <NavContainer>
      <Logo>⚗️ QUANT LAB</Logo>
      
      {menuItems.map(item => (
        <NavItem
          key={item.path}
          $active={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavItem>
      ))}

      <NavSection>
        <SectionTitle>분석</SectionTitle>
        {analysisItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavItem>
        ))}
      </NavSection>

      <NavSection>
        <SectionTitle>알파 팩토리</SectionTitle>
        {alphaItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavItem>
        ))}
      </NavSection>

      <NavSection>
        <SectionTitle>트레이딩</SectionTitle>
        {tradingItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavItem>
        ))}
      </NavSection>
    </NavContainer>
  );
};

