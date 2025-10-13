# 🎨 디자인 시스템 가이드

## [디자인 철학]
- **고급스러우면서, 금융과 IT 사이에 걸쳐있는 현대적인 느낌**을 주고자 한다.
- **최대한 있어보이는 애니메이션 효과** 추가
- **프로그램 테마인 연구소에서 알파를 탄생시키고 진화시킨다는 의학적인 컨셉**도 들어있는 느낌.
- **React, TypeScript**를 기반으로 개발 
- **투명한 유리같은 재질과 무광택 검정색 흑철같은 색상과 그 대비인 흰 색을**을 주로 사용한다.
- **참고하는 것은 iOS 17 Liquid Glass**의 유리재질같은 디자인 컨셉과 **ComfyUI, Make** 등의 Workflow 같은 사용자가 사고과정을 쉽게 보고, 수정할 수 있도록 하는 것.

## [컬러 팔레트]
### 🎨 주요 색상 (Chrome Dark Mode + 따뜻한 금색)
- **Background Dark**: `#202124` - 메인 배경 (Chrome Dark)
- **Background Secondary**: `#292A2D` - 서브 배경
- **Background Tertiary**: `#35363A` - 3차 배경
- **Liquid Glass**: `rgba(255, 255, 255, 0.03)` - 투명 유리 효과 (배경)
- **Liquid Glass Border**: `rgba(255, 255, 255, 0.08)` - 유리 테두리
- **Liquid Glass Hover**: `rgba(255, 255, 255, 0.06)` - 호버 시 유리 효과
- **Text Primary**: `#E8EAED` - 주요 텍스트 (Chrome 스타일)
- **Text Secondary**: `#9AA0A6` - 보조 텍스트
- **Text Tertiary**: `#5F6368` - 3차 텍스트

### 🌟 포인트 컬러 (따뜻한 금색 계열)
- **Accent Primary**: `#FFD700` - 순금색 (메인 액센트)
- **Accent Gold**: `#FFA500` - 오렌지 골드
- **Accent Gradient**: `linear-gradient(135deg, #FFD700 0%, #FFA500 100%)`
- **Liquid Gold**: `rgba(255, 215, 0, 0.12)` - 부드러운 반투명 금색
- **Liquid Gold Border**: `rgba(255, 165, 0, 0.3)` - 금색 테두리
- **Liquid Gold Hover**: `rgba(255, 215, 0, 0.2)` - 금색 호버
- **Liquid Gold Gradient**: `linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, rgba(255, 140, 0, 0.05) 100%)` - 3단계 부드러운 그라데이션
- **Glowing Text**: `linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)` - 빛나는 텍스트 효과
- **Glowing Text Hover**: `linear-gradient(135deg, #FFF8DC 0%, #FFD700 50%, #FFA500 100%)` - 호버 시 더 밝은 빛나는 효과

### 🎯 상태 컬러 (통일된 색상 팔레트)
- **Success**: `#10B981` - 성공/수익
- **Warning**: `#F59E0B` - 경고/주의
- **Error**: `#EF4444` - 오류/손실
- **Info**: `#8AB4F8` - 정보/알림

## [타이포그래피]
### 📝 폰트 시스템
- **Primary Font**: `Inter` - 모던하고 가독성 좋은 산세리프
- **Display Font**: `JetBrains Mono` - 코드/데이터 표시용 모노스페이스
- **Korean Font**: `Pretendard` - 한글 최적화 폰트

### 📏 폰트 스케일
- **H1**: `2.5rem` (40px) - 메인 타이틀
- **H2**: `2rem` (32px) - 섹션 타이틀  
- **H3**: `1.5rem` (24px) - 카드 타이틀
- **Body**: `1rem` (16px) - 본문 텍스트
- **Caption**: `0.875rem` (14px) - 설명 텍스트
- **Code**: `0.875rem` (14px) - 코드/데이터

### 🎨 텍스트 색상 가이드라인
- **일반 텍스트**: `#9AA0A6` - 보조 텍스트 색상 사용
- **선택된 텍스트**: `#FFFFFF` - 흰색으로 명확한 대비
- **호버 텍스트**: `#FFFFFF` - 흰색으로 일관성 유지
- **액센트 텍스트**: 금색 그라데이션 대신 흰색 사용 (가독성 우선)

