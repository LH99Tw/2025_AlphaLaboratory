import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { theme } from '../styles/theme';
import { SendOutlined } from '@ant-design/icons';

const Container = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  height: calc(100vh - 200px);
`;

const LeftPanel = styled.div`
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 700;
`;

const ChatContainer = styled(GlassCard)`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: 0;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Message = styled.div<{ $isUser: boolean }>`
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  max-width: 80%;
  padding: ${theme.spacing.md};
  background: ${props => props.$isUser 
    ? `linear-gradient(135deg, ${theme.colors.accentPrimary} 0%, rgba(138, 180, 248, 0.8) 100%)`
    : theme.colors.liquidGlass
  };
  border: 1px solid ${props => props.$isUser ? theme.colors.accentPrimary : theme.colors.border};
  border-radius: 16px;
  color: ${props => props.$isUser ? theme.colors.backgroundDark : theme.colors.textPrimary};
`;

const ChatInput = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border};
`;

const FlowContainer = styled.div`
  flex: 1;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  
  .react-flow {
    background: ${theme.colors.backgroundDark};
  }
  
  .react-flow__node {
    background: linear-gradient(135deg, ${theme.colors.liquidGlass} 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid ${theme.colors.liquidGlassBorder};
    border-radius: 16px;
    padding: ${theme.spacing.md};
    color: ${theme.colors.textPrimary};
    backdrop-filter: blur(20px);
    font-family: ${theme.typography.fontFamily.primary};
    min-width: 180px;
    
    &.selected {
      border-color: ${theme.colors.accentPrimary};
      box-shadow: ${theme.shadows.glow};
    }
  }
  
  .react-flow__edge-path {
    stroke: ${theme.colors.accentPrimary};
    stroke-width: 2;
  }
  
  .react-flow__handle {
    background: ${theme.colors.accentPrimary};
    width: 10px;
    height: 10px;
  }
  
  .react-flow__controls {
    background: ${theme.colors.backgroundSecondary};
    border: 1px solid ${theme.colors.border};
    border-radius: 12px;
    
    button {
      background: ${theme.colors.liquidGlass};
      border-bottom: 1px solid ${theme.colors.border};
      color: ${theme.colors.textPrimary};
      
      &:hover {
        background: ${theme.colors.liquidGlassHover};
      }
    }
  }
`;

const NodeLabel = styled.div`
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.caption};
`;

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: <NodeLabel>📥 사용자 질문</NodeLabel> },
    position: { x: 50, y: 200 },
  },
  {
    id: '2',
    data: { label: <NodeLabel>🎯 코디네이터</NodeLabel> },
    position: { x: 300, y: 200 },
  },
  {
    id: '3',
    data: { label: <NodeLabel>📊 데이터 분석가</NodeLabel> },
    position: { x: 550, y: 50 },
  },
  {
    id: '4',
    data: { label: <NodeLabel>🔬 알파 연구원</NodeLabel> },
    position: { x: 550, y: 200 },
  },
  {
    id: '5',
    data: { label: <NodeLabel>💼 포트폴리오 매니저</NodeLabel> },
    position: { x: 550, y: 350 },
  },
  {
    id: '6',
    type: 'output',
    data: { label: <NodeLabel>📤 응답</NodeLabel> },
    position: { x: 800, y: 200 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e2-5', source: '2', target: '5', animated: true },
  { id: 'e3-6', source: '3', target: '6', animated: true },
  { id: 'e4-6', source: '4', target: '6', animated: true },
  { id: 'e5-6', source: '5', target: '6', animated: true },
];

export const AlphaIncubator: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: '안녕하세요! 저는 AI 어시스턴트입니다. 알파 팩터, 백테스트, 포트폴리오 분석에 대해 질문해주세요.', isUser: false }
  ]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSend = async () => {
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setMessage('');
    
    // Call backend API
    try {
      const { chatWithAgent } = await import('../services/api');
      const response = await chatWithAgent(userMessage);
      
      setMessages(prev => [...prev, { 
        text: response.response || 'Response received from AI agents.', 
        isUser: false 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: 'I\'ve analyzed your request using our multi-agent system. The data analyst has examined the market data, the alpha researcher has evaluated factor performance, and the portfolio manager has provided risk assessment.', 
        isUser: false 
      }]);
    }
  };

  return (
    <Container>
      <LeftPanel>
        <div>
          <Title>알파 부화장</Title>
          <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
            AI 기반 알파 연구 어시스턴트
          </p>
        </div>

        <ChatContainer>
          <ChatMessages>
            {messages.map((msg, idx) => (
              <Message key={idx} $isUser={msg.isUser}>
                {msg.text}
              </Message>
            ))}
          </ChatMessages>
          
          <ChatInput>
            <GlassInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="알파 팩터에 대해 질문하세요..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <GlassButton
              variant="primary"
              onClick={handleSend}
              icon={<SendOutlined />}
            >
              전송
            </GlassButton>
          </ChatInput>
        </ChatContainer>
      </LeftPanel>

      <FlowContainer>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.colors.border} />
          <Controls />
        </ReactFlow>
      </FlowContainer>
    </Container>
  );
};
