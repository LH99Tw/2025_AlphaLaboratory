import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Navigation } from './Navigation';
import { LiquidBackground } from '../common/LiquidBackground';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { theme } from '../../styles/theme';

interface LayoutProps {
  children: ReactNode;
}

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${theme.colors.backgroundDark};
  color: ${theme.colors.textPrimary};
  font-family: ${theme.typography.fontFamily.primary};
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 240px;
  padding: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

const Header = styled.header`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.md} 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 8px;
  
  .anticon {
    color: ${theme.colors.accentGold};
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 8px;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.error};
    border-color: ${theme.colors.error};
  }
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <>
      <LiquidBackground />
      <LayoutContainer>
        <Navigation />
        <MainContent>
          <Header>
            <UserInfo>
              <UserOutlined />
              <span>{user?.username || 'User'}</span>
            </UserInfo>
            <LogoutButton onClick={logout}>
              <LogoutOutlined />
              <span>로그아웃</span>
            </LogoutButton>
          </Header>
          {children}
        </MainContent>
      </LayoutContainer>
    </>
  );
};

