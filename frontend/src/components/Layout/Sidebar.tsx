import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  DashboardOutlined, 
  ExperimentOutlined, 
  FundOutlined, 
  RobotOutlined, 
  ThunderboltOutlined,
  StockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { theme } from '../../styles/theme';

const SidebarContainer = styled.nav<{ $collapsed: boolean }>`
  width: ${props => props.$collapsed ? '80px' : '280px'};
  height: 100vh;
  background: ${theme.colors.backgroundSecondary};
  border-right: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  position: fixed;
  left: 0;
  top: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
`;

const Logo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.h3};
  font-weight: 700;
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.md};
  
  .logo-icon {
    font-size: 32px;
  }
  
  .logo-text {
    opacity: ${props => props.$collapsed ? 0 : 1};
    transition: opacity 0.3s;
    white-space: nowrap;
  }
`;

const NavItem = styled.div<{ $active: boolean; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: 14px 16px;
  border-radius: 12px;
  color: ${(props: { $active: boolean }) => props.$active ? theme.colors.accentPrimary : theme.colors.textSecondary};
  background: ${(props: { $active: boolean }) => props.$active ? 'rgba(138, 180, 248, 0.1)' : 'transparent'};
  border: 1px solid ${(props: { $active: boolean }) => props.$active ? 'rgba(138, 180, 248, 0.2)' : 'transparent'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: ${(props: { $active: boolean }) => props.$active ? '600' : '400'};
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${theme.colors.liquidGlassHover};
    color: ${theme.colors.accentPrimary};
    transform: translateX(4px);
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${theme.colors.accentPrimary};
    transform: scaleY(${(props: { $active: boolean }) => props.$active ? 1 : 0});
    transition: transform 0.3s;
  }

  .anticon {
    font-size: 20px;
    min-width: 20px;
  }
  
  .nav-label {
    opacity: ${(props: { $collapsed: boolean }) => props.$collapsed ? 0 : 1};
    transition: opacity 0.3s;
    white-space: nowrap;
  }
`;

const NavSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

const SectionTitle = styled.div<{ $collapsed: boolean }>`
  color: ${theme.colors.textTertiary};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: ${theme.spacing.sm};
  padding-left: ${theme.spacing.md};
  opacity: ${props => props.$collapsed ? 0 : 1};
  transition: opacity 0.3s;
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.3s;
  margin-top: auto;
  
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    color: ${theme.colors.textPrimary};
    border-color: ${theme.colors.accentPrimary};
  }
`;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  ];

  const analysisItems = [
    { path: '/backtest', icon: <ExperimentOutlined />, label: 'Backtest' },
    { path: '/portfolio', icon: <FundOutlined />, label: 'Portfolio' },
  ];

  const alphaItems = [
    { path: '/alpha-pool', icon: <ThunderboltOutlined />, label: 'Alpha Pool' },
    { path: '/alpha-incubator', icon: <RobotOutlined />, label: 'Incubator' },
  ];

  const tradingItems = [
    { path: '/simulation', icon: <StockOutlined />, label: 'Paper Trading' },
  ];

  return (
    <SidebarContainer $collapsed={collapsed}>
      <Logo $collapsed={collapsed}>
        <span className="logo-icon">⚗️</span>
        <span className="logo-text">QUANT LAB</span>
      </Logo>
      
      {menuItems.map(item => (
        <NavItem
          key={item.path}
          $active={location.pathname === item.path}
          $collapsed={collapsed}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span className="nav-label">{item.label}</span>
        </NavItem>
      ))}

      <NavSection>
        <SectionTitle $collapsed={collapsed}>Analysis</SectionTitle>
        {analysisItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            $collapsed={collapsed}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavItem>
        ))}
      </NavSection>

      <NavSection>
        <SectionTitle $collapsed={collapsed}>Alpha Factory</SectionTitle>
        {alphaItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            $collapsed={collapsed}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavItem>
        ))}
      </NavSection>

      <NavSection>
        <SectionTitle $collapsed={collapsed}>Trading</SectionTitle>
        {tradingItems.map(item => (
          <NavItem
            key={item.path}
            $active={location.pathname === item.path}
            $collapsed={collapsed}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavItem>
        ))}
      </NavSection>

      <CollapseButton onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </CollapseButton>
    </SidebarContainer>
  );
};

