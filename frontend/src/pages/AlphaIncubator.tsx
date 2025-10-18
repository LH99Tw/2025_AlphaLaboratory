import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import { theme } from '../styles/theme';
import { PlayCircleOutlined, PauseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { startGAEvolution, getGAEvolutionStatus } from '../services/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  height: calc(100vh - 200px);
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 700;
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
    backdrop-filter: blur(10px);
    color: ${theme.colors.textPrimary};
    font-family: ${theme.typography.fontFamily.primary};
    min-width: 200px;
    
    /* Alpha 노드들에 리퀴드 글래스 금색 적용 */
    &[data-id="3"], &[data-id="4"] {
      background: ${theme.colors.liquidGoldGradient};
      border: 1px solid ${theme.colors.liquidGoldBorder};
      backdrop-filter: blur(15px);
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.1);
    }
    
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

const ControlPanel = styled(GlassCard)`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;
`;

const StatusBadge = styled.div<{ $running: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$running ? theme.colors.liquidGold : 'rgba(95, 99, 104, 0.1)'};
  border: 1px solid ${props => props.$running ? theme.colors.liquidGoldBorder : theme.colors.border};
  border-radius: 12px;
  color: ${props => props.$running ? theme.colors.textPrimary : theme.colors.textSecondary};
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
  backdrop-filter: blur(10px);
`;

const LogContainer = styled(GlassCard)`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-height: 400px;
  min-height: 200px;
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

const LogTitle = styled.h4`
  margin: 0;
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textPrimary};
  font-weight: 600;
`;

const ClearLogButton = styled.button`
  background: none;
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 8px;
  cursor: pointer;
  font-size: ${theme.typography.fontSize.caption};
  transition: all ${theme.transitions.spring};

  &:hover {
    border-color: ${theme.colors.accentPrimary};
    color: ${theme.colors.accentPrimary};
  }
`;

const LogContent = styled.div`
  flex: 1;
  overflow-y: auto;
  font-family: ${theme.typography.fontFamily.display};
  font-size: ${theme.typography.fontSize.caption};
  line-height: 1.4;
  color: ${theme.colors.textSecondary};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundSecondary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;

    &:hover {
      background: ${theme.colors.borderHover};
    }
  }
`;

const LogLine = styled.div`
  padding: ${theme.spacing.xs} 0;
  border-bottom: 1px solid rgba(95, 99, 104, 0.1);
  white-space: pre-wrap;
  word-break: break-all;

  &:last-child {
    border-bottom: none;
  }
`;

const BottomPanel = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  margin-top: ${theme.spacing.xl};
`;

const MainContent = styled.div`
  flex: 1;
`;

const LogPanel = styled.div`
  width: 500px;
  min-width: 400px;
  flex-shrink: 0;
`;

const NodeLabel = styled.div`
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.textPrimary};
`;

const NodeData = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.sm};
`;

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { 
      label: (
        <>
          <NodeLabel>📊 데이터 소스</NodeLabel>
          <NodeData>S&P 500 과거 데이터</NodeData>
        </>
      )
    },
    position: { x: 50, y: 50 },
  },
  {
    id: '2',
    data: { 
      label: (
        <>
          <NodeLabel>🧬 GA 엔진</NodeLabel>
          <NodeData>개체수: 50 | 세대: 1/10</NodeData>
        </>
      )
    },
    position: { x: 350, y: 50 },
  },
  {
    id: '3',
    data: { 
      label: (
        <>
          <NodeLabel>⚡ 알파 001</NodeLabel>
          <NodeData>적합도: 0.85 | 순위: 1</NodeData>
        </>
      )
    },
    position: { x: 350, y: 200 },
  },
  {
    id: '4',
    data: { 
      label: (
        <>
          <NodeLabel>⚡ 알파 002</NodeLabel>
          <NodeData>적합도: 0.72 | 순위: 2</NodeData>
        </>
      )
    },
    position: { x: 350, y: 350 },
  },
  {
    id: '5',
    type: 'output',
    data: { 
      label: (
        <>
          <NodeLabel>🎯 최고 알파</NodeLabel>
          <NodeData>거래용으로 선택됨</NodeData>
        </>
      )
    },
    position: { x: 650, y: 200 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e3-5', source: '3', target: '5', animated: true },
];

interface GAStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  current_generation?: number;
  total_generations?: number;
  best_fitness?: number;
  task_id?: string;
  results?: any[];
  logs?: string[];
}

