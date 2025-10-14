import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { GlassInput } from '../components/common/GlassInput';
import { LiquidBackground } from '../components/common/LiquidBackground';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const MyInvestmentContainer = styled.div`
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

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AssetOverviewCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
`;

const AccountSettingsCard = styled(GlassCard)`
  padding: ${theme.spacing.xl};
`;

const CardTitle = styled.h2`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const AssetSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.liquidGlass};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.liquidGlassBorder};
`;

const AssetLabel = styled.span`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.textSecondary};
`;

const AssetValue = styled.span`
  font-size: ${theme.typography.fontSize.h2};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.textPrimary};
`;

const ChartContainer = styled.div`
  height: 300px;
  margin: ${theme.spacing.lg} 0;
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
`;

const InfoText = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-top: ${theme.spacing.md};
`;

interface UserData {
  totalAssets: number;
  cash: number;
  investments: number;
  name: string;
  email: string;
}

const MyInvestment: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    totalAssets: 10000000,
    cash: 3000000,
    investments: 7000000,
    name: '홍길동',
    email: 'hong@example.com'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(userData);

  // 도넛 차트 데이터 (자산 비중)
  const doughnutData = {
    labels: ['현금', '투자'],
    datasets: [
      {
        data: [userData.cash, userData.investments],
        backgroundColor: [
          theme.colors.accentGold,
          theme.colors.accentPrimary,
        ],
        borderColor: [
          theme.colors.accentGold,
          theme.colors.accentPrimary,
        ],
        borderWidth: 2,
      },
    ],
  };

  // 바 차트 데이터 (월별 자산 변화)
  const barData = {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
    datasets: [
      {
        label: '총 자산',
        data: [8500000, 8800000, 9200000, 9500000, 9800000, 10000000],
        backgroundColor: theme.colors.accentGold,
        borderColor: theme.colors.accentPrimary,
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme.colors.textPrimary,
        },
      },
    },
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(userData);
  };

  const handleSave = () => {
    setUserData(editData);
    setIsEditing(false);
    // TODO: 백엔드 API 호출하여 데이터 저장
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(userData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <MyInvestmentContainer>
      <LiquidBackground />
      <PageTitle>내 투자</PageTitle>
      
      <ContentGrid>
        {/* 자산 현황 */}
        <AssetOverviewCard>
          <CardTitle>자산 현황</CardTitle>
          
          <AssetSummary>
            <AssetLabel>총 자산</AssetLabel>
            <AssetValue>{formatCurrency(userData.totalAssets)}</AssetValue>
          </AssetSummary>

          <ChartContainer>
            <Doughnut data={doughnutData} options={chartOptions} />
          </ChartContainer>

          <InfoText>
            현금: {formatCurrency(userData.cash)} ({((userData.cash / userData.totalAssets) * 100).toFixed(1)}%)<br/>
            투자: {formatCurrency(userData.investments)} ({((userData.investments / userData.totalAssets) * 100).toFixed(1)}%)
          </InfoText>
        </AssetOverviewCard>

        {/* 계정 설정 */}
        <AccountSettingsCard>
          <CardTitle>계정 설정</CardTitle>
          
          {!isEditing ? (
            <>
              <FormGroup>
                <Label>이름</Label>
                <div style={{ 
                  padding: theme.spacing.md, 
                  background: theme.colors.liquidGlass,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.liquidGlassBorder}`
                }}>
                  {userData.name}
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
                  {userData.email}
                </div>
              </FormGroup>

              <ButtonGroup>
                <GlassButton onClick={handleEdit}>
                  정보 수정
                </GlassButton>
              </ButtonGroup>
            </>
          ) : (
            <>
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

              <FormGroup>
                <Label>현재 비밀번호</Label>
                <GlassInput
                  type="password"
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </FormGroup>

              <FormGroup>
                <Label>새 비밀번호</Label>
                <GlassInput
                  type="password"
                  placeholder="새 비밀번호를 입력하세요"
                />
              </FormGroup>

              <FormGroup>
                <Label>비밀번호 확인</Label>
                <GlassInput
                  type="password"
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </FormGroup>

              <ButtonGroup>
                <GlassButton onClick={handleSave}>
                  저장
                </GlassButton>
                <GlassButton onClick={handleCancel} variant="secondary">
                  취소
                </GlassButton>
              </ButtonGroup>
            </>
          )}
        </AccountSettingsCard>
      </ContentGrid>

      {/* 자산 변화 차트 */}
      <GlassCard style={{ padding: theme.spacing.xl }}>
        <CardTitle>자산 변화 추이</CardTitle>
        <ChartContainer>
          <Bar data={barData} options={chartOptions} />
        </ChartContainer>
      </GlassCard>
    </MyInvestmentContainer>
  );
};

export default MyInvestment;
