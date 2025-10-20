import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Input, Select, message, Alert, Empty, Tooltip } from 'antd';
import { SendOutlined, ThunderboltOutlined, ReloadOutlined, RobotOutlined } from '@ant-design/icons';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { AlphaCandidatePanel, AlphaCandidateItem } from '../components/AlphaFactory/AlphaCandidatePanel';
import { theme } from '../styles/theme';
import {
  postIncubatorChat,
  fetchIncubatorSession,
  saveUserAlphas,
} from '../services/api';
import type { IncubatorChatResponse, IncubatorMessage, MctsTraceEntry } from '../types';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${theme.spacing.md};
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  color: ${theme.colors.textPrimary};
  margin: 0;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.body};
`;

const Content = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  min-height: 620px;
`;

const ChatColumn = styled.div`
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  min-height: 560px;
  max-height: 640px;
`;

const ChatCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
  max-height: 640px;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
  gap: ${theme.spacing.md};
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
`;

const SessionTag = styled.span<{ $variant?: 'default' | 'warning' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 999px;
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'warning':
        return 'rgba(239, 68, 68, 0.15)';
      case 'pending':
        return 'rgba(138, 180, 248, 0.12)';
      default:
        return theme.colors.liquidGlass;
    }
  }};
  border: 1px solid
    ${({ $variant }) => {
      switch ($variant) {
        case 'warning':
          return 'rgba(239, 68, 68, 0.35)';
        case 'pending':
          return 'rgba(138, 180, 248, 0.4)';
        default:
          return theme.colors.liquidGlassBorder;
      }
    }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'warning':
        return '#fca5a5';
      case 'pending':
        return '#8ab4f8';
      default:
        return theme.colors.textSecondary;
    }
  }};
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
`;

const ModeSelect = styled(Select)`
  min-width: 180px;

  .ant-select-selector {
    background: ${theme.colors.liquidGlass};
    border-radius: 12px !important;
    border: 1px solid ${theme.colors.liquidGlassBorder} !important;
    color: ${theme.colors.textPrimary};
  }

  .ant-select-arrow {
    color: ${theme.colors.textSecondary};
  }
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;
  }
`;

const MessageRow = styled.div<{ $role: string }>`
  display: flex;
  justify-content: ${({ $role }) => ($role === 'assistant' ? 'flex-start' : 'flex-end')};
`;

const MessageBubble = styled.div<{ $role: string; $pending?: boolean }>`
  max-width: 75%;
  padding: ${theme.spacing.md};
  border-radius: 18px;
  line-height: 1.5;
  font-size: ${theme.typography.fontSize.body};
  color: ${({ $role }) =>
    $role === 'assistant' ? theme.colors.textPrimary : theme.colors.textPrimary};
  background: ${({ $role }) =>
    $role === 'assistant' ? theme.colors.liquidGlass : theme.colors.liquidGoldGradient};
  border: 1px solid
    ${({ $role }) =>
      $role === 'assistant' ? theme.colors.liquidGlassBorder : theme.colors.liquidGoldBorder};
  white-space: pre-wrap;
  word-break: break-word;
  opacity: ${({ $pending }) => ($pending ? 0.75 : 1)};
`;

const MessageMeta = styled.span`
  display: block;
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  text-align: right;
`;

const InputBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
  justify-content: space-between;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const CandidateColumn = styled.div`
  flex: 0 0 40%;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const TraceCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 260px;
  overflow: hidden;
`;

const TraceList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;
  }
`;

const TraceItem = styled.div`
  border-radius: 12px;
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  padding: ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  line-height: 1.4;
`;

const TraceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.textPrimary};
  font-weight: 600;
`;

const WarningList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

type Mode = 'generate' | 'chat';

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'generate', label: '알파 생성 (LangChain + MCTS)' },
  { value: 'chat', label: '플랫폼 Q&A' },
];

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildWelcomeMessage = (): IncubatorMessage => ({
  id: createMessageId(),
  role: 'assistant',
  content:
    '안녕하세요! AlphaIncubator입니다. 변동성·거래량·모멘텀 등 원하는 조건을 알려주시면 LangChain + MCTS로 맞춤형 알파 후보를 찾아드립니다.',
  timestamp: new Date().toISOString(),
});

const SESSION_STORAGE_KEY = 'alphaIncubatorSessionId';

const normalizeMessages = (history: IncubatorMessage[] | undefined): IncubatorMessage[] => {
  const source = history && history.length > 0 ? history : [buildWelcomeMessage()];
  return source.map((message) => ({
    ...message,
    id: message.id ?? createMessageId(),
    pending: false,
  }));
};

