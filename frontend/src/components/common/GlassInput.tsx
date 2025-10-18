import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface GlassInputProps {
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledInput = styled.input`
  width: 100%;
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 8px;
  color: ${theme.colors.textPrimary};
  padding: 12px 16px;
  font-size: 16px;
  transition: all ${theme.transitions.normal};
  
  &::placeholder {
    color: ${theme.colors.textSecondary};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.accentGold};
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.textSecondary};
`;

export const GlassInput: React.FC<GlassInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  disabled = false,
  icon,
  className,
  onKeyPress
}) => {
  return (
    <InputWrapper className={className}>
      <StyledInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        onKeyPress={onKeyPress}
      />
      {icon && <IconWrapper>{icon}</IconWrapper>}
    </InputWrapper>
  );
};

