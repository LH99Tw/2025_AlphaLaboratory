import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { LiquidBackground } from '../components/common/LiquidBackground';
import { useAuth } from '../contexts/AuthContext';
import { UserOutlined } from '@ant-design/icons';

const ProfileContainer = styled.div`
  min-height: calc(100vh - 200px);
  position: relative;
`;

const PageTitle = styled.h1`
  font-size: ${theme.typography.fontSize.h1};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: ${theme.spacing.xl};
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const ProfileSidebar = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.lg};
`;

const ProfileImageContainer = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: ${theme.colors.liquidGoldGradient};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid ${theme.colors.liquidGoldBorder};
  position: relative;
  overflow: hidden;
`;

const ProfileEmoji = styled.div`
  font-size: 80px;
  user-select: none;
`;

const ProfileName = styled.h2`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.textPrimary};
  margin: 0;
  text-align: center;
`;

const ProfileEmail = styled.p`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textSecondary};
  margin: 0;
  text-align: center;
`;

const ProfileContent = styled(GlassCard)`
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: ${theme.typography.fontSize.h3};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.textPrimary};
  margin: 0;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.textPrimary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
`;

const EmojiSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.liquidGlass};
  border-radius: ${theme.borderRadius.lg};
  margin-top: ${theme.spacing.sm};
`;

const EmojiOption = styled.button<{ $selected: boolean }>`
  font-size: 32px;
  padding: ${theme.spacing.sm};
  background: ${props => props.$selected ? theme.colors.liquidGoldGradient : 'transparent'};
  border: ${props => props.$selected ? `2px solid ${theme.colors.liquidGoldBorder}` : '2px solid transparent'};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background: ${theme.colors.liquidGlassHover};
    transform: scale(1.1);
  }
`;

const emojis = ['😀', '😎', '🤓', '🧐', '🤗', '😇', '🤠', '🥳', '🤩', '🥰', '😊', '🙂', '🤔', '🧑‍💼', '👨‍💻', '👩‍💻'];

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '사용자',
    email: user?.email || '',
    name: user?.name || '',
    profileEmoji: '😀'
  });

  const [editData, setEditData] = useState(profileData);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // CSV에서 사용자 정보 로드
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/csv/user/info', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const userInfo = data.user_info;
          
          setProfileData({
            username: userInfo.username || '사용자',
            email: userInfo.email || '',
            name: userInfo.name || '',
            profileEmoji: userInfo.profile_emoji || '😀'
          });
          setEditData({
            username: userInfo.username || '사용자',
            email: userInfo.email || '',
            name: userInfo.name || '',
            profileEmoji: userInfo.profile_emoji || '😀'
          });
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    
    fetchUserInfo();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/csv/user/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          profile_emoji: editData.profileEmoji
        })
      });
      
      if (response.ok) {
        setProfileData(editData);
        setIsEditing(false);
        setShowEmojiPicker(false);
        
        // 성공 메시지 표시
        alert('프로필이 성공적으로 업데이트되었습니다');
        
        // 헤더의 프로필 정보도 즉시 반영되도록 새로고침
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || '프로필 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다');
      return;
    }
    
    try {
      const response = await fetch('/api/csv/user/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });
      
      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        alert('비밀번호가 성공적으로 변경되었습니다');
      } else {
        const data = await response.json();
        alert(data.error || '비밀번호 변경에 실패했습니다');
      }
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      alert('비밀번호 변경 중 오류가 발생했습니다');
    }
  };

  const handleCancel = () => {
    setEditData(profileData);
    setIsEditing(false);
    setShowEmojiPicker(false);
  };

  return (
    <ProfileContainer>
      <LiquidBackground />
      <PageTitle>프로필 설정</PageTitle>
      
      <ProfileGrid>
        {/* 프로필 사이드바 */}
        <ProfileSidebar>
          <ProfileImageContainer>
            <ProfileEmoji>{profileData.profileEmoji}</ProfileEmoji>
          </ProfileImageContainer>
          
          {isEditing && (
            <GlassButton 
              variant="secondary" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              이모티콘 변경
            </GlassButton>
          )}
          
          {showEmojiPicker && (
            <EmojiSelector>
              {emojis.map(emoji => (
                <EmojiOption
                  key={emoji}
                  $selected={editData.profileEmoji === emoji}
                  onClick={() => setEditData({ ...editData, profileEmoji: emoji })}
                >
                  {emoji}
                </EmojiOption>
              ))}
            </EmojiSelector>
          )}
          
          <ProfileName>{profileData.username}</ProfileName>
          <ProfileEmail>{profileData.email}</ProfileEmail>
        </ProfileSidebar>

        {/* 프로필 정보 */}
        <ProfileContent>
          <Section>
            <SectionTitle>개인 정보</SectionTitle>
            
            {!isEditing ? (
              <>
                <FormGroup>
                  <Label>아이디</Label>
                  <div style={{ 
                    padding: theme.spacing.md, 
                    background: theme.colors.liquidGlass,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.liquidGlassBorder}`
                  }}>
                    {profileData.username}
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>이름</Label>
                  <div style={{ 
                    padding: theme.spacing.md, 
                    background: theme.colors.liquidGlass,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.liquidGlassBorder}`
                  }}>
                    {profileData.name}
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>이메일</Label>
                  <div style={{ 
                    padding: theme.spacing.md, 
                    background: theme.colors.liquidGlass,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.liquidGlassBorder}`
                  }}>
                    {profileData.email}
                  </div>
                </FormGroup>

                <ButtonGroup>
                  <GlassButton onClick={() => setIsEditing(true)}>
                    정보 수정
                  </GlassButton>
                </ButtonGroup>
              </>
            ) : (
              <>
                <FormGroup>
                  <Label>아이디</Label>
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px'
                  }}>
                    {editData.username} (변경 불가)
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>이름</Label>
                  <GlassInput
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>이메일</Label>
                  <GlassInput
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                </FormGroup>

                <ButtonGroup>
                  <GlassButton onClick={handleSaveProfile}>
                    저장
                  </GlassButton>
                  <GlassButton onClick={handleCancel} variant="secondary">
                    취소
                  </GlassButton>
                </ButtonGroup>
              </>
            )}
          </Section>

          <Section>
            <SectionTitle>비밀번호 변경</SectionTitle>
            
            <FormGroup>
              <Label>현재 비밀번호</Label>
              <GlassInput
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="현재 비밀번호를 입력하세요"
              />
            </FormGroup>

            <FormGroup>
              <Label>새 비밀번호</Label>
              <GlassInput
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="새 비밀번호를 입력하세요"
              />
            </FormGroup>

            <FormGroup>
              <Label>새 비밀번호 확인</Label>
              <GlassInput
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </FormGroup>

            <ButtonGroup>
              <GlassButton onClick={handleChangePassword}>
                비밀번호 변경
              </GlassButton>
            </ButtonGroup>
          </Section>
        </ProfileContent>
      </ProfileGrid>
    </ProfileContainer>
  );
};

export default Profile;

