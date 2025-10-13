import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Typography,
  Avatar,
  List,
  Alert,
  Tag,
  Space,
  Row,
  Col,
} from 'antd';
import {
  ThunderboltOutlined,
  UserOutlined,
  SendOutlined,
  ClearOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { apiService, type ChatMessage, type ChatResponse } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AlphaIncubator: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const chatMessage: ChatMessage = {
        message: inputValue.trim()
      };

      const response: ChatResponse = await apiService.chat(chatMessage);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'AI 에이전트와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (type: 'user' | 'assistant') => {
    return type === 'user' ? <UserOutlined /> : <ThunderboltOutlined />;
  };

  const getMessageColor = (type: 'user' | 'assistant') => {
    return type === 'user' ? '#1890ff' : '#722ed1';
  };

  const suggestedQuestions = [
    "알파001의 성과를 분석해줘",
    "새로운 알파 팩터를 생성해줘",
    "포트폴리오 최적화 방법을 알려줘",
    "리스크 관리 전략을 제안해줘",
    "시장 상황을 분석해줘"
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <ThunderboltOutlined style={{ marginRight: '8px', color: '#13c2c2' }} />
            알파 부화장
          </Title>
          <Paragraph>
            AI 에이전트를 활용한 지능형 알파 팩터 생성 및 최적화 시스템입니다.
            LLM과 MCTS를 결합한 혁신적인 알파 개발 환경을 제공합니다.
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
          <Col span={16}>
            <Card title="AI 에이전트 대화" size="small">
              <div style={{ height: '400px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    <ThunderboltOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                    <div>AI 에이전트와 대화를 시작해보세요!</div>
                    <div>알파 팩터 생성, 성과 분석, 포트폴리오 최적화 등을 도와드립니다.</div>
                  </div>
                ) : (
                  <List
                    dataSource={messages}
                    renderItem={(message) => (
                      <List.Item style={{ border: 'none', padding: '8px 0' }}>
                        <div style={{ width: '100%' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '8px'
                          }}>
                            <div style={{
                              maxWidth: '70%',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              backgroundColor: message.type === 'user' ? '#1890ff' : '#f0f0f0',
                              color: message.type === 'user' ? 'white' : 'black'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                <Avatar 
                                  size="small" 
                                  icon={getMessageIcon(message.type)}
                                  style={{ 
                                    backgroundColor: getMessageColor(message.type),
                                    marginRight: '8px'
                                  }}
                                />
                                <Text style={{ 
                                  fontSize: '12px', 
                                  color: message.type === 'user' ? 'rgba(255,255,255,0.7)' : '#999'
                                }}>
                                  {message.type === 'user' ? '사용자' : 'AI 에이전트'}
                                </Text>
                              </div>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {message.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
                {loading && (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <Text type="secondary">AI 에이전트가 답변을 생성하고 있습니다...</Text>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="AI 에이전트에게 질문하세요..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  loading={loading}
                  disabled={!inputValue.trim()}
                >
                  전송
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                >
                  초기화
                </Button>
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card title="추천 질문" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    type="dashed"
                    size="small"
                    style={{ 
                      textAlign: 'left', 
                      height: 'auto', 
                      padding: '8px 12px',
                      whiteSpace: 'normal'
                    }}
                    onClick={() => setInputValue(question)}
                  >
                    <BulbOutlined style={{ marginRight: '4px' }} />
                    {question}
                  </Button>
                ))}
              </Space>
            </Card>

            <Card title="AI 에이전트 정보" size="small" style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <Avatar 
                  size={64} 
                  icon={<ThunderboltOutlined />} 
                  style={{ backgroundColor: '#13c2c2', marginBottom: '16px' }}
                />
                <Title level={4} style={{ margin: '0 0 8px 0' }}>알파 부화장 AI</Title>
                <Paragraph style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                  LLM과 MCTS를 결합한 지능형 알파 생성 시스템
                </Paragraph>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <Tag color="cyan" icon={<ThunderboltOutlined />}>알파 생성</Tag>
                <Tag color="blue" icon={<BulbOutlined />}>LLM 분석</Tag>
                <Tag color="purple">MCTS 최적화</Tag>
                <Tag color="green">지능형 분석</Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AlphaIncubator;