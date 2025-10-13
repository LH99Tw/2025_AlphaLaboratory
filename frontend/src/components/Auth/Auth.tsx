import React, { useState } from 'react';
import styled from 'styled-components';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';
import { GlassInput } from '../common/GlassInput';
import { LiquidBackground } from '../common/LiquidBackground';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { theme } from '../../styles/theme';
import { fadeIn } from '../../styles/animations';

interface AuthProps {
  onLoginSuccess: (username: string, password: string) => void;
}

const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: ${theme.colors.backgroundDark};
  position: relative;
`;

const AuthCard = styled(GlassCard)`
  width: 100%;
  max-width: 420px;
  animation: ${fadeIn} 0.5s ease;
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(20px);
  border: 1px solid ${theme.colors.liquidGlassBorder};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  
  .logo-icon {
    font-size: 48px;
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.textPrimary};
  }
  
  h1 {
    font-size: ${theme.typography.fontSize.h2};
    color: ${theme.colors.textPrimary};
    font-weight: 700;
    font-family: ${theme.typography.fontFamily.display};
    margin: 0;
  }
  
  p {
    color: ${theme.colors.textSecondary};
    margin-top: ${theme.spacing.sm};
    font-size: ${theme.typography.fontSize.caption};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Label = styled.label`
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.body};
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.caption};
  text-align: center;
  margin-top: ${theme.spacing.sm};
`;

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onLoginSuccess(username, password);
    } catch (err) {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LiquidBackground />
      <AuthContainer>
        <AuthCard>
          <Logo>
            <div className="logo-icon">○</div>
            <h1>Smart Analytics</h1>
            <p>알고리즘 트레이딩 플랫폼</p>
          </Logo>

          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <Label>아이디</Label>
              <GlassInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                icon={<UserOutlined />}
              />
            </InputGroup>

            <InputGroup>
              <Label>비밀번호</Label>
              <GlassInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                type="password"
                icon={<LockOutlined />}
              />
            </InputGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <GlassButton 
              variant="primary" 
              loading={loading}
              onClick={() => handleSubmit(new Event('submit') as any)}
            >
              로그인
            </GlassButton>
          </Form>
        </AuthCard>
      </AuthContainer>
    </>
  );
};

