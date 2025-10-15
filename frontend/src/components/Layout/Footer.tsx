import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { GithubOutlined, InstagramOutlined, GlobalOutlined } from '@ant-design/icons';

const FooterContainer = styled.footer`
  width: 100%;
  background: ${theme.colors.backgroundDark};
  border-top: 1px solid ${theme.colors.border};
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.xl} ${theme.spacing.xl};
`;

const FooterTop = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${theme.spacing.xl};
  padding-bottom: ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border};
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FooterBrand = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const BrandTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  margin: 0;
`;

const BrandDescription = styled.p`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const SocialIcon = styled.a`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  color: ${theme.colors.textSecondary};
  transition: all ${theme.transitions.spring};
  cursor: pointer;
  
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    border-color: ${theme.colors.borderHover};
    color: ${theme.colors.textPrimary};
    transform: translateY(-2px);
  }
`;

const SectionTitle = styled.h4`
  font-size: ${theme.typography.fontSize.body};
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  margin: 0 0 ${theme.spacing.md} 0;
`;

const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const LinkItem = styled.li`
  list-style: none;
`;

const LinkButton = styled.button`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  transition: all ${theme.transitions.spring};
  display: inline-block;
  cursor: pointer;
  padding: 0;
  background: none;
  border: none;
  text-align: left;
  
  &:hover {
    color: ${theme.colors.textPrimary};
    transform: translateX(4px);
  }
`;

const FooterBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${theme.spacing.lg};
  
  @media (max-width: 640px) {
    flex-direction: column;
    gap: ${theme.spacing.md};
    text-align: center;
  }
`;

const Copyright = styled.p`
  font-size: ${theme.typography.fontSize.caption};
  color: ${theme.colors.textTertiary};
  margin: 0;
  
  .highlight {
    color: ${theme.colors.textPrimary};
    font-weight: 600;
  }
`;

const LanguageSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.liquidGlass};
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.caption};
  cursor: pointer;
  transition: all ${theme.transitions.spring};
  
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    border-color: ${theme.colors.borderHover};
  }
`;

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <FooterContainer>
      <FooterContent>
        <FooterTop>
          <FooterBrand>
            <BrandTitle>Smart Analytics</BrandTitle>
            <BrandDescription>
              알파팩터를 디자인하고 구현할 수 있는<br />
              알고리즘 트레이딩 플랫폼을 제공합니다.
            </BrandDescription>
            <SocialLinks>
              <SocialIcon href="https://github.com/LH99Tw/2025_sang2company" target="_blank" rel="noopener noreferrer">
                <GithubOutlined />
              </SocialIcon>
              <SocialIcon href="https://www.instagram.com/smart_analytics._/" target="_blank" rel="noopener noreferrer">
                <InstagramOutlined />
              </SocialIcon>
            </SocialLinks>
          </FooterBrand>
          
          <FooterSection>
            <SectionTitle>Document</SectionTitle>
            <LinkList>
              <LinkItem><LinkButton type="button" onClick={() => handleNavigation('/about')}>회사 소개</LinkButton></LinkItem>
              <LinkItem><LinkButton type="button" onClick={() => handleNavigation('/faq')}>자주 묻는 질문</LinkButton></LinkItem>
              <LinkItem><LinkButton type="button" onClick={() => handleNavigation('/team')}>구성원</LinkButton></LinkItem>
              <LinkItem><LinkButton type="button" onClick={() => handleNavigation('/contact')}>연락</LinkButton></LinkItem>
            </LinkList>
          </FooterSection>
          
          <div></div>
        </FooterTop>
        
        <FooterBottom>
          <Copyright>
            © <span className="highlight">KGU 2025 상상기업, 스마트애널리틱스</span>. All rights reserved.
          </Copyright>
          <LanguageSelector>
            <GlobalOutlined />
            <span>한국어</span>
          </LanguageSelector>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );
};
