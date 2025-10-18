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
  background: linear-gradient(
    135deg,
    ${theme.colors.liquidGlass} 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  border: 1px solid ${theme.colors.liquidGlassBorder};
  border-radius: 20px;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: ${theme.shadows.glass}, ${theme.shadows.glassInner};
  padding: ${theme.spacing.lg};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  ${(props: { $hoverable?: boolean }) => props.$hoverable && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px) scale(1.005);
      background: ${theme.colors.liquidGlassHover};
      box-shadow: ${theme.shadows.hover}, ${theme.shadows.glow};
      border-color: ${theme.colors.accentPrimary};
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