const mapCandidates = (
  apiResponse: IncubatorChatResponse | undefined,
  previous: AlphaCandidateItem[],
): AlphaCandidateItem[] => {
  if (!apiResponse?.candidates) {
    return previous;
  }
  return apiResponse.candidates.map((candidate, index) => {
    const existing = previous.find((item) => item.expression === candidate.expression);
    return {
      id: candidate.id || `candidate_${index + 1}`,
      name: candidate.name || `Alpha Candidate ${index + 1}`,
      expression: candidate.expression,
      rationale: candidate.rationale || '설명이 제공되지 않았습니다.',
      score: candidate.score ?? 0.4,
      path: candidate.path,
      selected: existing?.selected ?? false,
    };
  });
};

export const AlphaIncubator: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IncubatorMessage[]>([buildWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [candidates, setCandidates] = useState<AlphaCandidateItem[]>([]);
  const [trace, setTrace] = useState<MctsTraceEntry[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string>('unknown');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) {
      return;
    }

    fetchIncubatorSession(storedSession)
      .then((response) => {
        if (!response.success) {
          throw new Error(response.error || '세션을 불러오지 못했습니다.');
        }
        setSessionId(response.session_id);
        setMessages(normalizeMessages(response.history));
        setCandidates(
          (response.candidates || []).map((candidate, index) => ({
            id: candidate.id || `candidate_${index + 1}`,
            name: candidate.name || `Alpha Candidate ${index + 1}`,
            expression: candidate.expression,
            rationale: candidate.rationale || '설명이 제공되지 않았습니다.',
            score: candidate.score ?? 0.4,
            path: candidate.path,
            selected: false,
          })),
        );
        setTrace(response.mcts_trace || []);
        setLlmProvider(response.llm_provider || 'unknown');
      })
      .catch((error: any) => {
        console.warn('세션 복원 실패:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      });
  }, []);

  const handleModeChange = (value: Mode) => {
    setMode(value);
  };

  const handleChangeInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleResetSession = () => {
    setSessionId(null);
    setMessages([buildWelcomeMessage()]);
    setCandidates([]);
    setTrace([]);
    setWarnings([]);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    message.success('새 세션을 시작했습니다.');
  };

  const handleSaveCandidates = async (selected: AlphaCandidateItem[]) => {
    try {
      setSaving(true);
      const payload = selected.map((candidate) => ({
        name: candidate.name,
        expression: candidate.expression,
        description: candidate.rationale,
        tags: ['incubator', 'mcts'],
        fitness: candidate.score,
      }));
      await saveUserAlphas(payload);
      message.success(`${selected.length}개의 알파가 저장되었습니다.`);
      setCandidates((prev) =>
        prev.map((candidate) =>
          selected.some((item) => item.id === candidate.id)
            ? { ...candidate, selected: false }
            : candidate,
        ),
      );
    } catch (error: any) {
      message.error(error?.response?.data?.error || '알파 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingleCandidate = async (candidate: AlphaCandidateItem) => {
    await handleSaveCandidates([candidate]);
  };

  const buildHistoryPayload = useCallback(
    (extra?: { role: 'user' | 'assistant' | 'system'; content: string }) => {
      const base = messages
        .filter((message) => !message.pending)
        .map((message) => ({ role: message.role, content: message.content }));
      if (extra) {
        base.push(extra);
      }
      return base;
    },
    [messages],
  );

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      message.warning('메시지를 입력해 주세요.');
      return;
    }
    if (loadingRef.current) {
      message.warning('이전 요청이 처리 중입니다. 잠시만 기다려 주세요.');
      return;
    }

    const userMessage: IncubatorMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const pendingContent =
      mode === 'generate' ? 'LangChain + MCTS 탐색 중...' : '응답 생성 중...';
    const pendingMessage: IncubatorMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: pendingContent,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    const historyPayload = buildHistoryPayload({ role: 'user', content: trimmed });

    setInputValue('');
    loadingRef.current = true;
    setLoading(true);
    setMessages((prev) => [...prev, userMessage, pendingMessage]);

    try {
      const response = await postIncubatorChat({
        message: trimmed,
        intent: mode,
        session_id: sessionId || undefined,
        history: historyPayload,
      });

      if (!response.success) {
        throw new Error(response.error || '인큐베이터 응답에 실패했습니다.');
      }

      setSessionId(response.session_id);
      localStorage.setItem(SESSION_STORAGE_KEY, response.session_id);
      setMessages(normalizeMessages(response.history));
      setCandidates((prev) => mapCandidates(response, prev));
      setTrace(response.mcts_trace || []);
      setWarnings(response.warnings || []);
      setLlmProvider(response.llm_provider || 'unknown');
    } catch (error: any) {
      console.error('인큐베이터 오류:', error);
      setWarnings([]);
      message.error(error?.message || '인큐베이터와의 통신에 실패했습니다.');
      setMessages((prev) =>
        prev.filter((message) => message.id !== userMessage.id && message.id !== pendingMessage.id),
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const renderTrace = useMemo(() => {
    if (!trace || trace.length === 0) {
      return <Empty description="MCTS 탐색 로그가 없습니다." />;
    }
    return trace.map((entry) => (
      <TraceItem key={`trace-${entry.iteration}`}>
        <TraceHeader>
          <span>Iteration {entry.iteration}</span>
          <span>Score {(entry.score * 100).toFixed(0)}</span>
        </TraceHeader>
        <div>
          <strong>Prompt:</strong> {entry.prompt}
        </div>
        <div>
          <strong>Candidate:</strong> {entry.scored_expression}
        </div>
        {entry.reason && (
          <div>
            <strong>메모:</strong> {entry.reason}
          </div>
        )}
      </TraceItem>
    ));
  }, [trace]);

  return (
    <PageContainer>
      <Header>
        <TitleGroup>
          <Title>Alpha Incubator</Title>
          <Subtitle>
            LangChain과 MCTS를 결합하여 사용자가 정의한 목표에 맞는 맞춤형 알파 수식을 생성합니다.
          </Subtitle>
        </TitleGroup>
        <GlassButton variant="secondary" icon={<ReloadOutlined />} onClick={handleResetSession}>
          새 세션 시작
        </GlassButton>
      </Header>

      <Content>
        <ChatColumn>
          <ChatCard>
            <ChatHeader>
              <SessionInfo>
                <SessionTag>
                  <RobotOutlined /> korean-qwen · LangChain · MCTS
                </SessionTag>
                <SessionTag
                  $variant={
                    loading ? 'pending' : llmProvider === 'ollama' ? 'default' : 'warning'
                  }
                >
                  {loading
                    ? mode === 'generate'
                      ? 'LangChain + MCTS 탐색 중...'
                      : 'LLM 응답 중...'
                    : llmProvider === 'ollama'
                      ? 'LLM: Ollama (korean-qwen)'
                      : 'LLM: 휴리스틱 폴백'}
                </SessionTag>
                <span>
                  현재 모드: <strong>{mode === 'generate' ? '알파 생성' : '플랫폼 Q&A'}</strong>
                </span>
              </SessionInfo>
              <ModeSelect
                value={mode}
                onChange={(value) => handleModeChange(value as Mode)}
                options={modeOptions}
                disabled={loading}
              />
            </ChatHeader>

            <Messages>
              {messages.map((messageItem, index) => (
                <MessageRow
                  key={`${messageItem.id || messageItem.role}-${index}`}
                  $role={messageItem.role}
                >
                  <MessageBubble $role={messageItem.role} $pending={messageItem.pending}>
                    {messageItem.content}
                    {messageItem.timestamp && (
                      <MessageMeta>
                        {new Date(messageItem.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </MessageMeta>
                    )}
                  </MessageBubble>
                </MessageRow>
              ))}
              <div ref={messagesEndRef} />
            </Messages>

            <InputBar>
              <Input.TextArea
                value={inputValue}
                onChange={handleChangeInput}
                placeholder={
                  mode === 'generate'
                    ? '예: 변동성과 거래량을 모두 고려한 주간 리밸런싱 전략이 필요해.'
                    : '플랫폼 사용법이나 백테스트에 대해 궁금한 내용을 입력해 주세요.'
                }
                autoSize={{ minRows: 3, maxRows: 6 }}
                onPressEnter={(event) => {
                  if (event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  handleSendMessage();
                }}
              />
              <Actions>
                <Tooltip title="이전 대화 내용이 자동 전송됩니다.">
                  <span style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    Enter로 전송 · Shift+Enter 줄바꿈
                  </span>
                </Tooltip>
                <ButtonGroup>
                  <GlassButton
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={loading}
                    loading={loading}
                  >
                    {mode === 'generate' ? '알파 생성' : '질문 전송'}
                  </GlassButton>
                </ButtonGroup>
              </Actions>
            </InputBar>
          </ChatCard>

          {warnings.length > 0 && (
            <WarningList>
              {warnings.map((warning, index) => (
                <Alert
                  key={`warn-${index}`}
                  message={warning}
                  type="warning"
                  showIcon
                  style={{ borderRadius: 12 }}
                />
              ))}
            </WarningList>
          )}
        </ChatColumn>

        <CandidateColumn>
          <AlphaCandidatePanel
            candidates={candidates}
            onChange={setCandidates}
            onSave={handleSaveCandidates}
            onSaveSingle={handleSaveSingleCandidate}
            isSaving={saving}
          />

          <TraceCard>
            <TraceHeader>
              <span>MCTS 탐색 로그</span>
              <Tooltip title="LangChain이 Monte Carlo Tree Search 과정에서 탐색한 경로입니다.">
                <ThunderboltOutlined style={{ color: theme.colors.accentPrimary }} />
              </Tooltip>
            </TraceHeader>
            <TraceList>{renderTrace}</TraceList>
          </TraceCard>
        </CandidateColumn>
      </Content>
    </PageContainer>
  );
};

export default AlphaIncubator;