## [애니메이션 시스템]
### ✨ 현업 수준의 마이크로 인터랙션
- **Hover Effects**: `transform: scale(1.02)` + `box-shadow` 증가
- **Click Feedback**: `transform: scale(0.98)` + 리플 효과
- **Loading States**: 스켈레톤 UI + 페이드 인/아웃
- **Data Transitions**: 숫자 카운팅 애니메이션
- **이징 함수**: `cubic-bezier(0.16, 1, 0.3, 1)` (Material Design 3 스타일)

### 🌊 플로우 애니메이션
- **Liquid Flow**: 데이터가 흐르는 듯한 곡선 애니메이션
- **Glass Morphism**: 블러 + 투명도 변화
- **Particle Effects**: 따뜻한 금색 파티클이 흩어지는 효과
- **Wave Motion**: 물결치는 듯한 배경 애니메이션
- **화면 전체 그라데이션**: 중앙에서 시작하는 타원형 그라데이션 배경

## [컴포넌트 디자인]
### 🧩 UI 컴포넌트 스타일
- **Glass Cards**: `backdrop-filter: blur(10px)` + 투명 배경
- **Floating Elements**: `box-shadow` + 미묘한 떠있는 효과
- **Interactive Buttons**: 호버 시 따뜻한 금색 글로우 효과
- **Data Visualization**: 따뜻한 금색 그라데이션 차트 + 애니메이션
- **Dynamic Island 사이드바**: 토글 시 둥근 모서리 + 블러 효과
- **리퀴드 글래스 금색**: 반투명한 유리 느낌의 따뜻한 금색 효과

### 📱 반응형 디자인
- **Mobile First**: 모바일 우선 설계
- **Breakpoints**: 
  - Mobile: `320px - 768px`
  - Tablet: `768px - 1024px` 
  - Desktop: `1024px+`
- **Touch Friendly**: 최소 44px 터치 영역

## [사용해야할 컴포넌트 및 애니메이션 레퍼런스]
- **React Bits**: https://github.com/DavidHDev/react-bits
- **Shadcn UI**: https://github.com/shadcn-ui/ui
- **Framer Motion**: https://www.framer.com/motion/
- **React Spring**: https://react-spring.io/
- **Lottie React**: https://lottiefiles.com/

## [레퍼런스 이미지]
- **폴더 위치**: `Document/refer_img/`
- **포함 파일**: 
  - `liquid1.png`, `liquid2.jpg`, `liquid3.png`, `liquid4.png` - 액체 유리 효과
  - `Dashboard.png`, `Dashboard1.png` - 대시보드 레이아웃
  - `Comfystyle1.png`, `Comyfstyle2.jpg`, `Comfystyle3.jpeg` - ComfyUI 스타일 워크플로우
  - `Makestyle1.png` - Make.com 스타일 워크플로우

## [접근성 (Accessibility)]
### ♿ 웹 접근성 가이드라인
- **WCAG 2.1 AA** 준수
- **색상 대비**: 최소 4.5:1 비율 유지
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **스크린 리더**: 적절한 ARIA 라벨 및 시맨틱 HTML
- **애니메이션**: `prefers-reduced-motion` 설정 존중

## [화면 전체 그라데이션 시스템]
### 🌅 배경 그라데이션
- **타원형 그라데이션**: `ellipse at center top`
- **색상 팔레트**: 따뜻한 노란색 → 오렌지 → 어두운 배경
- **투명도**: `0.08 → 0.05 → 0.03 → 0` (매우 미묘한 효과)
- **적용 범위**: 전체 화면 배경에 자연스러운 그라데이션

### 🎨 사이드바 Dynamic Island 효과
- **토글 시**: 둥근 모서리 (28px) + 블러 효과
- **위치 조정**: 드래그로 상하 위치 조정 가능
- **애니메이션**: 단계별 토글 (좌우 → 상하)
- **리퀴드 글래스**: 반투명한 유리 느낌의 따뜻한 금색

## [성능 최적화]
### ⚡ 렌더링 최적화
- **Lazy Loading**: 컴포넌트 및 이미지 지연 로딩
- **Code Splitting**: 라우트별 코드 분할
- **Memoization**: React.memo, useMemo, useCallback 활용
- **Bundle Size**: 불필요한 의존성 제거

