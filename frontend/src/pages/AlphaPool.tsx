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
import { theme } from '../styles/theme';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

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
    color: ${theme.colors.textPrimary};
    backdrop-filter: blur(20px);
    font-family: ${theme.typography.fontFamily.primary};
    min-width: 200px;
    
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
  background: ${props => props.$running ? 'rgba(138, 180, 248, 0.1)' : 'rgba(95, 99, 104, 0.1)'};
  border: 1px solid ${props => props.$running ? theme.colors.accentPrimary : theme.colors.border};
  border-radius: 12px;
  color: ${props => props.$running ? theme.colors.accentPrimary : theme.colors.textSecondary};
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
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
          <NodeLabel>📊 Data Source</NodeLabel>
          <NodeData>S&P 500 Historical Data</NodeData>
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
          <NodeLabel>🧬 GA Engine</NodeLabel>
          <NodeData>Population: 50 | Gen: 1/10</NodeData>
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
          <NodeLabel>⚡ Alpha 001</NodeLabel>
          <NodeData>Fitness: 0.85 | Rank: 1</NodeData>
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
          <NodeLabel>⚡ Alpha 002</NodeLabel>
          <NodeData>Fitness: 0.72 | Rank: 2</NodeData>
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
          <NodeLabel>🎯 Best Alpha</NodeLabel>
          <NodeData>Selected for trading</NodeData>
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

export const AlphaPool: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Container>
      <div>
        <Title>Alpha Pool - GA Evolution</Title>
        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
          Genetic Algorithm based alpha factor evolution
        </p>
      </div>

      <ControlPanel>
        <StatusBadge $running={isRunning}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isRunning ? theme.colors.accentPrimary : theme.colors.textSecondary
          }} />
          {isRunning ? 'Running' : 'Stopped'}
        </StatusBadge>
        
        <GlassButton
          variant="primary"
          onClick={() => setIsRunning(!isRunning)}
          icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        >
          {isRunning ? 'Pause' : 'Start Evolution'}
        </GlassButton>
      </ControlPanel>

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
