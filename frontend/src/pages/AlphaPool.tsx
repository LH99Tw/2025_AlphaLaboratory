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
  Steps,
  Space,
} from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  BarChartOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { apiService, type GAParams, type GAAsyncResult, type GAStatus, type GABacktestParams } from '../services/api';

const { Title, Paragraph } = Typography;

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

const AlphaPool: React.FC = () => {
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
      setError(err.message || '알파 Pool 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startGAPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getGAStatus(taskId);
        
        setTasks(prev => prev.map(task => 
          task.taskId === taskId 
            ? { ...task, gaStatus: status }
            : task
        ));

        if (status.status === 'completed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[taskId];
            return newIntervals;
          });
          
          // GA 완료 후 백테스트 자동 시작
          startBacktestForTask(taskId);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[taskId];
            return newIntervals;
          });
          
          setTasks(prev => prev.map(task => 
            task.taskId === taskId 
              ? { ...task, stage: 'failed' }
              : task
          ));
        }
      } catch (err) {
        console.error('GA 상태 확인 오류:', err);
      }
    }, 2000);

    setPollingIntervals(prev => ({ ...prev, [taskId]: interval }));
  };

  const startBacktestForTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.taskId === taskId);
      if (!task || !task.backtestSettings) return;

      const backtestParams: GABacktestParams = {
        start_date: task.backtestSettings.start_date,
        end_date: task.backtestSettings.end_date,
        rebalancing_frequency: task.backtestSettings.rebalancing_frequency,
        transaction_cost: task.backtestSettings.transaction_cost,
        quantile: task.backtestSettings.quantile
      };

      const backtestResult = await apiService.backtestGAResults(taskId, backtestParams);
      
      if (backtestResult.success) {
        setTasks(prev => prev.map(t => 
          t.taskId === taskId 
            ? { 
                ...t, 
                backtestTaskId: backtestResult.backtest_task_id,
                stage: 'backtest_running'
              }
            : t
        ));
        
        // 백테스트 폴링 시작
        startBacktestPolling(taskId, backtestResult.backtest_task_id);
      }
    } catch (err) {
      console.error('백테스트 시작 오류:', err);
      setTasks(prev => prev.map(task => 
        task.taskId === taskId 
          ? { ...task, stage: 'failed' }
          : task
      ));
    }
  };

  const startBacktestPolling = (gaTaskId: string, backtestTaskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getBacktestStatus(backtestTaskId);
        
        setTasks(prev => prev.map(task => 
          task.taskId === gaTaskId 
            ? { ...task, backtestStatus: status }
            : task
        ));

        if (status.status === 'completed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[`backtest_${gaTaskId}`];
            return newIntervals;
          });
          
          setTasks(prev => prev.map(task => 
            task.taskId === gaTaskId 
              ? { ...task, stage: 'backtest_completed' }
              : task
          ));
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[`backtest_${gaTaskId}`];
            return newIntervals;
          });
          
          setTasks(prev => prev.map(task => 
            task.taskId === gaTaskId 
              ? { ...task, stage: 'failed' }
              : task
          ));
        }
      } catch (err) {
        console.error('백테스트 상태 확인 오류:', err);
      }
    }, 3000);

    setPollingIntervals(prev => ({ ...prev, [`backtest_${gaTaskId}`]: interval }));
  };

  const getStatusIcon = (stage: string) => {
    switch (stage) {
      case 'ga_running':
      case 'backtest_running':
        return <LoadingOutlined />;
      case 'ga_completed':
      case 'backtest_completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CrownOutlined />;
    }
  };

  const getStatusText = (stage: string) => {
    switch (stage) {
      case 'ga_running':
        return '알파 생성 중';
      case 'ga_completed':
        return '알파 생성 완료';
      case 'backtest_running':
        return '백테스트 실행 중';
      case 'backtest_completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return '대기 중';
    }
  };

  const getProgress = (task: GAFullTaskInfo) => {
    if (task.stage === 'ga_running') {
      return task.gaStatus.progress || 0;
    } else if (task.stage === 'backtest_running') {
      return 50 + ((task.backtestStatus?.progress || 0) / 2);
    } else if (task.stage === 'backtest_completed') {
      return 100;
    }
    return 0;
  };

  const columns = [
    {
      title: '상태',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string, record: GAFullTaskInfo) => (
        <Space>
          {getStatusIcon(stage)}
          <span>{getStatusText(stage)}</span>
        </Space>
      ),
    },
    {
      title: '진행률',
      dataIndex: 'progress',
      key: 'progress',
      render: (_: any, record: GAFullTaskInfo) => (
        <Progress 
          percent={getProgress(record)} 
          size="small" 
          status={record.stage === 'failed' ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: '시작 시간',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: Date) => time.toLocaleString(),
    },
    {
      title: '세대 수',
      dataIndex: ['params', 'generations'],
      key: 'generations',
    },
    {
      title: '개체 수',
      dataIndex: ['params', 'population_size'],
      key: 'population_size',
    },
    {
      title: '알파 수',
      dataIndex: ['params', 'max_alphas'],
      key: 'max_alphas',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <CrownOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
            알파 Pool
          </Title>
          <Paragraph>
            진화 알고리즘을 통해 우수한 알파 팩터를 자동 생성하고 최적화하는 고급 분석 도구입니다.
            유전 알고리즘 기반의 자동 알파 생성 및 성과 분석을 제공합니다.
          </Paragraph>
        </div>

        {error && (
          <Alert
            message="오류"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '16px' }}
          />
        )}

        <Row gutter={24}>
          <Col span={12}>
            <Card title="알파 생성 설정" size="small">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  start_date: '2020-01-01',
                  end_date: '2024-12-31',
                  population_size: 50,
                  generations: 10,
                  max_alphas: 5,
                  rebalancing_frequency: 'weekly',
                  transaction_cost: 0.001,
                  quantile: 0.1
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="시작 날짜"
                      name="start_date"
                      rules={[{ required: true, message: '시작 날짜를 입력해주세요' }]}
                    >
                      <input type="date" style={{ width: '100%', padding: '4px 8px' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="종료 날짜"
                      name="end_date"
                      rules={[{ required: true, message: '종료 날짜를 입력해주세요' }]}
                    >
                      <input type="date" style={{ width: '100%', padding: '4px 8px' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="개체 수"
                      name="population_size"
                      rules={[{ required: true, message: '개체 수를 입력해주세요' }]}
                    >
                      <InputNumber min={10} max={200} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="세대 수"
                      name="generations"
                      rules={[{ required: true, message: '세대 수를 입력해주세요' }]}
                    >
                      <InputNumber min={5} max={50} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="최대 알파 수"
                      name="max_alphas"
                      rules={[{ required: true, message: '최대 알파 수를 입력해주세요' }]}
                    >
                      <InputNumber min={1} max={20} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="리밸런싱 주기"
                      name="rebalancing_frequency"
                    >
                      <select style={{ width: '100%', padding: '4px 8px' }}>
                        <option value="daily">매일</option>
                        <option value="weekly">매주</option>
                        <option value="monthly">매월</option>
                        <option value="quarterly">분기별</option>
                      </select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="거래비용"
                      name="transaction_cost"
                    >
                      <InputNumber min={0} max={0.01} step={0.001} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="분위수"
                      name="quantile"
                    >
                      <InputNumber min={0.01} max={0.5} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    icon={<CrownOutlined />}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    알파 Pool 시작
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="실행 상태" size="small">
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <CrownOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>아직 실행된 알파 Pool이 없습니다.</div>
                  <div>설정을 입력하고 시작 버튼을 눌러주세요.</div>
                </div>
              ) : (
                <Table
                  dataSource={tasks}
                  columns={columns}
                  pagination={false}
                  size="small"
                  rowKey="taskId"
                />
              )}
            </Card>
          </Col>
        </Row>

        {tasks.length > 0 && (
          <Card title="실행 단계" style={{ marginTop: '24px' }}>
            <Steps
              current={tasks[0]?.stage === 'ga_running' ? 0 : 
                      tasks[0]?.stage === 'ga_completed' ? 1 :
                      tasks[0]?.stage === 'backtest_running' ? 2 :
                      tasks[0]?.stage === 'backtest_completed' ? 3 : -1}
              items={[
                {
                  title: '알파 생성',
                  description: '유전 알고리즘을 통한 알파 팩터 생성',
                  icon: <CrownOutlined />,
                },
                {
                  title: '알파 완료',
                  description: '알파 팩터 생성 완료',
                  icon: <CheckCircleOutlined />,
                },
                {
                  title: '백테스트',
                  description: '생성된 알파의 성과 검증',
                  icon: <BarChartOutlined />,
                },
                {
                  title: '완료',
                  description: '전체 프로세스 완료',
                  icon: <TrophyOutlined />,
                },
              ]}
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

export default AlphaPool;