export const AlphaIncubator: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [gaStatus, setGaStatus] = useState<GAStatus>({
    status: 'idle',
    progress: 0
  });
  const [isPolling, setIsPolling] = useState(false);
  const logContentRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // GA 실행 시작
  const handleStartGA = async () => {
    try {
      setGaStatus({ status: 'running', progress: 0 });

      const response = await startGAEvolution({
        population_size: 50,
        generations: 10,
        max_depth: 3
      });

      if (response.success && response.task_id) {
        setGaStatus(prev => ({
          ...prev,
          task_id: response.task_id,
          status: 'running'
        }));

        message.success('알파 진화가 시작되었습니다!');
        setIsPolling(true);
      } else {
        throw new Error(response.error || 'GA 실행에 실패했습니다');
      }
    } catch (error: any) {
      message.error(`GA 실행 실패: ${error.message}`);
      setGaStatus({ status: 'idle', progress: 0 });
    }
  };

  // GA 상태 폴링
  const pollGAStatus = useCallback(async () => {
    if (!gaStatus.task_id || !isPolling) return;

    try {
      const response = await getGAEvolutionStatus(gaStatus.task_id);

      setGaStatus(prev => {
        const newStatus = {
          ...prev,
          status: response.status,
          progress: response.progress || prev.progress,
          current_generation: response.current_generation,
          total_generations: response.total_generations,
          best_fitness: response.best_fitness,
          results: response.results,
          logs: response.logs || prev.logs || [],
          error: response.error,
          error_details: response.error_details
        };

        console.log('상태 업데이트:', {
          이전상태: prev.status,
          새상태: response.status,
          진행률: response.progress,
          결과수: response.results?.length || 0,
          로그수: response.logs?.length || 0
        });

        return newStatus;
      });

      // 완료 또는 실패 시 폴링 중지
      if (response.status === 'completed' || response.status === 'failed') {
        console.log('폴링 중단 조건 충족:', response.status);
        setIsPolling(false);

        if (response.status === 'completed') {
          message.success(`알파 진화가 완료되었습니다! 총 ${response.results?.length || 0}개 알파 생성`);
          updateNodesWithResults(response.results || []);
        } else {
          console.log('실패 상태 감지:', { error: response.error, error_details: response.error_details });
          const errorMessage = response.error || '알파 진화에 실패했습니다.';
          const errorDetails = response.error_details ? `\n\n세부 정보: ${response.error_details}` : '';
          message.error(`${errorMessage}${errorDetails}`);
        }
      }
    } catch (error: any) {
      console.error('GA 상태 조회 실패:', error);
      // 폴링은 계속 유지하되 에러는 조용히 처리
    }
  }, [gaStatus.task_id, isPolling]);

  // 폴링 효과
  useEffect(() => {
    if (isPolling && gaStatus.task_id) {
      console.log('폴링 시작:', gaStatus.task_id);
      const interval = setInterval(pollGAStatus, 3000); // 3초마다 폴링 (더 길게)
      return () => {
        console.log('폴링 중단');
        clearInterval(interval);
      };
    }
  }, [isPolling, pollGAStatus, gaStatus.task_id]);

  // 로그 업데이트 시 자동 스크롤
  useEffect(() => {
    if (logContentRef.current && gaStatus.logs && gaStatus.logs.length > 0) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [gaStatus.logs]);

  // 노드 업데이트 함수
  const updateNodesWithResults = (results: any[]) => {
    if (!results || results.length === 0) return;

    const updatedNodes = nodes.map(node => {
      if (node.id === '3') {
        return {
          ...node,
          data: {
            label: (
              <>
                <NodeLabel>⚡ 알파 001</NodeLabel>
                <NodeData>
                  {results[0] ? `적합도: ${results[0].fitness?.toFixed(4) || 'N/A'}` : '데이터 없음'}
                </NodeData>
              </>
            )
          }
        };
      }
      if (node.id === '4') {
        return {
          ...node,
          data: {
            label: (
              <>
                <NodeLabel>⚡ 알파 002</NodeLabel>
                <NodeData>
                  {results[1] ? `적합도: ${results[1].fitness?.toFixed(4) || 'N/A'}` : '데이터 없음'}
                </NodeData>
              </>
            )
          }
        };
      }
      return node;
    });

    // 노드 상태 업데이트
    setNodes(updatedNodes);
  };

  // 로그 클리어 함수
  const clearLogs = () => {
    setGaStatus(prev => ({
      ...prev,
      logs: []
    }));
  };

  return (
    <Container>
      <div>
        <Title>알파 부화장</Title>
        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
          AI 기반 알파 연구 어시스턴트
        </p>
      </div>

      <ControlPanel>
        <StatusBadge $running={gaStatus.status === 'running'}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: gaStatus.status === 'running' ? theme.colors.accentPrimary : theme.colors.textSecondary
          }} />
          {gaStatus.status === 'running'
            ? `진화 중 (${gaStatus.current_generation || 0}/${gaStatus.total_generations || 0})`
            : gaStatus.status === 'completed'
            ? '완료됨'
            : gaStatus.status === 'failed'
            ? '실패함'
            : '대기 중'
          }
        </StatusBadge>

        <GlassButton
          variant="primary"
          onClick={handleStartGA}
          disabled={gaStatus.status === 'running' || isPolling}
          icon={
            gaStatus.status === 'running' || isPolling
              ? <LoadingOutlined />
              : <PlayCircleOutlined />
          }
        >
          {gaStatus.status === 'running' || isPolling
            ? `진화 중... (${gaStatus.progress}%)`
            : '진화 시작'
          }
        </GlassButton>
      </ControlPanel>

      <BottomPanel>
        <MainContent>
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
        </MainContent>

        <LogPanel>
          <LogContainer>
            <LogHeader>
              <LogTitle>실행 로그</LogTitle>
              <ClearLogButton onClick={clearLogs}>
                로그 초기화
              </ClearLogButton>
            </LogHeader>

            <LogContent ref={logContentRef}>
              {gaStatus.logs && gaStatus.logs.length > 0 ? (
                gaStatus.logs.map((log, index) => (
                  <LogLine key={index}>{log}</LogLine>
                ))
              ) : (
                <LogLine style={{
                  color: theme.colors.textSecondary,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: theme.spacing.xl
                }}>
                  GA 실행을 시작하면 실시간 로그가 여기에 표시됩니다.<br/>
                  "진화 시작" 버튼을 클릭해보세요!
                </LogLine>
              )}
            </LogContent>
          </LogContainer>
        </LogPanel>
      </BottomPanel>
    </Container>
  );
};
