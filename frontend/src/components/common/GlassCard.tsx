import React, { CSSProperties, ReactNode } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverable?: boolean;
  onClick?: () => void;
}

const StyledCard = styled.div<{ $hoverable?: boolean }>`
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: ${theme.shadows.glass};
  padding: ${theme.spacing.lg};
  transition: all ${theme.transitions.normal};

  ${(props: { $hoverable?: boolean }) => props.$hoverable && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: ${theme.shadows.hover};
      border-color: ${theme.colors.accentGold};
    }
  `}
`;

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  style, 
  hoverable = false,
  onClick 
}) => {
  return (
    <StyledCard 
      className={className} 
      style={style} 
      $hoverable={hoverable}
      onClick={onClick}
    >
      {children}
    </StyledCard>
  );
};

