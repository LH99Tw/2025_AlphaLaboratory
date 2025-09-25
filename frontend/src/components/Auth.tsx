import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Tabs,
  Space,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { apiService, type LoginRequest, type RegisterRequest, type User } from '../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('login');

  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.login(values);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterRequest) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiService.register(values);
      setSuccess('회원가입이 완료되었습니다! 로그인해주세요.');
      registerForm.resetFields();
      setActiveTab('login');
    } catch (err: any) {
      setError(err.response?.data?.error || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        borderRadius: '12px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            🚀 퀀트 금융 분석
          </Title>
          <Text type="secondary">WorldQuant 스타일 알파 팩터 분석 시스템</Text>
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

        {success && (
          <Alert
            message="성공"
            description={success}
            type="success"
            showIcon
            closable
            onClose={() => setSuccess(null)}
            style={{ marginBottom: '16px' }}
          />
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane
            tab={
              <span>
                <LoginOutlined />
                로그인
              </span>
            }
            key="login"
          >
            <Form
              form={loginForm}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                label="사용자명"
                name="username"
                rules={[
                  { required: true, message: '사용자명을 입력해주세요!' },
                  { min: 3, message: '사용자명은 3글자 이상이어야 합니다!' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="사용자명을 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="비밀번호"
                name="password"
                rules={[
                  { required: true, message: '비밀번호를 입력해주세요!' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="비밀번호를 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: '8px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<LoginOutlined />}
                >
                  로그인
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '16px 0' }} />
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">테스트 계정</Text>
              <br />
              <Space direction="vertical" size="small" style={{ marginTop: '8px' }}>
                <Text code>admin / admin123</Text>
                <Text code>demo / demo123</Text>
              </Space>
            </div>
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserAddOutlined />
                회원가입
              </span>
            }
            key="register"
          >
            <Form
              form={registerForm}
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                label="사용자명"
                name="username"
                rules={[
                  { required: true, message: '사용자명을 입력해주세요!' },
                  { min: 3, message: '사용자명은 3글자 이상이어야 합니다!' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '사용자명은 영문, 숫자, _만 사용 가능합니다!' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="사용자명을 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="이름"
                name="name"
                rules={[
                  { required: true, message: '이름을 입력해주세요!' },
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="실명을 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { required: true, message: '이메일을 입력해주세요!' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다!' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="이메일을 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="비밀번호"
                name="password"
                rules={[
                  { required: true, message: '비밀번호를 입력해주세요!' },
                  { min: 6, message: '비밀번호는 6글자 이상이어야 합니다!' },
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="비밀번호를 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="비밀번호 확인"
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '비밀번호를 다시 입력해주세요!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('비밀번호가 일치하지 않습니다!'));
                    },
                  }),
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="비밀번호를 다시 입력하세요"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: '8px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<UserAddOutlined />}
                >
                  회원가입
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
