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
import { GlassButton } from '../components/common/GlassButton';
import { theme } from '../styles/theme';
import { PlayCircleOutlined } from '@ant-design/icons';
import { NodeConfigModal } from '../components/AlphaFactory/NodeConfigModal';
import { AlphaListPanel } from '../components/AlphaFactory/AlphaListPanel';
import { message as antdMessage } from 'antd';
import { runGA, getGAStatus, saveUserAlphas } from '../services/api';
import { GAParams } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  height: calc(100vh - 200px);
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 700;
`;

const Description = styled.p`
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.sm} 0 0 0;
  font-size: ${theme.typography.fontSize.body};
`;

const FlowSection = styled.div`
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FlowContainer = styled.div`
  flex: 1;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  min-height: 400px;
  
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
    min-width: 160px;
    cursor: pointer;
    
    &.selected {
      border-color: ${theme.colors.accentPrimary};
      box-shadow: ${theme.shadows.glow};
    }
    
    &.completed {
      border-color: ${theme.colors.accentPrimary};
      background: ${theme.colors.liquidGoldGradient};
    }
  }
  
  .react-flow__edge-path {
    stroke: ${theme.colors.border};
    stroke-width: 2;
    transition: all ${theme.transitions.spring};
  }
  
  .react-flow__edge.completed .react-flow__edge-path {
    stroke: ${theme.colors.accentGold} !important;
    stroke-width: 3 !important;
    stroke-dasharray: 10 5 !important;
    animation: dashFlow 1.5s linear infinite;
    filter: drop-shadow(0 0 8px ${theme.colors.accentGold});
  }
  
  @keyframes dashFlow {
    to {
      stroke-dashoffset: -15;
    }
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
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.body};
  text-align: center;
`;

const NodeStatus = styled.div<{ $status?: 'pending' | 'running' | 'completed' | 'failed' }>`
  font-size: ${theme.typography.fontSize.caption};
  color: ${props => {
    switch (props.$status) {
      case 'completed': return theme.colors.success;
      case 'running': return theme.colors.accentPrimary;
      case 'failed': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  }};
  text-align: center;
`;

interface NodeData {
  completed: boolean;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  config?: any;
}

const createNodeContent = (label: string, status?: string) => (
  <div>
    <NodeLabel>{label}</NodeLabel>
    {status && <NodeStatus $status={status as any}>{
      status === 'pending' ? '대기 중' :
      status === 'running' ? '실행 중...' :
      status === 'completed' ? '완료' : '실패'
    }</NodeStatus>}
  </div>
);

