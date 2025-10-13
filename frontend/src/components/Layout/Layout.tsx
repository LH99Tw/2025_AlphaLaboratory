import React, { ReactNode, useState } from 'react';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';
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

const MainContent = styled.main<{ $sidebarCollapsed: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarCollapsed ? '80px' : '280px'};
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1400px;
  padding: ${theme.spacing.xl};
`;

const Header = styled.header`
  width: 100%;
  max-width: 1400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border};
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  transition: all 0.3s;
  
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    border-color: ${theme.colors.borderHover};
  }
  
  .anticon {
    color: ${theme.colors.accentPrimary};
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: ${theme.colors.error};
    border-color: ${theme.colors.error};
    background: rgba(242, 139, 130, 0.1);
  }
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed] = useState(false);

  return (
    <>
      <LiquidBackground />
      <LayoutContainer>
        <Sidebar />
        <MainContent $sidebarCollapsed={sidebarCollapsed}>
          <Header>
            <HeaderLeft>
              {/* 추가 헤더 요소 */}
            </HeaderLeft>
            <HeaderRight>
              <UserInfo>
                <UserOutlined />
                <span>{user?.username || 'User'}</span>
              </UserInfo>
              <LogoutButton onClick={logout}>
                <LogoutOutlined />
                <span>Logout</span>
              </LogoutButton>
            </HeaderRight>
          </Header>
          <ContentWrapper>
            {children}
          </ContentWrapper>
        </MainContent>
      </LayoutContainer>
    </>
  );
};

