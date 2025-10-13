// 🎨 디자인 시스템 테마
export const theme = {
  colors: {
    // 배경색
    backgroundDark: '#0A0E27',
    backgroundSecondary: '#141B3D',
    
    // 유리 효과
    liquidGlass: 'rgba(255, 255, 255, 0.05)',
    liquidGlassBorder: 'rgba(255, 255, 255, 0.1)',
    
    // 텍스트
    textPrimary: '#FFFFFF',
    textSecondary: '#B4B4C5',
    
    // 포인트 컬러
    accentGold: '#D4AF37',
    deepBlue: '#1E3A8A',
    
    // 상태 컬러
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
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
  
  // 애니메이션
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
  
  // 그림자
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(212, 175, 55, 0.3), 0 0 40px rgba(212, 175, 55, 0.2)',
    hover: '0 8px 20px rgba(212, 175, 55, 0.4)',
  },
  
  // 차트 색상
  chartColors: {
    primary: '#D4AF37',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    gradient: [
      'rgba(212, 175, 55, 0.8)',
      'rgba(212, 175, 55, 0.4)',
      'rgba(212, 175, 55, 0.1)',
    ],
  },
};

export type Theme = typeof theme;

