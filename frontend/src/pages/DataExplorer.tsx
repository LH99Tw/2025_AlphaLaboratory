import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Input,
  Select,
  Button,
  Typography,
  Statistic,
  Alert,
  Spin,
  Tabs,
  Space,
  Tooltip,
} from 'antd';
import {
  DatabaseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { apiService, type FactorList, type DataStats, type TickerList } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const DataExplorer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [factorsData, setFactorsData] = useState<FactorList | null>(null);
  const [statsData, setStatsData] = useState<DataStats | null>(null);
  const [tickersData, setTickersData] = useState<TickerList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [factors, stats, tickers] = await Promise.all([
        apiService.getFactors(),
        apiService.getDataStats(),
        apiService.getTickerList(),
      ]);
      
      setFactorsData(factors);
      setStatsData(stats);
      setTickersData(tickers);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 알파 팩터 필터링
  const getFilteredFactors = () => {
    if (!factorsData?.factors) return [];
    
    let filtered = factorsData.factors;
    
    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(factor => 
        factor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 카테고리 필터 (알파 번호 범위로 구분)
    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case '1-20':
          filtered = filtered.filter(factor => {
            const num = parseInt(factor.replace('alpha', ''));
            return num >= 1 && num <= 20;
          });
          break;
        case '21-50':
          filtered = filtered.filter(factor => {
            const num = parseInt(factor.replace('alpha', ''));
            return num >= 21 && num <= 50;
          });
          break;
        case '51-80':
          filtered = filtered.filter(factor => {
            const num = parseInt(factor.replace('alpha', ''));
            return num >= 51 && num <= 80;
          });
          break;
        case '81-101':
          filtered = filtered.filter(factor => {
            const num = parseInt(factor.replace('alpha', ''));
            return num >= 81 && num <= 101;
          });
          break;
      }
    }
    
    return filtered;
  };

  // 알파 팩터 분포 데이터
  const getFactorDistribution = () => {
    if (!factorsData?.factors) return [];
    
    const ranges = [
      { name: '1-20', min: 1, max: 20, color: '#8884d8' },
      { name: '21-50', min: 21, max: 50, color: '#82ca9d' },
      { name: '51-80', min: 51, max: 80, color: '#ffc658' },
      { name: '81-101', min: 81, max: 101, color: '#ff7c7c' },
    ];
    
    return ranges.map(range => {
      const count = factorsData.factors.filter(factor => {
        const num = parseInt(factor.replace('alpha', ''));
        return num >= range.min && num <= range.max;
      }).length;
      
      return {
        name: `Alpha ${range.name}`,
        value: count,
        color: range.color,
      };
    });
  };

  // 티커 섹터별 분포 (임시 데이터)
  const getTickerSectorData = () => {
    if (!tickersData?.tickers) return [];
    
    // 실제로는 섹터 정보가 필요하지만, 임시로 랜덤하게 분배
    const sectors = [
      { name: 'Technology', value: Math.floor(tickersData.tickers.length * 0.25) },
      { name: 'Healthcare', value: Math.floor(tickersData.tickers.length * 0.15) },
      { name: 'Financial', value: Math.floor(tickersData.tickers.length * 0.20) },
      { name: 'Consumer', value: Math.floor(tickersData.tickers.length * 0.15) },
      { name: 'Industrial', value: Math.floor(tickersData.tickers.length * 0.12) },
      { name: 'Others', value: Math.floor(tickersData.tickers.length * 0.13) },
    ];
    
    return sectors;
  };

  // 알파 팩터 테이블 컬럼
  const factorColumns = [
    {
      title: '팩터명',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '번호',
      dataIndex: 'number',
      key: 'number',
      sorter: (a: any, b: any) => a.number - b.number,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const colorMap: { [key: string]: string } = {
          '1-20': 'purple',
          '21-50': 'green',
          '51-80': 'orange',
          '81-101': 'red',
        };
        return <Tag color={colorMap[category]}>{category}</Tag>;
      },
    },
  ];

  const getFactorTableData = () => {
    const filtered = getFilteredFactors();
    return filtered.map(factor => {
      const num = parseInt(factor.replace('alpha', ''));
      let category = '1-20';
      if (num >= 21 && num <= 50) category = '21-50';
      else if (num >= 51 && num <= 80) category = '51-80';
      else if (num >= 81 && num <= 101) category = '81-101';
      
      return {
        key: factor,
        name: factor,
        number: num,
        category,
      };
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>데이터를 불러오는 중...</Paragraph>
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
            <Button onClick={loadAllData} icon={<ReloadOutlined />}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-card">
        <Title level={2}>
          <DatabaseOutlined /> 데이터 탐색
        </Title>
        <Paragraph>
          S&P 500 주가 데이터와 알파 팩터 데이터를 탐색하고 분석합니다.
        </Paragraph>
      </div>

      {/* 데이터 개요 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="총 알파 팩터"
              value={factorsData?.total_count || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="S&P 500 종목"
              value={tickersData?.total_count || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="주가 데이터 컬럼"
              value={statsData?.stats.price_data?.columns.length || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="알파 데이터 컬럼"
              value={statsData?.stats.alpha_data?.total_columns || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 탭으로 구분된 데이터 뷰 */}
      <Card>
        <Tabs defaultActiveKey="factors">
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                알파 팩터
              </span>
            } 
            key="factors"
          >
            {/* 필터 영역 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="팩터명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  style={{ width: '100%' }}
                >
                  <Option value="all">전체 카테고리</Option>
                  <Option value="1-20">Alpha 1-20</Option>
                  <Option value="21-50">Alpha 21-50</Option>
                  <Option value="51-80">Alpha 51-80</Option>
                  <Option value="81-101">Alpha 81-101</Option>
                </Select>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Space>
                  <Button 
                    onClick={loadAllData} 
                    icon={<ReloadOutlined />}
                  >
                    새로고침
                  </Button>
                  <Tooltip title="데이터 내보내기">
                    <Button icon={<DownloadOutlined />}>
                      내보내기
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>

            {/* 팩터 분포 차트 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card title="알파 팩터 분포" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getFactorDistribution()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {getFactorDistribution().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card title="카테고리별 팩터 수" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getFactorDistribution()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#1890ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* 팩터 테이블 */}
            <Table
              columns={factorColumns}
              dataSource={getFactorTableData()}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / ${total}개 (필터링된 결과: ${getFilteredFactors().length}개)`,
              }}
              scroll={{ x: 600 }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <DatabaseOutlined />
                S&P 500 종목
              </span>
            } 
            key="tickers"
          >
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <Card title="섹터별 분포" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getTickerSectorData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {getTickerSectorData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={[
                              '#8884d8', '#82ca9d', '#ffc658', 
                              '#ff7c7c', '#8dd1e1', '#d084d0'
                            ][index % 6]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card title="종목 정보" size="small">
                  <Statistic
                    title="총 종목 수"
                    value={tickersData?.total_count || 0}
                    suffix="개"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Text strong>주요 종목 (예시):</Text>
                    <div style={{ marginTop: 8 }}>
                      {tickersData?.tickers.slice(0, 10).map(ticker => (
                        <Tag key={ticker} color="green" style={{ margin: '2px' }}>
                          {ticker}
                        </Tag>
                      ))}
                      {(tickersData?.tickers.length || 0) > 10 && (
                        <Tag color="blue">
                          ... 외 {(tickersData?.tickers.length || 0) - 10}개
                        </Tag>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <InfoCircleOutlined />
                데이터 정보
              </span>
            } 
            key="info"
          >
            <Row gutter={16}>
              {statsData?.stats.price_data && (
                <Col xs={24} lg={12}>
                  <Card title="주가 데이터 정보" size="small">
                    <Paragraph>
                      <Text strong>파일 상태:</Text> 
                      <Tag color="green">정상</Tag>
                    </Paragraph>
                    <Paragraph>
                      <Text strong>컬럼 수:</Text> {statsData.stats.price_data.columns.length}개
                    </Paragraph>
                    <Paragraph>
                      <Text strong>샘플 행 수:</Text> {statsData.stats.price_data.sample_rows.toLocaleString()}개
                    </Paragraph>
                    <Paragraph>
                      <Text strong>주요 컬럼:</Text>
                    </Paragraph>
                    <div>
                      {statsData.stats.price_data.columns.map(col => (
                        <Tag key={col} style={{ margin: '2px' }}>
                          {col}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                </Col>
              )}
              
              {statsData?.stats.alpha_data && (
                <Col xs={24} lg={12}>
                  <Card title="알파 데이터 정보" size="small">
                    <Paragraph>
                      <Text strong>파일 상태:</Text> 
                      <Tag color="green">정상</Tag>
                    </Paragraph>
                    <Paragraph>
                      <Text strong>전체 컬럼 수:</Text> {statsData.stats.alpha_data.total_columns}개
                    </Paragraph>
                    <Paragraph>
                      <Text strong>알파 팩터 수:</Text> {statsData.stats.alpha_data.alpha_factors}개
                    </Paragraph>
                    <Paragraph>
                      <Text strong>샘플 행 수:</Text> {statsData.stats.alpha_data.sample_rows.toLocaleString()}개
                    </Paragraph>
                  </Card>
                </Col>
              )}
            </Row>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DataExplorer;
