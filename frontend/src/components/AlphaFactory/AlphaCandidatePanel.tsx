import React, { useState } from 'react';
import styled from 'styled-components';
import { Checkbox, Input, message, Tooltip } from 'antd';
import { SaveOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
import { theme } from '../../styles/theme';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';

export interface AlphaCandidateItem {
  id: string;
  name: string;
  expression: string;
  rationale: string;
  score: number;
  path?: string[];
  selected: boolean;
}

interface AlphaCandidatePanelProps {
  candidates: AlphaCandidateItem[];
  onChange: (updated: AlphaCandidateItem[]) => void;
  onSave: (selected: AlphaCandidateItem[]) => Promise<void> | void;
  onSaveSingle?: (candidate: AlphaCandidateItem) => Promise<void> | void;
  isSaving?: boolean;
}

const PanelContainer = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  height: 100%;
  min-height: 520px;
  max-height: 680px;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.h3};
  color: ${theme.colors.textPrimary};
  font-weight: 600;
`;

const Subtitle = styled.span`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${theme.spacing.xs};
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 999px;
  background: rgba(138, 180, 248, 0.18);
  border: 1px solid rgba(138, 180, 248, 0.25);
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.caption};
  font-weight: 600;
`;

const CandidateList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding-right: ${theme.spacing.sm};

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

const CandidateCard = styled.article<{ $selected: boolean }>`
  border-radius: 16px;
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  background: ${({ $selected }) =>
    $selected ? theme.colors.liquidGoldGradient : theme.colors.liquidGlass};
  border: 1px solid
    ${({ $selected }) =>
      $selected ? theme.colors.liquidGoldBorder : theme.colors.liquidGlassBorder};
  transition: all ${theme.transitions.spring};

  &:hover {
    border-color: ${theme.colors.borderHover};
    transform: translateY(-2px);
  }
`;

const CandidateHeader = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
`;

const CandidateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  flex: 1;
`;

const CandidateSubMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
`;

const CandidateBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-left: 40px;
`;

const CandidateName = styled.div`
  font-size: ${theme.typography.fontSize.body};
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CandidateExpression = styled.pre`
  font-family: ${theme.typography.fontFamily.display};
  font-size: ${theme.typography.fontSize.caption};
  line-height: 1.4;
  color: ${theme.colors.textPrimary};
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: ${theme.spacing.sm};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 110px;
  overflow-y: auto;
  margin: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
`;

const CandidateRationale = styled.p`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  max-height: 140px;
  overflow-y: auto;
  margin: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const CandidateMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

const ScoreBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: 999px;
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.backgroundDark};
  background: ${theme.colors.accentPrimary};
`;

const StageTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
`;

const PathLabel = styled.span`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  text-align: right;
`;

const EditButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all ${theme.transitions.spring};

  &:hover {
    color: ${theme.colors.textPrimary};
    background: ${theme.colors.liquidGlassHover};
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

const SelectAllWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
`;

const RowActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-left: 40px;
`;

export const AlphaCandidatePanel: React.FC<AlphaCandidatePanelProps> = ({
  candidates,
  onChange,
  onSave,
  onSaveSingle,
  isSaving = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const toggleCandidate = (id: string) => {
    const updated = candidates.map((candidate) =>
      candidate.id === id ? { ...candidate, selected: !candidate.selected } : candidate,
    );
    onChange(updated);
  };

  const handleSelectAll = () => {
    const allSelected = candidates.every((candidate) => candidate.selected);
    const updated = candidates.map((candidate) => ({ ...candidate, selected: !allSelected }));
    onChange(updated);
  };

  const handleCandidateCardClick = (candidateId: string) => (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="checkbox"]')) {
      return;
    }
    toggleCandidate(candidateId);
  };

  const handleQuickSaveClick = (candidate: AlphaCandidateItem) => (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (onSaveSingle) {
      void onSaveSingle(candidate);
    } else {
      void onSave([candidate]);
    }
  };

  const handleStartEdit = (candidate: AlphaCandidateItem) => {
    setEditingId(candidate.id);
    setEditingName(candidate.name);
  };

  const handleConfirmEdit = () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      message.warning('알파 이름을 입력해주세요');
      return;
    }
    const updated = candidates.map((candidate) =>
      candidate.id === editingId ? { ...candidate, name: editingName.trim() } : candidate,
    );
    onChange(updated);
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveSelected = async () => {
    const selected = candidates.filter((candidate) => candidate.selected);
    if (selected.length === 0) {
      message.warning('저장할 알파를 선택해주세요');
      return;
    }

    await onSave(selected);
  };

  const selectedCount = candidates.filter((candidate) => candidate.selected).length;
  const allSelected = candidates.length > 0 && candidates.every((candidate) => candidate.selected);
  const indeterminate = selectedCount > 0 && !allSelected;

  return (
    <PanelContainer>
      <PanelHeader>
        <div>
          <Title>생성된 알파 후보</Title>
          <Subtitle>LangChain + MCTS 탐색 결과</Subtitle>
        </div>
        <HeaderMeta>
          <CountBadge>{candidates.length}개 후보</CountBadge>
          <Subtitle>{selectedCount}개 선택됨</Subtitle>
        </HeaderMeta>
      </PanelHeader>

      <CandidateList>
        {candidates.length === 0 && (
          <Subtitle>왼쪽에서 프롬프트를 입력하고 “알파 생성”을 눌러 후보를 만들어보세요.</Subtitle>
        )}

        {candidates.map((candidate) => {
          const stageDepth =
            candidate.path && candidate.path.length > 1 ? candidate.path.length - 1 : null;

          return (
            <CandidateCard
              key={candidate.id}
              $selected={candidate.selected}
              onClick={handleCandidateCardClick(candidate.id)}
            >
              <CandidateHeader>
                <Checkbox
                  checked={candidate.selected}
                  onChange={() => toggleCandidate(candidate.id)}
                  onClick={(event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                />
                <CandidateInfo>
                  <CandidateMeta>
                    <CandidateName>
                      {editingId === candidate.id ? (
                        <>
                          <Input
                            size="small"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onPressEnter={handleConfirmEdit}
                          />
                          <EditButton onClick={handleConfirmEdit}>
                            <CheckOutlined />
                          </EditButton>
                        </>
                      ) : (
                        <>
                          {candidate.name}
                          <EditButton onClick={() => handleStartEdit(candidate)}>
                            <EditOutlined />
                          </EditButton>
                        </>
                      )}
                    </CandidateName>
                    <ScoreBadge>{(candidate.score * 100).toFixed(0)} 점</ScoreBadge>
                  </CandidateMeta>
                  {stageDepth !== null && (
                    <CandidateSubMeta>
                      <StageTag>경로 {stageDepth} 단계</StageTag>
                      <Tooltip title={candidate.path?.join(' → ')}>
                        <PathLabel>탐색 루트 확인</PathLabel>
                      </Tooltip>
                    </CandidateSubMeta>
                  )}
                </CandidateInfo>
              </CandidateHeader>

              <CandidateBody>
                <CandidateExpression>{candidate.expression}</CandidateExpression>
                <CandidateRationale>{candidate.rationale}</CandidateRationale>
              </CandidateBody>

              <RowActions>
                <GlassButton
                  variant="secondary"
                  icon={<SaveOutlined />}
                  onClick={handleQuickSaveClick(candidate)}
                  loading={isSaving}
                  disabled={isSaving}
                >
                  바로 저장
                </GlassButton>
              </RowActions>
            </CandidateCard>
          );
        })}
      </CandidateList>

      <Footer>
        <SelectAllWrapper>
          <Checkbox checked={allSelected} indeterminate={indeterminate} onChange={handleSelectAll} />
          전체 선택
        </SelectAllWrapper>

        <GlassButton
          icon={<SaveOutlined />}
          onClick={handleSaveSelected}
          disabled={selectedCount === 0}
          loading={isSaving}
        >
          선택한 알파 저장
        </GlassButton>
      </Footer>
    </PanelContainer>
  );
};

export default AlphaCandidatePanel;
