import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../styles/theme';

type WordColumn = {
  title: string;
  words: string[];
  speed?: number;
};

interface AmbientWordMatrixProps {
  columns: WordColumn[];
  className?: string;
}

const Container = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl};
  pointer-events: none;
  mix-blend-mode: lighten;
`;

const columnScroll = keyframes`
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
`;

const Column = styled.div<{ $speed: number }>`
  position: relative;
  overflow: hidden;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.xl};
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04),
    rgba(255, 255, 255, 0.02) 40%,
    rgba(255, 255, 255, 0)
  );
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  min-height: 320px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  isolation: isolate;

  &::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(138, 180, 248, 0.2));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    color: ${theme.colors.textSecondary};
    font-size: ${theme.typography.fontSize.caption};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.sm};
    animation: ${columnScroll} ${({ $speed }) => $speed}s linear infinite;
  }

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    opacity: 0.7;
    transition: opacity ${theme.transitions.normal};
  }

  li span:last-child {
    font-family: ${theme.typography.fontFamily.display};
    letter-spacing: 0.075em;
    font-size: 0.8rem;
  }

  &:hover li {
    opacity: 1;
  }
`;

const Title = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  font-size: 0.9rem;
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.textPrimary};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  z-index: 2;
  opacity: 0.85;
`;

export const AmbientWordMatrix: React.FC<AmbientWordMatrixProps> = ({ columns, className }) => {
  return (
    <Container className={className}>
      {columns.map((column) => {
        const speed = column.speed ?? 40;
        const items = [...column.words, ...column.words];

        return (
          <Column key={column.title} $speed={speed}>
            <Title>{column.title}</Title>
            <ul>
              {items.map((word, index) => (
                <li key={`${column.title}-${index}`}>
                  <span>{String(index % column.words.length + 1).padStart(2, '0')}</span>
                  <span>{word}</span>
                </li>
              ))}
            </ul>
          </Column>
        );
      })}
    </Container>
  );
};

