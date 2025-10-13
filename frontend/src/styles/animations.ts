import { keyframes } from 'styled-components';

// 🌊 Liquid Flow 애니메이션
export const liquidFlow = keyframes`
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(30px, -30px) rotate(120deg);
  }
  66% {
    transform: translate(-20px, 20px) rotate(240deg);
  }
`;

// ✨ Shimmer 로딩 애니메이션
export const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// 💫 Fade In 애니메이션
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// 🔄 Pulse 애니메이션
export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

// ⚡ Slide In 애니메이션
export const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// 🌟 Glow 애니메이션
export const glow = keyframes`
  0%, 100% {
    box-shadow: 
      0 0 20px rgba(212, 175, 55, 0.3),
      0 0 40px rgba(212, 175, 55, 0.2),
      0 0 60px rgba(212, 175, 55, 0.1);
  }
  50% {
    box-shadow: 
      0 0 30px rgba(212, 175, 55, 0.4),
      0 0 60px rgba(212, 175, 55, 0.3),
      0 0 90px rgba(212, 175, 55, 0.2);
  }
`;

// 🎯 Float 애니메이션
export const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

