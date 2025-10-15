import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface Stat {
  label: string;
  value: string;
  caption?: string;
}

interface HoloStatTickerProps {
  stats: Stat[];
  className?: string;
}

const Wrapper = styled.div`
  display: inline-flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: 999px;
  background: rgba(12, 16, 35, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  pointer-events: none;
`;

const StatBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  padding: 12px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(16, 184, 129, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: ${theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Label = styled.span`
  font-size: 0.7rem;
  color: ${theme.colors.textSecondary};
`;

const Value = styled.span`
  font-size: 1.1rem;
  font-weight: ${theme.typography.fontWeight.bold};
  font-family: ${theme.typography.fontFamily.display};
  letter-spacing: 0.04em;
`;

const Caption = styled.span`
  font-size: 0.65rem;
  color: ${theme.colors.textTertiary};
  letter-spacing: 0.1em;
`;

export const HoloStatTicker: React.FC<HoloStatTickerProps> = ({ stats, className }) => {
  if (!stats.length) {
    return null;
  }

  return (
    <Wrapper className={className}>
      {stats.map((stat) => (
        <StatBlock key={stat.label}>
          <Label>{stat.label}</Label>
          <Value>{stat.value}</Value>
          {stat.caption && <Caption>{stat.caption}</Caption>}
        </StatBlock>
      ))}
    </Wrapper>
  );
};