### 🎯 사용자 경험
- **Loading States**: 모든 비동기 작업에 로딩 표시
- **Error Boundaries**: 에러 발생 시 우아한 폴백
- **Progressive Enhancement**: 기본 기능부터 고급 기능까지

## [구체적인 컴포넌트 스타일 가이드]

### 🎴 카드 컴포넌트 (Glass Card)
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
backdrop-filter: blur(10px);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

### 🔘 버튼 컴포넌트
**Primary Button (리퀴드 글래스 금색)**
```css
background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, rgba(255, 140, 0, 0.05) 100%);
backdrop-filter: blur(15px);
color: #FFFFFF;  /* 흰색 텍스트 */
border: 1px solid rgba(255, 165, 0, 0.3);
border-radius: 12px;
font-weight: 600;
transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

/* Hover */
transform: translateY(-2px);
box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
color: #FFFFFF;  /* 호버 시에도 흰색 유지 */
```

**Secondary Button (Glass)**
```css
background: rgba(255, 255, 255, 0.03);
border: 1px solid rgba(255, 255, 255, 0.08);
color: #E8EAED;
border-radius: 8px;
backdrop-filter: blur(10px);

/* Hover */
background: rgba(255, 255, 255, 0.1);
border-color: #D4AF37;
```

### 📊 데이터 테이블
```css
.table-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  background: rgba(255, 255, 255, 0.08);
  color: #B4B4C5;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.table-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

### 🔢 입력 필드 (Input)
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 8px;
color: #FFFFFF;
padding: 12px 16px;

/* Focus */
border-color: #D4AF37;
box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
```

### 📈 차트 컴포넌트
**색상 팔레트**
```javascript
chartColors = {
  primary: '#D4AF37',    // 골드
  success: '#10B981',    // 그린
  warning: '#F59E0B',    // 오렌지
  error: '#EF4444',      // 레드
  info: '#3B82F6',       // 블루
  gradient: [
    'rgba(212, 175, 55, 0.8)',
    'rgba(212, 175, 55, 0.4)',
    'rgba(212, 175, 55, 0.1)'
  ]
}
```

### 🎯 네비게이션 메뉴 (업데이트됨)
```css
.nav-menu {
  background: rgba(20, 27, 61, 0.8);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-item {
  color: #9AA0A6;  /* 일반 상태: 보조 텍스트 색상 */
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 8px;
  margin: 4px 8px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);  /* Liquid Glass Hover */
  color: #FFFFFF;  /* 흰색 텍스트 */
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, rgba(255, 140, 0, 0.05) 100%);  /* Liquid Gold Gradient */
  color: #FFFFFF;  /* 흰색 텍스트 */
  border: 1px solid rgba(255, 165, 0, 0.3);  /* Liquid Gold Border */
}
```

### ✨ 특수 효과

**Glow Effect (호버 시)**
```css
box-shadow: 
  0 0 20px rgba(212, 175, 55, 0.3),
  0 0 40px rgba(212, 175, 55, 0.2),
  0 0 60px rgba(212, 175, 55, 0.1);
```

**Shimmer Loading**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

**Liquid Flow Background**
```css
@keyframes liquidFlow {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
}

.liquid-blob {
  position: absolute;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  animation: liquidFlow 20s ease-in-out infinite;
  filter: blur(40px);
}
```

### 🎪 페이지별 레이아웃 가이드

**Dashboard 레이아웃**
- 상단: 핵심 지표 카드 (4개, Grid)
- 중앙: 주요 차트 (2-3개, 큰 카드)
- 하단: 최근 활동 테이블

**Backtest 페이지**
- 좌측: 파라미터 설정 패널 (Glass Card)
- 우측: 결과 시각화 영역 (차트 + 테이블)

**AlphaPool/Incubator 페이지**
- 워크플로우 스타일: 노드 기반 연결 다이어그램
- 드래그 앤 드롭 인터랙션
- 실시간 결과 프리뷰

### 📱 반응형 브레이크포인트 구체화
```typescript
const breakpoints = {
  mobile: '320px',
  mobileLarge: '480px',
  tablet: '768px',
  desktop: '1024px',
  desktopLarge: '1440px',
  wide: '1920px'
}
```

