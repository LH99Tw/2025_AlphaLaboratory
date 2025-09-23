import React, { useState, useRef, useEffect } from 'react';
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
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  ClearOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
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

const AIAgent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const chatMessage: ChatMessage = { message: userMessage.content };
      const response: ChatResponse = await apiService.chat(chatMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date(response.timestamp),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'AI 에이전트와의 통신 중 오류가 발생했습니다.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '죄송합니다. 현재 응답할 수 없습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
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

  const suggestedQuestions = [
    'alpha001을 분석해줘',
    '새로운 알파 팩터를 제안해줘',
    '백테스트 결과를 해석해줘',
    '현재 시장에 맞는 전략을 추천해줘',
    'IC가 뭐야?',
    'Sharpe ratio에 대해 설명해줘',
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      <div className="content-card">
        <Title level={2}>
          <RobotOutlined /> AI 에이전트
        </Title>
        <Paragraph>
          LangChain 기반 멀티 에이전트 시스템과 대화하며 퀀트 금융 분석에 대한 도움을 받으세요.
        </Paragraph>
      </div>

      {/* 제안 질문 */}
      <Card title="추천 질문" style={{ marginBottom: 16 }}>
        <Space wrap>
          {suggestedQuestions.map((question, index) => (
            <Tag
              key={index}
              color="blue"
              style={{ cursor: 'pointer', marginBottom: 8 }}
              onClick={() => handleSuggestedQuestion(question)}
            >
              <BulbOutlined /> {question}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* 오류 표시 */}
      {error && (
        <Alert
          message="통신 오류"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 채팅 영역 */}
      <Card>
        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#999'
              }}>
                <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>
                  <Text>안녕하세요! 퀀트 금융 분석 AI 에이전트입니다.</Text>
                  <br />
                  <Text type="secondary">궁금한 것이 있으시면 언제든 물어보세요.</Text>
                </div>
              </div>
            ) : (
              <List
                dataSource={messages}
                renderItem={(message) => (
                  <List.Item style={{ 
                    border: 'none',
                    padding: '8px 0',
                  }}>
                    <div className={`chat-message ${message.type}`}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        gap: 8,
                        flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                      }}>
                        <Avatar 
                          icon={message.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                          style={{ 
                            flexShrink: 0,
                            backgroundColor: message.type === 'user' ? '#1890ff' : '#52c41a'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            background: message.type === 'user' ? '#1890ff' : '#f5f5f5',
                            color: message.type === 'user' ? 'white' : 'black',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            wordBreak: 'break-word',
                          }}>
                            <pre style={{ 
                              margin: 0, 
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'inherit'
                            }}>
                              {message.content}
                            </pre>
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatTimestamp(message.timestamp)}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="chat-input-area">
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈, Enter: 전송)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1 }}
              disabled={loading}
            />
            <Space direction="vertical">
              <Tooltip title="메시지 전송">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  loading={loading}
                  disabled={!inputValue.trim()}
                />
              </Tooltip>
              <Tooltip title="대화 내역 지우기">
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearMessages}
                  disabled={messages.length === 0 || loading}
                />
              </Tooltip>
            </Space>
          </div>
        </div>
      </Card>

      {/* 도움말 */}
      <Card title={<><QuestionCircleOutlined /> 사용법</>} style={{ marginTop: 16 }}>
        <Paragraph>
          <Text strong>AI 에이전트 기능:</Text>
        </Paragraph>
        <ul>
          <li><Text>📊 <strong>DataAnalyst:</strong> 알파 팩터 분석, 통계 계산, 데이터 품질 검증</Text></li>
          <li><Text>🧬 <strong>AlphaResearcher:</strong> 새로운 알파 팩터 제안, WorldQuant 스타일 수식 생성</Text></li>
          <li><Text>💼 <strong>PortfolioManager:</strong> 백테스트 전략 분석, 리스크 관리, 성과 평가</Text></li>
          <li><Text>🔧 <strong>CodeGenerator:</strong> 파이썬 코드 구현, 알파 팩터 코딩, 최적화</Text></li>
        </ul>
        
        <Paragraph style={{ marginTop: 16 }}>
          <Text strong>질문 예시:</Text>
        </Paragraph>
        <ul>
          <li><Text>"alpha001을 분석해줘"</Text></li>
          <li><Text>"모멘텀 기반 알파를 만들어줘"</Text></li>
          <li><Text>"백테스트 전략을 분석해줘"</Text></li>
          <li><Text>"rank(correlation(delta(close, 5), volume, 10)) 코드화해줘"</Text></li>
        </ul>
      </Card>
    </div>
  );
};

export default AIAgent;
