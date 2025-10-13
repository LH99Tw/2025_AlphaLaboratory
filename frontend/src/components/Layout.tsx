import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Typography, Badge, Spin, Button, Dropdown, Space } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BarChartOutlined,
  ApiOutlined,
  UserOutlined,
  LogoutOutlined,
  FundOutlined,
  PlayCircleOutlined,
  CrownOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const { user, logout } = useAuth();
  const location = useLocation();

  // 서버 상태 확인
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        await apiService.health();
        setServerStatus('online');
      } catch (error) {
        setServerStatus('offline');
      }
    };

    checkServerStatus();
    
    // 30초마다 서버 상태 확인
    const interval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 메뉴 아이템 정의
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">대시보드</Link>,
    },
    {
      key: '/portfolio',
      icon: <FundOutlined />,
      label: <Link to="/portfolio">포트폴리오 관리</Link>,
    },
    {
      key: '/backtest',
      icon: <BarChartOutlined />,
      label: <Link to="/backtest">백테스트</Link>,
    },
    {
      key: '/simulation',
      icon: <PlayCircleOutlined />,
      label: <Link to="/simulation">모의투자</Link>,
    },
    {
      key: '/alpha-pool',
      icon: <CrownOutlined />,
      label: <Link to="/alpha-pool">알파 Pool</Link>,
    },
    {
      key: '/alpha-incubator',
      icon: <ThunderboltOutlined />,
      label: <Link to="/alpha-incubator">알파 부화장</Link>,
    },
  ];

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'online':
        return '#52c41a';
      case 'offline':
        return '#ff4d4f';
      case 'loading':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'online':
        return '온라인';
      case 'offline':
        return '오프라인';
      case 'loading':
        return '연결 중...';
      default:
        return '알 수 없음';
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #303030'
        }}>
          {!collapsed ? (
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              퀀트 분석 시스템
            </Title>
          ) : (
            <ApiOutlined style={{ fontSize: '24px', color: 'white' }} />
          )}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <AntLayout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {getPageTitle(location.pathname)}
          </Title>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Badge 
              color={getStatusColor()} 
              text={
                <span style={{ fontSize: '14px' }}>
                  서버 상태: {getStatusText()}
                  {serverStatus === 'loading' && <Spin size="small" style={{ marginLeft: 8 }} />}
                </span>
              } 
            />
            
            {user && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'user-info',
                      label: (
                        <div style={{ padding: '8px 0' }}>
                          <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                          <div style={{ color: '#999', fontSize: '12px' }}>
                            @{user.username} ({user.role})
                          </div>
                        </div>
                      ),
                      disabled: true,
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'logout',
                      label: '로그아웃',
                      icon: <LogoutOutlined />,
                      onClick: logout,
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <Button type="text" style={{ padding: '4px 8px' }}>
                  <Space>
                    <UserOutlined />
                    {user.name}
                  </Space>
                </Button>
              </Dropdown>
            )}
          </div>
        </Header>
        
        <Content style={{ 
          margin: 0,
          background: '#f5f5f5',
          overflow: 'auto'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

// 페이지 제목 반환 함수
const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case '/':
      return '대시보드';
    case '/portfolio':
      return '포트폴리오 관리';
    case '/backtest':
      return '백테스트';
    case '/simulation':
      return '모의투자';
    case '/alpha-pool':
      return '알파 Pool';
    case '/alpha-incubator':
      return '알파 부화장';
    default:
      return '퀀트 분석 시스템';
  }
};

export default Layout;
