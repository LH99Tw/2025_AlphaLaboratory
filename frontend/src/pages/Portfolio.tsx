import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Alert, 
  Select, 
  Table, 
  Spin, 
  Typography, 
  Row, 
  Col, 
  Space,
  Statistic,
  Tag,
  Progress,
  InputNumber,
  Radio,
  DatePicker,
  Collapse,
  Form
} from 'antd';
import { 
  TrophyOutlined, 
  FundOutlined, 
  BarChartOutlined, 
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  apiService, 
  PortfolioResponse, 
  PortfolioPerformanceResponse,
  FactorList 
} from '../services/api';

const Portfolio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(null);
  const [performanceData, setPerformanceData] = useState<PortfolioPerformanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [factors, setFactors] = useState<string[]>([]);
  
  // 폼 상태
  const [selectedFactor, setSelectedFactor] = useState('alpha001');
  const [selectionMethod, setSelectionMethod] = useState<'percentage' | 'count'>('percentage');
  const [topPercentage, setTopPercentage] = useState(10);
  const [topCount, setTopCount] = useState(20);
  
  // 성과 분석 파라미터
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [transactionCost, setTransactionCost] = useState(0.001);
  const [rebalancingFreq, setRebalancingFreq] = useState('weekly');

  // 컴포넌트 마운트 시 팩터 목록 로드
  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    try {
      const response: FactorList = await apiService.getFactors();
      if (response.success) {
        setFactors(response.factors);
      }
    } catch (error) {
      console.error('팩터 로드 실패:', error);
    }
  };

  const handleGetStocks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const requestData: any = {
        alpha_factor: selectedFactor,
      };
      
      if (selectionMethod === 'percentage') {
        requestData.top_percentage = topPercentage;
      } else {
        requestData.top_count = topCount;
      }
      
      const response: PortfolioResponse = await apiService.getPortfolioStocks(requestData);
      
      if (response.success) {
        setPortfolioData(response);
      } else {
        setError('종목 선별에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '종목 선별 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetPerformance = async () => {
    if (!portfolioData) {
      setError('먼저 종목을 선별해주세요.');
      return;
    }

    setPerformanceLoading(true);
    setError(null);
    
    try {
      const requestData: any = {
        alpha_factor: selectedFactor,
        start_date: startDate,
        end_date: endDate,
        transaction_cost: transactionCost,
        rebalancing_frequency: rebalancingFreq
      };
      
      if (selectionMethod === 'percentage') {
        requestData.top_percentage = topPercentage;
      } else {
        requestData.top_count = topCount;
      }
      
      // 디버깅 정보 출력
      console.log('=== 프론트엔드 디버깅 정보 ===');
      console.log('selectedFactor:', selectedFactor);
      console.log('selectionMethod:', selectionMethod);
      console.log('topCount:', topCount);
      console.log('topPercentage:', topPercentage);
      console.log('startDate:', startDate);
      console.log('endDate:', endDate);
      console.log('transactionCost:', transactionCost);
      console.log('rebalancingFreq:', rebalancingFreq);
      console.log('requestData:', requestData);
      
      const response: PortfolioPerformanceResponse = await apiService.getPortfolioPerformance(requestData);
      
      if (response.success) {
        setPerformanceData(response);
      } else {
        setError('성과 분석에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '성과 분석 중 오류가 발생했습니다.');
    } finally {
      setPerformanceLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const { Title, Text } = Typography;
  const { Option } = Select;
  const { RangePicker } = DatePicker;
  const { Panel } = Collapse;

  // 테이블 컬럼 정의
  const stockColumns = [
    {
      title: '순위',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Tag color={rank <= 3 ? 'gold' : rank <= 10 ? 'blue' : 'default'}>
          #{rank}
        </Tag>
      ),
    },
    {
      title: '종목코드',
      dataIndex: 'ticker',
      key: 'ticker',
      render: (ticker: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {ticker}
        </Text>
      ),
    },
    {
      title: '알파값',
      dataIndex: 'alpha_value',
      key: 'alpha_value',
      render: (value: number) => (
        <Tag color={value > 0 ? 'green' : 'red'}>
          {value.toFixed(4)}
        </Tag>
      ),
    },
    {
      title: '주가',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => 
        price ? formatCurrency(price) : '-',
    },
    {
      title: '회사명',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (name: string) => name || '-',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <FundOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            포트폴리오 관리
          </Title>
        </div>

        {/* 설정 패널 */}
        <Card title={
          <span>
            <BarChartOutlined style={{ marginRight: 8 }} />
            포트폴리오 설정
          </span>
        }>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Text strong>알파 팩터 선택</Text>
              <Select
                value={selectedFactor}
                onChange={setSelectedFactor}
                style={{ width: '100%', marginTop: 8 }}
                placeholder="알파 팩터를 선택하세요"
              >
                {factors.map(factor => (
                  <Option key={factor} value={factor}>
                    {factor}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Text strong>선별 방식</Text>
              <Radio.Group
                value={selectionMethod}
                onChange={(e) => setSelectionMethod(e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Radio value="percentage">퍼센트</Radio>
                <Radio value="count">개수</Radio>
              </Radio.Group>
            </Col>

            <Col xs={24} md={8}>
              {selectionMethod === 'percentage' ? (
                <>
                  <Text strong>상위 퍼센트 (%)</Text>
                  <Select
                    value={topPercentage}
                    onChange={setTopPercentage}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value={5}>상위 5%</Option>
                    <Option value={10}>상위 10%</Option>
                    <Option value={15}>상위 15%</Option>
                    <Option value={20}>상위 20%</Option>
                    <Option value={25}>상위 25%</Option>
                  </Select>
                </>
              ) : (
                <>
                  <Text strong>상위 종목 개수</Text>
                  <InputNumber
                    value={topCount}
                    onChange={(value) => setTopCount(value || 20)}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 20;
                      setTopCount(Math.max(1, Math.min(100, val)));
                    }}
                    min={1}
                    max={100}
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="상위 몇 개 종목"
                  />
                </>
              )}
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Button 
                type="primary"
                size="large"
                onClick={handleGetStocks}
                loading={loading}
                block
                icon={<ThunderboltOutlined />}
              >
                종목 선별
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 성과 분석 설정 패널 */}
        {portfolioData && (
          <Card title={
            <span>
              <RiseOutlined style={{ marginRight: 8 }} />
              성과 분석 설정
            </span>
          }>
            <Collapse>
              <Panel header="백테스트 파라미터 설정" key="1">
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={6}>
                    <Text strong>시작일</Text>
                    <DatePicker
                      value={startDate ? dayjs(startDate) : null}
                      onChange={(date) => setStartDate(date ? date.format('YYYY-MM-DD') : '2020-01-01')}
                      style={{ width: '100%', marginTop: 8 }}
                      format="YYYY-MM-DD"
                    />
                  </Col>
                  
                  <Col xs={24} md={6}>
                    <Text strong>종료일</Text>
                    <DatePicker
                      value={endDate ? dayjs(endDate) : null}
                      onChange={(date) => setEndDate(date ? date.format('YYYY-MM-DD') : '2024-12-31')}
                      style={{ width: '100%', marginTop: 8 }}
                      format="YYYY-MM-DD"
                    />
                  </Col>
                  
                  <Col xs={24} md={6}>
                    <Text strong>거래 수수료</Text>
                    <InputNumber
                      value={transactionCost}
                      onChange={(value) => setTransactionCost(value || 0.001)}
                      min={0}
                      max={0.01}
                      step={0.0001}
                      formatter={value => `${(parseFloat(String(value || '0')) * 100).toFixed(2)}%`}
                      parser={value => (parseFloat(String(value)?.replace('%', '') || '0') / 100)}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </Col>
                  
                  <Col xs={24} md={6}>
                    <Text strong>리밸런싱 주기</Text>
                          <Select
                            value={rebalancingFreq}
                            onChange={setRebalancingFreq}
                            style={{ width: '100%', marginTop: 8 }}
                          >
                            <Option value="daily">일별</Option>
                            <Option value="weekly">주별</Option>
                            <Option value="monthly">월별</Option>
                            <Option value="quarterly">분기별</Option>
                          </Select>
                  </Col>
                </Row>
              </Panel>
            </Collapse>
            
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary"
                onClick={handleGetPerformance}
                loading={performanceLoading}
                icon={<BarChartOutlined />}
                size="large"
                block
              >
                포트폴리오 성과 분석
              </Button>
            </div>
          </Card>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Alert
            message="오류"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 포트폴리오 요약 */}
        {portfolioData && (
          <Card title="포트폴리오 요약">
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Statistic
                  title="선별된 종목"
                  value={portfolioData.parameters.selected_stocks}
                  suffix="개"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="최고 알파값"
                  value={portfolioData.summary.best_alpha_value?.toFixed(4)}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="최저 알파값"
                  value={portfolioData.summary.worst_alpha_value?.toFixed(4)}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="선별 기준"
                  value={portfolioData.parameters.selection_method === 'percentage' 
                    ? `상위 ${portfolioData.parameters.top_percentage}%`
                    : `상위 ${portfolioData.parameters.top_count}개`}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16, color: '#666' }}>
              기준일: {portfolioData.parameters.date} | 
              전체 종목: {portfolioData.parameters.total_stocks}개 | 
              알파 팩터: {portfolioData.parameters.alpha_factor} |
              선별방식: {portfolioData.summary.selection_criteria}
            </div>
          </Card>
        )}

        {/* 성과 분석 결과 */}
        {performanceData && (
          <Card title={
            <span>
              <RiseOutlined style={{ marginRight: 8 }} />
              포트폴리오 성과 분석
            </span>
          }>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={8}>
                <Statistic
                  title="연평균 수익률 (CAGR)"
                  value={performanceData.performance.cagr * 100}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: performanceData.performance.cagr >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="샤프 비율"
                  value={performanceData.performance.sharpe_ratio}
                  precision={2}
                  valueStyle={{ color: performanceData.performance.sharpe_ratio >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="최대 낙폭 (MDD)"
                  value={Math.abs(performanceData.performance.max_drawdown) * 100}
                  precision={2}
                  suffix="%"
                  prefix="-"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="평균 IC"
                  value={performanceData.performance.ic_mean}
                  precision={4}
                  valueStyle={{ color: performanceData.performance.ic_mean >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="승률"
                  value={performanceData.performance.win_rate * 100}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: performanceData.performance.win_rate >= 0.5 ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="변동성"
                  value={performanceData.performance.volatility * 100}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#666' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16, color: '#666' }}>
              분석 기간: {performanceData.parameters.start_date} ~ {performanceData.parameters.end_date} |
              거래수수료: {(performanceData.parameters.transaction_cost * 100).toFixed(2)}% |
              리밸런싱: {performanceData.parameters.rebalancing_frequency}
            </div>
          </Card>
        )}

        {/* 선별된 종목 리스트 */}
        {portfolioData && (
          <Card title={`선별된 종목 (${portfolioData.stocks.length}개)`}>
            <Table
              columns={stockColumns}
              dataSource={portfolioData.stocks.map(stock => ({
                ...stock,
                key: stock.ticker
              }))}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} 종목`
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        )}

        {/* 사용 가이드 */}
        {!portfolioData && (
          <Card title="사용 가이드">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Title level={5}>
                  <TrophyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  1. 알파 팩터 선택
                </Title>
                <Text type="secondary">투자 전략에 맞는 알파 팩터를 선택하세요.</Text>
              </div>
              <div>
                <Title level={5}>
                  <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  2. 상위 퍼센트 설정
                </Title>
                <Text type="secondary">포트폴리오에 포함할 상위 종목의 비율을 설정하세요.</Text>
              </div>
              <div>
                <Title level={5}>
                  <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  3. 종목 선별
                </Title>
                <Text type="secondary">설정한 조건에 따라 투자할 종목을 자동으로 선별합니다.</Text>
              </div>
              <div>
                <Title level={5}>
                  <RiseOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  4. 성과 분석
                </Title>
                <Text type="secondary">선별된 포트폴리오의 과거 성과를 분석하여 투자 결정에 참고하세요.</Text>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default Portfolio;
