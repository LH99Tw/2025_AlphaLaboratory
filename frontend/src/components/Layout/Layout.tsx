import React, { ReactNode, useState, createContext, useContext } from 'react';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { LiquidBackground } from '../common/LiquidBackground';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { theme } from '../../styles/theme';

// 사이드바 상태를 관리하는 Context
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

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
  margin-left: ${props => props.$sidebarCollapsed ? '80px' : '240px'};
  transition: margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1400px;
  padding: ${theme.spacing.xl} ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 200px);
`;

const Header = styled.header`
  width: 100%;
  max-width: 1400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.xl};
  background: ${theme.colors.backgroundDark};
  border-bottom: 1px solid ${theme.colors.border};
  margin-bottom: 0;
  flex-shrink: 0;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
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
          <Footer />
        </MainContent>
      </LayoutContainer>
    </SidebarContext.Provider>
  );
};

