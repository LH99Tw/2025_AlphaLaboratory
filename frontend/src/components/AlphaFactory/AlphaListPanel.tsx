import React, { useState } from 'react';
import styled from 'styled-components';
import { Checkbox, Input, message } from 'antd';
import { theme } from '../../styles/theme';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';
import { SaveOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';

const PanelContainer = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  max-height: 400px;
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

const AlphaCount = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
`;

const AlphaListContainer = styled.div`
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

const AlphaRow = styled.div<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 40px 200px 1fr 80px 40px;
  gap: ${theme.spacing.md};
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${props => props.$selected ? theme.colors.liquidGoldGradient : theme.colors.liquidGlass};
  border: 1px solid ${props => props.$selected ? theme.colors.liquidGoldBorder : theme.colors.liquidGlassBorder};
  border-radius: 12px;
  transition: all ${theme.transitions.spring};
  
  &:hover {
    border-color: ${theme.colors.borderHover};
    transform: translateY(-2px);
  }
`;

const AlphaName = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textPrimary};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AlphaExpression = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  font-family: ${theme.typography.fontFamily.display};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AlphaFitness = styled.div`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.accentPrimary};
  font-weight: 600;
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

const PanelFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

const SelectAllCheckbox = styled(Checkbox)`
  .ant-checkbox-inner {
    border-color: ${theme.colors.liquidGoldBorder};
  }
  
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: ${theme.colors.accentPrimary};
    border-color: ${theme.colors.accentPrimary};
  }
`;

interface AlphaItem {
  id: string;
  name: string;
  expression: string;
  fitness: number;
  selected: boolean;
}

interface AlphaListPanelProps {
  alphas: AlphaItem[];
  onSave: (selectedAlphas: AlphaItem[]) => void;
  onChange: (alphas: AlphaItem[]) => void;
}

export const AlphaListPanel: React.FC<AlphaListPanelProps> = ({ alphas, onSave, onChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleToggleSelect = (id: string) => {
    const updatedAlphas = alphas.map(alpha =>
      alpha.id === id ? { ...alpha, selected: !alpha.selected } : alpha
    );
    onChange(updatedAlphas);
  };

  const handleSelectAll = () => {
    const allSelected = alphas.every(alpha => alpha.selected);
    const updatedAlphas = alphas.map(alpha => ({ ...alpha, selected: !allSelected }));
    onChange(updatedAlphas);
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      const updatedAlphas = alphas.map(alpha =>
        alpha.id === editingId ? { ...alpha, name: editingName } : alpha
      );
      onChange(updatedAlphas);
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleSaveSelected = () => {
    const selectedAlphas = alphas.filter(alpha => alpha.selected);
    if (selectedAlphas.length === 0) {
      message.warning('저장할 알파를 선택해주세요');
      return;
    }
    onSave(selectedAlphas);
  };

  const selectedCount = alphas.filter(alpha => alpha.selected).length;
  const allSelected = alphas.length > 0 && alphas.every(alpha => alpha.selected);
  const indeterminate = selectedCount > 0 && selectedCount < alphas.length;

  return (
    <PanelContainer>
      <PanelHeader>
        <Title>최종 생존 알파</Title>
        <AlphaCount>{alphas.length}개 중 {selectedCount}개 선택됨</AlphaCount>
      </PanelHeader>

      <AlphaListContainer>
        {alphas.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: theme.spacing.xl,
            color: theme.colors.textSecondary 
          }}>
            GA 실행 후 생성된 알파가 여기에 표시됩니다
          </div>
        ) : (
          alphas.map((alpha) => (
            <AlphaRow key={alpha.id} $selected={alpha.selected}>
              <Checkbox
                checked={alpha.selected}
                onChange={() => handleToggleSelect(alpha.id)}
              />

              {editingId === alpha.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onPressEnter={handleSaveEdit}
                  onBlur={handleSaveEdit}
                  autoFocus
                  size="small"
                  style={{ width: '100%' }}
                />
              ) : (
                <AlphaName>{alpha.name}</AlphaName>
              )}

              <AlphaExpression title={alpha.expression}>
                {alpha.expression}
              </AlphaExpression>

              <AlphaFitness>
                {typeof alpha.fitness === 'number' ? alpha.fitness.toFixed(4) : '—'}
              </AlphaFitness>

              {editingId === alpha.id ? (
                <EditButton onClick={handleSaveEdit}>
                  <CheckOutlined />
                </EditButton>
              ) : (
                <EditButton onClick={() => handleStartEdit(alpha.id, alpha.name)}>
                  <EditOutlined />
                </EditButton>
              )}
            </AlphaRow>
          ))
        )}
      </AlphaListContainer>

      <PanelFooter>
        <SelectAllCheckbox
          checked={allSelected}
          indeterminate={indeterminate}
          onChange={handleSelectAll}
          disabled={alphas.length === 0}
        >
          전체 선택
        </SelectAllCheckbox>

        <GlassButton
          variant="primary"
          onClick={handleSaveSelected}
          disabled={selectedCount === 0}
          icon={<SaveOutlined />}
        >
          선택한 알파 저장 ({selectedCount})
        </GlassButton>
      </PanelFooter>
    </PanelContainer>
  );
};