export const AlphaPool: React.FC = () => {
  // 노드 상태 관리
  const [nodeStates, setNodeStates] = useState<Record<string, NodeData>>({
    'data-node': { completed: false, status: 'pending', config: { dataSource: 'sp500' } },
    'backtest-node': { completed: false, status: 'pending', config: {} },
    'ga-node': { completed: false, status: 'pending', config: {} },
    'evolution-node': { completed: false, status: 'pending', config: { progress: 0 } },
    'results-node': { completed: false, status: 'pending', config: {} },
  });

  // 초기 노드 설정
  const initialNodes: Node[] = [
    {
      id: 'data-node',
      type: 'input',
      data: { label: createNodeContent('📊 데이터 소스', nodeStates['data-node'].status) },
      position: { x: 50, y: 200 },
      className: nodeStates['data-node'].completed ? 'completed' : '',
    },
    {
      id: 'backtest-node',
      data: { label: createNodeContent('⚙️ 백테스트 조건', nodeStates['backtest-node'].status) },
      position: { x: 300, y: 200 },
      className: nodeStates['backtest-node'].completed ? 'completed' : '',
    },
    {
      id: 'ga-node',
      data: { label: createNodeContent('🧬 GA 엔진', nodeStates['ga-node'].status) },
      position: { x: 550, y: 200 },
      className: nodeStates['ga-node'].completed ? 'completed' : '',
    },
    {
      id: 'evolution-node',
      data: { label: createNodeContent('🔄 진화 과정', nodeStates['evolution-node'].status) },
      position: { x: 800, y: 200 },
      className: nodeStates['evolution-node'].completed ? 'completed' : '',
    },
    {
      id: 'results-node',
      type: 'output',
      data: { label: createNodeContent('✅ 최종 결과', nodeStates['results-node'].status) },
      position: { x: 1050, y: 200 },
      className: nodeStates['results-node'].completed ? 'completed' : '',
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: 'data-node',
      target: 'backtest-node',
      animated: false,
      className: nodeStates['data-node'].completed ? 'completed' : '',
    },
    {
      id: 'e2-3',
      source: 'backtest-node',
      target: 'ga-node',
      animated: false,
      className: nodeStates['backtest-node'].completed ? 'completed' : '',
    },
    {
      id: 'e3-4',
      source: 'ga-node',
      target: 'evolution-node',
      animated: false,
      className: nodeStates['ga-node'].completed ? 'completed' : '',
    },
    {
      id: 'e4-5',
      source: 'evolution-node',
      target: 'results-node',
      animated: false,
      className: nodeStates['evolution-node'].completed ? 'completed' : '',
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'data' | 'backtest' | 'ga' | 'evolution' | 'results'>('data');

  // GA 관련 상태
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 최종 알파 리스트
  const [alphaList, setAlphaList] = useState<any[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 노드 더블클릭 이벤트
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeTypeMap: Record<string, 'data' | 'backtest' | 'ga' | 'evolution' | 'results'> = {
      'data-node': 'data',
      'backtest-node': 'backtest',
      'ga-node': 'ga',
      'evolution-node': 'evolution',
      'results-node': 'results',
    };

    setSelectedNodeId(node.id);
    setSelectedNodeType(nodeTypeMap[node.id]);
    setModalVisible(true);
  }, []);

  // 노드 설정 저장
  const handleSaveNodeConfig = useCallback((data: any) => {
    if (!selectedNodeId) return;

    setNodeStates(prev => ({
      ...prev,
      [selectedNodeId]: {
        ...prev[selectedNodeId],
        completed: true,
        status: 'completed',
        config: data,
      },
    }));

    antdMessage.success('설정이 저장되었습니다');
  }, [selectedNodeId]);

  // GA 상태 폴링
  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const interval = setInterval(async () => {
      try {
        const data = await getGAStatus(taskId);

        if (data.status === 'completed') {
          clearInterval(interval);
          pollingRef.current = null;

          setNodeStates(prev => ({
            ...prev,
            'evolution-node': {
              ...prev['evolution-node'],
              status: 'completed',
              completed: true,
              config: { ...data, progress: 100 },
            },
            'results-node': {
              ...prev['results-node'],
              status: 'completed',
              completed: true,
              config: { alphas: data.results || [] },
            },
          }));

          const formattedAlphas = (data.results || []).map((alpha: any, index: number) => {
            // 10자리 랜덤 해시값 생성 함수
            const generateHash = () => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
              let result = '';
              for (let i = 0; i < 10; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return result;
            };

            return {
              id: `alpha_${Date.now()}_${index}`,
              name: `알파_${generateHash()}`, // 10자리 랜덤 해시값으로 이름 생성
              expression: alpha.expression,
              fitness: alpha.fitness,
              selected: false,
            };
          });

          setAlphaList(formattedAlphas);
          antdMessage.success('GA가 완료되었습니다!');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          pollingRef.current = null;

          setNodeStates(prev => ({
            ...prev,
            'evolution-node': { ...prev['evolution-node'], status: 'failed' },
          }));

          antdMessage.error('GA 실행이 실패했습니다');
        } else {
          setNodeStates(prev => ({
            ...prev,
            'evolution-node': {
              ...prev['evolution-node'],
              config: { ...data, progress: data.progress || 0 },
            },
          }));
        }
      } catch (error) {
        console.error('GA 상태 확인 오류:', error);
      }
    }, 1000);

    pollingRef.current = interval;
  }, [setNodeStates]);

  // GA 실행 함수
  const handleRunGA = useCallback(async () => {
    if (!nodeStates['ga-node'].completed) {
      antdMessage.warning('GA 엔진 설정을 먼저 완료해주세요');
      return;
    }

    const gaConfig = nodeStates['ga-node'].config || {};

    try {
      setNodeStates(prev => ({
        ...prev,
        'ga-node': { ...prev['ga-node'], status: 'running' },
        'evolution-node': { ...prev['evolution-node'], status: 'running' },
      }));

      const payload = {
        start_date: gaConfig.startDate || '',
        end_date: gaConfig.endDate || '',
        population_size: gaConfig.populationSize || 50,
        generations: gaConfig.generations || 20,
        max_alphas: gaConfig.maxAlphas || 5,
        max_depth: gaConfig.maxDepth || 10,
        rebalancing_frequency: gaConfig.rebalancing_frequency || 'monthly',
        transaction_cost: gaConfig.transaction_cost || 0.001,
        quantile: gaConfig.quantile || 0.1,
      } as GAParams;

      const data = await runGA(payload);

      if (data.success && data.task_id) {
        antdMessage.success('GA가 시작되었습니다!');
        startPolling(data.task_id);
      } else {
        throw new Error('GA 시작 실패');
      }
    } catch (error) {
      console.error('GA 실행 오류:', error);
      antdMessage.error('GA 실행 중 오류가 발생했습니다');
      setNodeStates(prev => ({
        ...prev,
        'ga-node': { ...prev['ga-node'], status: 'failed' },
        'evolution-node': { ...prev['evolution-node'], status: 'failed' },
      }));
    }
  }, [nodeStates, setNodeStates, startPolling]);

  // 알파 저장
  const handleSaveAlphas = useCallback(async (selectedAlphas: any[]) => {
    try {
      const data = await saveUserAlphas(selectedAlphas);

      if (data.success) {
        antdMessage.success(`${selectedAlphas.length}개의 알파가 저장되었습니다!`);
      } else {
        throw new Error(data.error || '저장 실패');
      }
    } catch (error: any) {
      console.error('알파 저장 오류:', error);
      antdMessage.error(error.message || '알파 저장 중 오류가 발생했습니다');
    }
  }, []);

  // 노드 및 엣지 업데이트
  useEffect(() => {
    setNodes(prevNodes => prevNodes.map(node => ({
      ...node,
      data: {
        label: createNodeContent(
          node.id === 'data-node' ? '📊 데이터 소스' :
          node.id === 'backtest-node' ? '⚙️ 백테스트 조건' :
          node.id === 'ga-node' ? '🧬 GA 엔진' :
          node.id === 'evolution-node' ? '🔄 진화 과정' : '✅ 최종 결과',
          nodeStates[node.id]?.status
        ),
      },
      className: nodeStates[node.id]?.completed ? 'completed' : '',
    })));

    setEdges(prevEdges => prevEdges.map(edge => {
      const isCompleted = nodeStates[edge.source]?.completed;
      const isRunning = nodeStates[edge.source]?.status === 'running';

      return {
        ...edge,
        className: isCompleted ? 'completed' : '',
        animated: isRunning,
        style: isCompleted ? {
          stroke: theme.colors.accentGold,
          strokeWidth: 3,
          strokeDasharray: '10, 5',
          filter: `drop-shadow(0 0 8px ${theme.colors.accentGold})`,
        } : undefined,
      };
    }));
  }, [nodeStates, setNodes, setEdges]);

  // 컴포넌트 언마운트 시 폴링 중지
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return (
    <Container>
      <TopSection>
        <div>
          <Title>알파 풀</Title>
          <Description>
            유전 알고리즘 기반 알파 팩터 생성 시스템
          </Description>
        </div>

        <GlassButton
          variant="primary"
          onClick={handleRunGA}
          disabled={!nodeStates['ga-node'].completed || nodeStates['evolution-node'].status === 'running'}
          icon={<PlayCircleOutlined />}
        >
          {nodeStates['evolution-node'].status === 'running' ? 'GA 실행 중...' : 'GA 실행'}
        </GlassButton>
      </TopSection>

      <FlowSection>
        <FlowContainer>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.colors.border} />
            <Controls />
          </ReactFlow>
        </FlowContainer>

        {alphaList.length > 0 && (
          <AlphaListPanel
            alphas={alphaList}
            onChange={setAlphaList}
            onSave={handleSaveAlphas}
          />
        )}
      </FlowSection>

      <NodeConfigModal
        visible={modalVisible}
        nodeType={selectedNodeType}
        nodeData={selectedNodeId ? nodeStates[selectedNodeId]?.config : {}}
        onSave={handleSaveNodeConfig}
        onClose={() => setModalVisible(false)}
      />
    </Container>
  );
};
