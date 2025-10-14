import React from 'react';
import styled from 'styled-components';
import { liquidFlow } from '../../styles/animations';

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  background: radial-gradient(
    ellipse at center top,
    rgba(212, 175, 55, 0.08) 0%,
    rgba(184, 134, 11, 0.05) 30%,
    rgba(160, 120, 8, 0.03) 60%,
    #0A0E27 100%
  );
`;

const LiquidBlob = styled.div<{ $delay?: number; $size?: number }>`
  position: absolute;
  width: ${(props: { $size?: number }) => props.$size || 400}px;
  height: ${(props: { $size?: number }) => props.$size || 400}px;
  background: radial-gradient(
    circle,
    rgba(212, 175, 55, 0.15) 0%,
    transparent 70%
  );
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  animation: ${liquidFlow} 20s ease-in-out infinite;
  animation-delay: ${(props: { $delay?: number }) => props.$delay || 0}s;
  filter: blur(40px);
`;

export const LiquidBackground: React.FC = () => {
  return (
    <BackgroundWrapper>
      <LiquidBlob 
        style={{ top: '10%', left: '10%' }} 
        $delay={0} 
        $size={500}
      />
      <LiquidBlob 
        style={{ top: '60%', right: '20%' }} 
        $delay={7} 
        $size={400}
      />
      <LiquidBlob 
        style={{ bottom: '20%', left: '50%' }} 
        $delay={14} 
        $size={450}
      />
    </BackgroundWrapper>
  );
};

