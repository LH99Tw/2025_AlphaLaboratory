import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Typography,
  Row,
  Col,
  Alert,
  Progress,
  Table,
  Tag,
  Divider,
  Steps,
  Space,
} from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  TrophyOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { apiService, type GAParams, type GAAsyncResult, type GAStatus, type GABacktestParams, type GABacktestResult } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

interface GAFullTaskInfo {
  taskId: string;
  gaStatus: GAStatus;
  backtestTaskId?: string;
  backtestStatus?: any;
  startTime: Date;
  params: GAParams;
  backtestSettings?: {
    start_date: string;
    end_date: string;
    rebalancing_frequency: string;
    transaction_cost: number;
    quantile: number;
    max_alphas?: number;
  };
  stage: 'ga_running' | 'ga_completed' | 'backtest_running' | 'backtest_completed' | 'failed';
}

const GAEvolution: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<GAFullTaskInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pollingIntervals, setPollingIntervals] = useState<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    // 컴포넌트 언마운트 시 모든 폴링 인터벌 정리
    return () => {
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
    };
  }, [pollingIntervals]);

  const onFinish = async (values: GAParams) => {
    try {
      setLoading(true);
      setError(null);

      const result: GAAsyncResult = await apiService.runGA(values);
      
      if (result.success) {
        const newTask: GAFullTaskInfo = {
          taskId: result.task_id,
          gaStatus: { status: 'running', progress: 0 },
          startTime: new Date(),
          params: values,
          backtestSettings: {
            start_date: values.start_date || '2020-01-01',
            end_date: values.end_date || '2024-12-31',
            rebalancing_frequency: values.rebalancing_frequency || 'weekly',
            transaction_cost: values.transaction_cost || 0.001,
            quantile: values.quantile || 0.1,
            max_alphas: values.max_alphas || 10
          },
          stage: 'ga_running'
        };
        
        setTasks(prev => [newTask, ...prev].slice(0, 2));
        
        // GA 폴링 시작
        startGAPolling(result.task_id);
      }
    } catch (err: any) {
      setError(err.message || 'GA 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startGAPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const gaStatus = await apiService.getGAStatus(taskId);
        
        setTasks(prev => prev.map(task => 
          task.taskId === taskId 
            ? { ...task, gaStatus, stage: gaStatus.status === 'completed' ? 'ga_completed' : 'ga_running' }
            : task
        ));
        
        // GA 완료 시 자동으로 백테스트 시작
        if (gaStatus.status === 'completed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const { [taskId]: removed, ...rest } = prev;
            return rest;
          });
          
          // 자동으로 백테스트 시작
          await startBacktestForGA(taskId);
        } else if (gaStatus.status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const { [taskId]: removed, ...rest } = prev;
            return rest;
          });
          
          setTasks(prev => prev.map(task => 
            task.taskId === taskId 
              ? { ...task, stage: 'failed' }
              : task
          ));
        }
      } catch (err) {
        console.error('GA 폴링 오류:', err);
      }
    }, 2000);
    
    setPollingIntervals(prev => ({ ...prev, [taskId]: interval }));
  };

  const startBacktestForGA = async (gaTaskId: string) => {
    try {
      // 해당 GA 작업의 백테스트 설정 가져오기
      const gaTask = tasks.find(t => t.taskId === gaTaskId);
      const backtestSettings = gaTask?.backtestSettings || {
        start_date: '2020-01-01',
        end_date: '2024-12-31',
        rebalancing_frequency: 'weekly',
        transaction_cost: 0.001,
        quantile: 0.1,
      };

      const params: GABacktestParams = backtestSettings;

      const result: GABacktestResult = await apiService.backtestGAResults(gaTaskId, params);
      
      if (result.success) {
        // 백테스트 시작됨
        setTasks(prev => prev.map(task => 
          task.taskId === gaTaskId 
            ? { ...task, backtestTaskId: result.backtest_task_id, stage: 'backtest_running' }
            : task
        ));
        
        // 백테스트 폴링 시작
        startBacktestPolling(gaTaskId, result.backtest_task_id);
      }
    } catch (err: any) {
      setError(err.message || 'GA 백테스트 시작 중 오류가 발생했습니다.');
      setTasks(prev => prev.map(task => 
        task.taskId === gaTaskId 
          ? { ...task, stage: 'failed' }
          : task
      ));
    }
  };

  const startBacktestPolling = (gaTaskId: string, backtestTaskId: string) => {
    const interval = setInterval(async () => {
      try {
        const backtestStatus = await apiService.getBacktestStatus(backtestTaskId);
        
        setTasks(prev => prev.map(task => 
          task.taskId === gaTaskId 
            ? { 
                ...task, 
                backtestStatus, 
                stage: backtestStatus.status === 'completed' ? 'backtest_completed' : 
                       backtestStatus.status === 'failed' ? 'failed' : 'backtest_running'
              }
            : task
        ));
        
        if (backtestStatus.status === 'completed' || backtestStatus.status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const { [`${gaTaskId}_backtest`]: removed, ...rest } = prev;
            return rest;
          });
        }
      } catch (err) {
        console.error('백테스트 폴링 오류:', err);
      }
    }, 2000);
    
    setPollingIntervals(prev => ({ ...prev, [`${gaTaskId}_backtest`]: interval }));
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'ga_running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'ga_completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'backtest_running':
        return <LoadingOutlined style={{ color: '#722ed1' }} />;
      case 'backtest_completed':
        return <TrophyOutlined style={{ color: '#f5222d' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExperimentOutlined />;
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'ga_running':
        return '진화 알고리즘 실행 중';
      case 'ga_completed':
        return '알파 생성 완료';
      case 'backtest_running':
        return '백테스트 실행 중';
      case 'backtest_completed':
        return '전체 과정 완료';
      case 'failed':
        return '실행 실패';
      default:
        return '대기 중';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'ga_running':
        return 'processing';
      case 'ga_completed':
        return 'success';
      case 'backtest_running':
        return 'processing';
      case 'backtest_completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const resultColumns = [
    {
      title: '순위',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (rank: number) => (
        <Tag color={rank <= 3 ? 'gold' : 'blue'}>#{rank}</Tag>
      ),
    },
    {
      title: '알파 표현식',
      dataIndex: 'expression',
      key: 'expression',
      render: (text: string) => (
        <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
          {text.length > 50 ? `${text.substring(0, 50)}...` : text}
        </Text>
      ),
    },
    {
      title: 'Fitness',
      dataIndex: 'fitness',
      key: 'fitness',
      width: 100,
      render: (fitness: number) => (
        <Tag color={fitness > 0.8 ? 'green' : fitness > 0.6 ? 'orange' : 'red'}>
          {fitness?.toFixed(3) || 'N/A'}
        </Tag>
      ),
    },
  ];

  const backtestColumns = [
    {
      title: '팩터명',
      dataIndex: 'factor',
      key: 'factor',
      width: 120,
    },
    {
      title: 'CAGR',
      dataIndex: 'cagr',
      key: 'cagr',
      width: 100,
      render: (value: number) => (
        <Tag color={value > 0.15 ? 'green' : value > 0.05 ? 'orange' : 'red'}>
          {(value * 100).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: 'Sharpe',
      dataIndex: 'sharpe_ratio',
      key: 'sharpe_ratio',
      width: 100,
      render: (value: number) => (
        <Tag color={value > 1.5 ? 'green' : value > 1.0 ? 'orange' : 'red'}>
          {value?.toFixed(2) || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'MDD',
      dataIndex: 'max_drawdown',
      key: 'max_drawdown',
      width: 100,
      render: (value: number) => (
        <Tag color={value > -0.1 ? 'green' : value > -0.2 ? 'orange' : 'red'}>
          {(value * 100).toFixed(1)}%
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ 
      padding: '24px 32px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: '#fafafa',
      minHeight: '100vh'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '32px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <Title level={2} style={{ marginBottom: '16px', color: '#262626' }}>
          <ExperimentOutlined style={{ marginRight: 12, color: '#722ed1' }} />
          진화 알고리즘 - 자동 알파 생성 & 백테스트
        </Title>
        
        <Paragraph style={{ 
          fontSize: '16px', 
          color: '#595959', 
          marginBottom: 0,
          lineHeight: '1.6'
        }}>
          유전 알고리즘을 사용하여 최적의 알파 팩터를 자동 생성하고, 즉시 백테스트를 수행합니다.
          GA 완료 후 자동으로 백테스트가 시작되어 최종 성과까지 확인할 수 있습니다.
        </Paragraph>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card 
          title="GA 설정" 
          bordered={false}
          style={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Row gutter={[24, 20]} align="top">
              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="개체수"
                  name="population_size"
                  rules={[{ required: true, message: '개체수를 입력해주세요' }]}
                >
                  <InputNumber 
                    min={10} 
                    max={200} 
                    style={{ width: '100%' }} 
                    placeholder="50"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="세대수"
                  name="generations"
                  rules={[{ required: true, message: '세대수를 입력해주세요' }]}
                >
                  <InputNumber 
                    min={5} 
                    max={100} 
                    style={{ width: '100%' }} 
                    placeholder="20"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="최대 깊이"
                  name="max_depth"
                  rules={[{ required: true, message: '최대 깊이를 입력해주세요' }]}
                >
                  <InputNumber 
                    min={2} 
                    max={8} 
                    style={{ width: '100%' }} 
                    placeholder="3"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="생성할 알파 개수"
                  name="max_alphas"
                >
                  <InputNumber 
                    min={5} 
                    max={50} 
                    style={{ width: '100%' }} 
                    placeholder="10"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="백테스트 시작일"
                  name="start_date"
                >
                  <InputNumber 
                    min={2015} 
                    max={2025} 
                    style={{ width: '100%' }} 
                    placeholder="2020"
                    formatter={value => `${value}-01-01`}
                    parser={value => parseInt(value?.toString().split('-')[0] || '2020') as any}
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                <Form.Item
                  label="백테스트 종료일"
                  name="end_date"
                >
                  <InputNumber 
                    min={2020} 
                    max={2025} 
                    style={{ width: '100%' }} 
                    placeholder="2024"
                    formatter={value => `${value}-12-31`}
                    parser={value => parseInt(value?.toString().split('-')[0] || '2024') as any}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row justify="center" style={{ marginTop: 24 }}>
              <Col>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    icon={<RocketOutlined />}
                    size="large"
                    style={{
                      height: '48px',
                      fontSize: '16px',
                      fontWeight: '500',
                      paddingLeft: '32px',
                      paddingRight: '32px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(24, 144, 255, 0.2)'
                    }}
                  >
                    진화 알고리즘 시작
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {error && (
          <Alert
            message="오류 발생"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <Card 
          title={`GA 작업 현황 (최대 2개)`} 
          bordered={false}
          style={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }}
        >
          {tasks.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 40px', 
              color: '#8c8c8c',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '2px dashed #d9d9d9'
            }}>
              <ExperimentOutlined style={{ 
                fontSize: '64px', 
                marginBottom: '24px',
                color: '#d9d9d9' 
              }} />
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                진행 중인 작업이 없습니다
              </div>
              <div style={{ fontSize: '14px', color: '#bfbfbf' }}>
                위에서 GA를 시작해보세요!
              </div>
            </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {tasks.map((task) => (
                  <Card 
                    key={task.taskId} 
                    size="small"
                    style={{ 
                      border: task.stage === 'backtest_completed' ? '2px solid #52c41a' : '1px solid #e8e8e8',
                      backgroundColor: task.stage === 'backtest_completed' ? '#f6ffed' : '#fff',
                      borderRadius: '8px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text strong>작업 ID: {task.taskId}</Text>
                        <Tag color={getStageColor(task.stage)} icon={getStageIcon(task.stage)}>
                          {getStageText(task.stage)}
                        </Tag>
                      </div>
                      
                      <Steps size="small" current={
                        task.stage === 'ga_running' ? 0 :
                        task.stage === 'ga_completed' ? 1 :
                        task.stage === 'backtest_running' ? 2 :
                        task.stage === 'backtest_completed' ? 3 : -1
                      }>
                        <Step title="GA 실행" icon={<ExperimentOutlined />} />
                        <Step title="알파 생성" icon={<CheckCircleOutlined />} />
                        <Step title="백테스트" icon={<BarChartOutlined />} />
                        <Step title="완료" icon={<TrophyOutlined />} />
                      </Steps>
                    </div>

                    {/* GA 진행률 */}
                    {(task.stage === 'ga_running' || task.stage === 'ga_completed') && task.gaStatus && (
                      <div style={{ 
                        marginBottom: 20,
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <Text strong style={{ color: '#495057', marginBottom: '8px', display: 'block' }}>
                          GA 진행률
                        </Text>
                        <Progress 
                          percent={task.gaStatus.progress} 
                          status={task.gaStatus.status === 'failed' ? 'exception' : 'active'}
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                          trailColor="#f0f0f0"
                          strokeWidth={8}
                        />
                      </div>
                    )}

                    {/* 백테스트 진행률 */}
                    {(task.stage === 'backtest_running' || task.stage === 'backtest_completed') && task.backtestStatus && (
                      <div style={{ 
                        marginBottom: 20,
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <Text strong style={{ color: '#495057', marginBottom: '8px', display: 'block' }}>
                          백테스트 진행률
                        </Text>
                        <Progress 
                          percent={task.backtestStatus.progress} 
                          status={task.backtestStatus.status === 'failed' ? 'exception' : 'active'}
                          strokeColor={{
                            '0%': '#722ed1',
                            '100%': '#eb2f96',
                          }}
                          trailColor="#f0f0f0"
                          strokeWidth={8}
                        />
                      </div>
                    )}

                    {/* GA 결과 */}
                    {task.gaStatus?.status === 'completed' && task.gaStatus.results && (
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                          생성된 최적 알파들
                        </Title>
                        <Table
                          dataSource={task.gaStatus.results.map((result: any, index: number) => ({
                            key: index,
                            rank: index + 1,
                            expression: result.expression || result.toString(),
                            fitness: result.fitness,
                          }))}
                          columns={resultColumns}
                          pagination={{ pageSize: 3, size: 'small' }}
                          size="small"
                        />
                      </div>
                    )}

                    {/* 백테스트 결과 */}
                    {task.stage === 'backtest_completed' && task.backtestStatus?.results && (
                      <div>
                        <Divider />
                        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                          <TrophyOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                          백테스트 성과 결과
                        </Title>
                        <Table
                          dataSource={Object.entries(task.backtestStatus.results).map(([factor, data]: [string, any]) => ({
                            key: factor,
                            factor,
                            cagr: data.cagr,
                            sharpe_ratio: data.sharpe_ratio,
                            max_drawdown: data.max_drawdown,
                          }))}
                          columns={backtestColumns}
                          pagination={{ pageSize: 5, size: 'small' }}
                          size="small"
                        />
                      </div>
                    )}

                    <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                      시작 시간: {task.startTime.toLocaleString()}
                    </div>
                  </Card>
                ))}
              </Space>
            )}
        </Card>
      </Space>
    </div>
  );
};

export default GAEvolution;