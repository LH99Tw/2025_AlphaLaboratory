import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #D4AF37 0%, #F4E4A6 100%);
  color: ${theme.colors.backgroundDark};
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.hover};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  color: ${theme.colors.textPrimary};
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${theme.colors.accentGold};
    color: ${theme.colors.accentGold};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const GlassButton: React.FC<GlassButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  loading = false,
  icon,
  className
}) => {
  const ButtonComponent = variant === 'primary' ? PrimaryButton : SecondaryButton;

  return (
    <ButtonComponent 
      onClick={onClick} 
      disabled={disabled || loading}
      className={className}
    >
      {icon && <span>{icon}</span>}
      {loading ? '로딩 중...' : children}
    </ButtonComponent>
  );
};

