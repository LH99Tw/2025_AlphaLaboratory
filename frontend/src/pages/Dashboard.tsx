import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Alert, Spin, Typography, Progress } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  RobotOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { apiService, type HealthCheck, type DataStats } from '../services/api';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);
  const [statsData, setStatsData] = useState<DataStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [health, stats] = await Promise.all([
        apiService.health(),
        apiService.getDataStats(),
      ]);
      
      setHealthData(health);
      setStatsData(stats);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>대시보드 데이터를 불러오는 중...</Paragraph>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Alert
          message="오류 발생"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={loadDashboardData} style={{ border: 'none', background: 'none', color: '#1890ff', cursor: 'pointer' }}>
              다시 시도
            </button>
          }
        />
      </div>
    );
  }

  const systemsOnline = healthData ? Object.values(healthData.systems).filter(Boolean).length : 0;
  const totalSystems = 4;
  const systemHealth = (systemsOnline / totalSystems) * 100;

  return (
    <div className="page-container">
      <div className="content-card">
        <Title level={2}>
          <DashboardOutlined /> 시스템 개요
        </Title>
        <Paragraph>
          퀀트 금융 분석 시스템의 전체 상태와 주요 지표를 확인할 수 있습니다.
        </Paragraph>
      </div>

      {/* 시스템 상태 카드 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="시스템 상태"
              value={healthData?.status === 'healthy' ? '정상' : '오류'}
              valueStyle={{ 
                color: healthData?.status === 'healthy' ? '#3f8600' : '#cf1322' 
              }}
              prefix={
                healthData?.status === 'healthy' ? 
                <CheckCircleOutlined /> : 
                <CloseCircleOutlined />
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="시스템 건강도"
              value={systemHealth}
              suffix="%"
              valueStyle={{ color: systemHealth >= 75 ? '#3f8600' : systemHealth >= 50 ? '#d46b08' : '#cf1322' }}
            />
            <Progress 
              percent={systemHealth} 
              showInfo={false} 
              size="small"
              strokeColor={systemHealth >= 75 ? '#52c41a' : systemHealth >= 50 ? '#fa8c16' : '#ff4d4f'}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="활성 모듈"
              value={`${systemsOnline}/${totalSystems}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="알파 팩터 수"
              value={statsData?.stats.alpha_data?.alpha_factors || 'N/A'}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 모듈별 상태 */}
      <div className="content-card" style={{ marginTop: 24 }}>
        <Title level={3}>모듈별 상태</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              title="백테스트 시스템"
              extra={
                healthData?.systems.backtest ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
            >
              <BarChartOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
              <Paragraph>
                알파 팩터 백테스트 및 성과 분석 모듈
              </Paragraph>
              <div>
                상태: {healthData?.systems.backtest ? '온라인' : '오프라인'}
              </div>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              title="GA 진화 알고리즘"
              extra={
                healthData?.systems.ga ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
            >
              <ExperimentOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
              <Paragraph>
                유전 알고리즘 기반 알파 팩터 생성 모듈
              </Paragraph>
              <div>
                상태: {healthData?.systems.ga ? '온라인' : '오프라인'}
              </div>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              title="AI 에이전트"
              extra={
                healthData?.systems.langchain ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
            >
              <RobotOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 16 }} />
              <Paragraph>
                LangChain 기반 멀티 에이전트 시스템
              </Paragraph>
              <div>
                상태: {healthData?.systems.langchain ? '온라인' : '오프라인'}
              </div>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              title="데이터베이스"
              extra={
                healthData?.systems.database ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
            >
              <DatabaseOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 16 }} />
              <Paragraph>
                S&P 500 데이터 관리 및 조회 시스템
              </Paragraph>
              <div>
                상태: {healthData?.systems.database ? '온라인' : '오프라인'}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 데이터 통계 */}
      {statsData && (
        <div className="content-card" style={{ marginTop: 24 }}>
          <Title level={3}>데이터 통계</Title>
          <Row gutter={[16, 16]}>
            {statsData.stats.price_data && (
              <Col xs={24} lg={12}>
                <Card title="주가 데이터">
                  <Statistic
                    title="컬럼 수"
                    value={statsData.stats.price_data.columns.length}
                  />
                  <Statistic
                    title="샘플 행 수"
                    value={statsData.stats.price_data.sample_rows.toLocaleString()}
                  />
                  <div style={{ marginTop: 16 }}>
                    <strong>주요 컬럼:</strong>
                    <div style={{ marginTop: 8 }}>
                      {statsData.stats.price_data.columns.slice(0, 6).map(col => (
                        <span key={col} style={{ 
                          background: '#f0f0f0', 
                          padding: '2px 8px', 
                          margin: '2px', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'inline-block'
                        }}>
                          {col}
                        </span>
                      ))}
                      {statsData.stats.price_data.columns.length > 6 && (
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          ... 외 {statsData.stats.price_data.columns.length - 6}개
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            )}
            
            {statsData.stats.alpha_data && (
              <Col xs={24} lg={12}>
                <Card title="알파 팩터 데이터">
                  <Statistic
                    title="전체 컬럼 수"
                    value={statsData.stats.alpha_data.total_columns}
                  />
                  <Statistic
                    title="알파 팩터 수"
                    value={statsData.stats.alpha_data.alpha_factors}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Statistic
                    title="샘플 행 수"
                    value={statsData.stats.alpha_data.sample_rows.toLocaleString()}
                  />
                </Card>
              </Col>
            )}
          </Row>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
