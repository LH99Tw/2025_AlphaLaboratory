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
  isSaving?: boolean;
}

const PanelContainer = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  height: 100%;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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

const CandidateList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

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

const CandidateCard = styled.div<{ $selected: boolean }>`
  border-radius: 16px;
  padding: ${theme.spacing.md};
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: ${theme.spacing.md};
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

const CandidateMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CandidateName = styled.div`
  font-size: ${theme.typography.fontSize.body};
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CandidateExpression = styled.div`
  font-family: ${theme.typography.fontFamily.display};
  font-size: ${theme.typography.fontSize.caption};
  line-height: 1.4;
  color: ${theme.colors.textPrimary};
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: ${theme.spacing.sm};
  white-space: pre-wrap;
  word-break: break-word;
`;

const CandidateRationale = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const CandidateMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${theme.spacing.sm};
  min-width: 80px;
`;

const ScoreBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 999px;
  font-weight: 600;
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.backgroundDark};
  background: ${theme.colors.accentPrimary};
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

export const AlphaCandidatePanel: React.FC<AlphaCandidatePanelProps> = ({
  candidates,
  onChange,
  onSave,
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
        <Subtitle>{selectedCount}개 선택됨</Subtitle>
      </PanelHeader>

      <CandidateList>
        {candidates.length === 0 && (
          <Subtitle>왼쪽에서 프롬프트를 입력하고 “알파 생성”을 눌러 후보를 만들어보세요.</Subtitle>
        )}

        {candidates.map((candidate) => (
          <CandidateCard key={candidate.id} $selected={candidate.selected}>
            <Checkbox checked={candidate.selected} onChange={() => toggleCandidate(candidate.id)} />

            <CandidateMain>
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

              <CandidateExpression>{candidate.expression}</CandidateExpression>
              <CandidateRationale>{candidate.rationale}</CandidateRationale>
            </CandidateMain>

            <CandidateMeta>
              <ScoreBadge>{(candidate.score * 100).toFixed(0)} 점</ScoreBadge>
              {candidate.path && candidate.path.length > 0 && (
                <Tooltip title={candidate.path.join(' → ')}>
                  <PathLabel>경로 {candidate.path.length - 1} 단계</PathLabel>
                </Tooltip>
              )}
            </CandidateMeta>
          </CandidateCard>
        ))}
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
