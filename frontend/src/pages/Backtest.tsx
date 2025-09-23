import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  DatePicker,
  Select,
  Table,
  Alert,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Progress,
  InputNumber,
} from 'antd';
import { BarChartOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService, type BacktestParams, type BacktestAsyncResult, type BacktestStatus, type FactorList } from '../services/api';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface BacktestResultData {
  factor: string;
  cagr?: number;
  sharpe?: number;
  mdd?: number;
  ic?: number;
  [key: string]: any;
}

interface RunningTask {
  taskId: string;
  status: BacktestStatus;
  startTime: Date;
  params: BacktestParams;
}

const Backtest: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [factorsLoading, setFactorsLoading] = useState(true);
  const [factors, setFactors] = useState<string[]>([]);
  const [results, setResults] = useState<BacktestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);
  const [pollingIntervals, setPollingIntervals] = useState<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    loadFactors();
    
    // 컴포넌트 언마운트 시 모든 폴링 인터벌 정리
    return () => {
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
    };
  }, [pollingIntervals]);

  const loadFactors = async () => {
    try {
      setFactorsLoading(true);
      const data: FactorList = await apiService.getFactors();
      setFactors(data.factors || []);
    } catch (err: any) {
      setError('알파 팩터 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setFactorsLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      const params: BacktestParams = {
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1].format('YYYY-MM-DD'),
        factors: values.factors,
        rebalancing_frequency: values.rebalancing_frequency,
        transaction_cost: values.transaction_cost,
        quantile: values.quantile,
        max_factors: values.factors.length,
      };

      const result: BacktestAsyncResult = await apiService.runBacktest(params);
      
      if (result.success) {
        const newTask: RunningTask = {
          taskId: result.task_id,
          status: { status: 'running', progress: 0 },
          startTime: new Date(),
          params: params,
        };
        
        setRunningTasks(prev => [newTask, ...prev].slice(0, 2));
        
        // 작업 상태 폴링 시작
        startPolling(result.task_id);
        
        // 성공 메시지 표시
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || '백테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getBacktestStatus(taskId);
        
        setRunningTasks(prev => prev.map(task => 
          task.taskId === taskId 
            ? { ...task, status }
            : task
        ));
        
        // 작업이 완료되거나 실패하면 폴링 중지
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const { [taskId]: removed, ...rest } = prev;
            return rest;
          });
          
          // 완료된 작업은 결과로 설정
          if (status.status === 'completed') {
            setResults(status);
          }
        }
      } catch (err) {
        console.error('폴링 오류:', err);
      }
    }, 2000); // 2초마다 폴링
    
    setPollingIntervals(prev => ({ ...prev, [taskId]: interval }));
  };

  // 결과 테이블 데이터 변환
  const getTableData = (): BacktestResultData[] => {
    if (!results?.results) return [];
    
    return Object.entries(results.results).map(([factor, data]: [string, any]) => ({
      factor,
      cagr: data.cagr,
      sharpe: data.sharpe_ratio,
      mdd: data.max_drawdown,
      ic: data.ic_mean,
      ...data,
    }));
  };

  // 실행 시간 포맷
  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    } else {
      return `${seconds}초`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <span style={{ color: '#1890ff' }}>🔄</span>;
      case 'completed':
        return <span style={{ color: '#52c41a' }}>✅</span>;
      case 'failed':
        return <span style={{ color: '#ff4d4f' }}>❌</span>;
      default:
        return <span>⏳</span>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return '대기 중';
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '알파 팩터',
      dataIndex: 'factor',
      key: 'factor',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: 'CAGR (%)',
      dataIndex: 'cagr',
      key: 'cagr',
      render: (value: number) => value ? `${(value * 100).toFixed(2)}%` : 'N/A',
      sorter: (a: BacktestResultData, b: BacktestResultData) => (a.cagr || 0) - (b.cagr || 0),
    },
    {
      title: 'Sharpe Ratio',
      dataIndex: 'sharpe',
      key: 'sharpe',
      render: (value: number) => value ? value.toFixed(3) : 'N/A',
      sorter: (a: BacktestResultData, b: BacktestResultData) => (a.sharpe || 0) - (b.sharpe || 0),
    },
    {
      title: 'MDD (%)',
      dataIndex: 'mdd',
      key: 'mdd',
      render: (value: number) => value ? `${(value * 100).toFixed(2)}%` : 'N/A',
      sorter: (a: BacktestResultData, b: BacktestResultData) => (a.mdd || 0) - (b.mdd || 0),
    },
    {
      title: 'IC (평균)',
      dataIndex: 'ic',
      key: 'ic',
      render: (value: number) => value ? value.toFixed(4) : 'N/A',
      sorter: (a: BacktestResultData, b: BacktestResultData) => (a.ic || 0) - (b.ic || 0),
    },
  ];

  // 차트 데이터 준비
  const getChartData = () => {
    const tableData = getTableData();
    return tableData.map(item => ({
      factor: item.factor.replace('alpha', ''),
      CAGR: item.cagr ? (item.cagr * 100) : 0,
      'Sharpe Ratio': item.sharpe || 0,
      IC: item.ic ? (item.ic * 100) : 0, // IC를 100배로 스케일링
    }));
  };

  return (
    <div className="page-container">
      <div className="content-card">
        <Title level={2}>
          <BarChartOutlined /> 백테스트
        </Title>
        <Paragraph>
          선택한 알파 팩터들에 대해 백테스트를 실행하고 성과를 분석합니다.
        </Paragraph>
      </div>

      {/* 백테스트 설정 폼 */}
      <div className="form-section">
        <Title level={3}>백테스트 설정</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            dateRange: [dayjs('2020-01-01'), dayjs('2024-12-31')],
            factors: ['alpha001', 'alpha002'],
            rebalancing_frequency: 'weekly',
            transaction_cost: 0.001,
            quantile: 0.1,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="백테스트 기간"
                name="dateRange"
                rules={[{ required: true, message: '백테스트 기간을 선택해주세요' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item
                label="알파 팩터 선택"
                name="factors"
                rules={[{ required: true, message: '알파 팩터를 선택해주세요' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="alpha001, alpha002"
                  loading={factorsLoading}
                  showSearch
                  filterOption={(input, option) => {
                    if (!option) return false;
                    const label = option.label?.toString().toLowerCase() || '';
                    const value = option.value?.toString().toLowerCase() || '';
                    return label.includes(input.toLowerCase()) || value.includes(input.toLowerCase());
                  }}
                >
                  {factors.map(factor => (
                    <Option key={factor} value={factor}>
                      {factor}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="리밸런싱 주기"
                name="rebalancing_frequency"
                rules={[{ required: true, message: '리밸런싱 주기를 선택해주세요' }]}
                tooltip="포트폴리오를 재구성하는 주기입니다"
              >
                <Select placeholder="매주">
                  <Option value="daily">매일</Option>
                  <Option value="weekly">매주</Option>
                  <Option value="monthly">매월</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="거래비용 (%)"
                name="transaction_cost"
                rules={[{ required: true, message: '거래비용을 입력해주세요' }]}
                tooltip="매매 시 발생하는 비용 (0.001 = 0.1%)"
              >
                <InputNumber
                  min={0}
                  max={0.01}
                  step={0.0001}
                  precision={4}
                  style={{ width: '100%' }}
                  placeholder="0.10%"
                  formatter={(value) => `${((value || 0) * 100).toFixed(2)}%`}
                  parser={(value) => {
                    const parsed = parseFloat(value?.replace('%', '') || '0') / 100;
                    return Math.max(0, Math.min(0.01, parsed)) as any;
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="분위수"
                name="quantile"
                rules={[{ required: true, message: '분위수를 입력해주세요' }]}
                tooltip={
                  <div>
                    상위/하위 몇 %를 선택할지 결정<br />
                    (0.1 = 상위/하위 10%)
                  </div>
                }
              >
                <InputNumber
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="10%"
                  formatter={(value) => `${((value || 0) * 100).toFixed(0)}%`}
                  parser={(value) => {
                    const parsed = parseFloat(value?.replace('%', '') || '0') / 100;
                    return Math.max(0.05, Math.min(0.5, parsed)) as any;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<PlayCircleOutlined />}
              size="large"
            >
              백테스트 실행
            </Button>
            
            <Button
              style={{ marginLeft: 8 }}
              onClick={loadFactors}
              loading={factorsLoading}
              icon={<ReloadOutlined />}
            >
              팩터 목록 새로고침
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* 오류 표시 */}
      {error && (
        <Alert
          message="오류 발생"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 로딩 표시 */}
      {loading && (
        <div className="loading-container">
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>백테스트를 시작하는 중...</Paragraph>
        </div>
      )}

      {/* 실행 중인 작업들 (최대 2개) */}
      {runningTasks.length > 0 && (
        <div className="content-card">
          <Title level={3}>실행 중인 백테스트</Title>
          <Row gutter={[16, 16]}>
            {runningTasks.map((task) => (
              <Col xs={24} lg={12} key={task.taskId}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getStatusIcon(task.status.status)}
                      <span>{task.taskId}</span>
                      <span style={{ 
                        background: task.status.status === 'completed' ? '#52c41a' : 
                                  task.status.status === 'failed' ? '#ff4d4f' : '#1890ff',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {getStatusText(task.status.status)}
                      </span>
                    </div>
                  }
                  extra={<span style={{ fontSize: '12px', color: '#666' }}>{formatDuration(task.startTime)}</span>}
                  size="small"
                >
                  <Row gutter={8}>
                    <Col span={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>기간</div>
                      <div style={{ fontSize: '13px' }}>{task.params.start_date} ~ {task.params.end_date}</div>
                    </Col>
                    <Col span={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>팩터 수</div>
                      <div style={{ fontSize: '13px' }}>{task.params.factors.length}개</div>
                    </Col>
                    <Col span={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>리밸런싱</div>
                      <div style={{ fontSize: '13px' }}>{task.params.rebalancing_frequency || 'weekly'}</div>
                    </Col>
                    <Col span={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>진행률</div>
                      <div style={{ fontSize: '13px' }}>{task.status.progress}%</div>
                    </Col>
                  </Row>
                  
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <div style={{ fontSize: '12px', color: '#666' }}>거래비용</div>
                      <div style={{ fontSize: '13px' }}>{((task.params.transaction_cost || 0.001) * 100).toFixed(2)}%</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: '12px', color: '#666' }}>분위수</div>
                      <div style={{ fontSize: '13px' }}>{((task.params.quantile || 0.1) * 100).toFixed(0)}%</div>
                    </Col>
                  </Row>
                  
                  {task.status.status === 'running' && (
                    <div style={{ marginTop: 12 }}>
                      <Progress 
                        percent={task.status.progress} 
                        status="active"
                        strokeColor="#1890ff"
                        size="small"
                      />
                    </div>
                  )}
                  
                  {task.status.status === 'failed' && task.status.error && (
                    <Alert
                      message="실행 실패"
                      description={task.status.error}
                      type="error"
                      showIcon
                      style={{ marginTop: 12 }}
                    />
                  )}
                  
                  {task.status.status === 'completed' && (
                    <div style={{ marginTop: 12 }}>
                      <Alert
                        message="백테스트 완료!"
                        description="결과를 아래에서 확인하세요."
                        type="success"
                        showIcon
                      />
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* 백테스트 결과 */}
      {results && !loading && (
        <div className="results-section">
          <Title level={3}>백테스트 결과</Title>
          
          {/* 요약 통계 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="총 팩터 수"
                value={results.results ? Object.keys(results.results).length : 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="분석 기간"
                value={results.parameters ? `${results.parameters.start_date} ~ ${results.parameters.end_date}` : 'N/A'}
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="평균 CAGR"
                value={`${(getTableData().reduce((sum, item) => sum + (item.cagr || 0), 0) / getTableData().length * 100).toFixed(2)}%`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="평균 Sharpe"
                value={(getTableData().reduce((sum, item) => sum + (item.sharpe || 0), 0) / getTableData().length).toFixed(3)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>

          <Divider />

          {/* 성과 차트 */}
          <Card title="성과 비교 차트" style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="factor" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="CAGR" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="CAGR (%)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="Sharpe Ratio" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Sharpe Ratio"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="IC" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="IC (×100)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* 상세 결과 테이블 */}
          <Card title="상세 결과">
            <Table
              columns={columns}
              dataSource={getTableData()}
              rowKey="factor"
              scroll={{ x: 800 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Backtest;
