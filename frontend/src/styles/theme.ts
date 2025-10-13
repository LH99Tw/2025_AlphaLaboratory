// 🎨 디자인 시스템 테마 - Chrome Dark Mode + Liquid Glass
export const theme = {
  colors: {
    // Chrome Dark Mode 배경색
    backgroundDark: '#202124',
    backgroundSecondary: '#292A2D',
    backgroundTertiary: '#35363A',
    
    // Liquid Glass 효과 (더 투명하고 부드러운)
    liquidGlass: 'rgba(255, 255, 255, 0.03)',
    liquidGlassBorder: 'rgba(255, 255, 255, 0.08)',
    liquidGlassHover: 'rgba(255, 255, 255, 0.06)',
    
    // Chrome 테두리
    border: '#3C4043',
    borderHover: '#5F6368',
    
    // 텍스트 (Chrome 스타일)
    textPrimary: '#E8EAED',
    textSecondary: '#9AA0A6',
    textTertiary: '#5F6368',
    
    // 포인트 컬러 (부드러운 그라데이션)
    accentPrimary: '#8AB4F8',  // Chrome 블루
    accentGold: '#D4AF37',
    accentGradient: 'linear-gradient(135deg, #8AB4F8 0%, #A8C7FA 100%)',
    
    // 상태 컬러 (통일된 색상 팔레트)
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#8AB4F8',
  },
  
  // 타이포그래피
  typography: {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'JetBrains Mono, monospace',
      korean: 'Pretendard, -apple-system, sans-serif',
    },
    fontSize: {
      h1: '2.5rem',     // 40px
      h2: '2rem',       // 32px
      h3: '1.5rem',     // 24px
      body: '1rem',     // 16px
      caption: '0.875rem', // 14px
      code: '0.875rem', // 14px
    },
  },
  
  // 간격
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // 반응형 브레이크포인트
  breakpoints: {
    mobile: '320px',
    mobileLarge: '480px',
    tablet: '768px',
    desktop: '1024px',
    desktopLarge: '1440px',
    wide: '1920px',
  },
  
  // 애니메이션 (현업 수준의 이징 함수)
  transitions: {
    fast: '0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    spring: '0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    bounce: '0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // 그림자 (Liquid Glass 스타일)
  shadows: {
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    glassInner: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    glow: '0 0 30px rgba(138, 180, 248, 0.15), 0 0 60px rgba(138, 180, 248, 0.1)',
    hover: '0 8px 40px rgba(0, 0, 0, 0.5)',
    soft: '0 2px 8px rgba(0, 0, 0, 0.25)',
  },
  
  // 차트 색상 (메인 컬러와 통일)
  chartColors: {
    primary: '#8AB4F8',  // 메인 액센트 컬러와 통일
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#8AB4F8',
    gold: '#D4AF37',  // 골드 컬러는 별도로 유지
    gradient: [
      'rgba(138, 180, 248, 0.8)',
      'rgba(138, 180, 248, 0.4)',
      'rgba(138, 180, 248, 0.1)',
    ],
  },
};

export type Theme = typeof theme;

