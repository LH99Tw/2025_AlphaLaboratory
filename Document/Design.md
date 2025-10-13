# 🎨 디자인 시스템 가이드

## [디자인 철학]
- **고급스러우면서, 금융과 IT 사이에 걸쳐있는 현대적인 느낌**을 주고자 한다.
- **최대한 있어보이는 애니메이션 효과** 추가
- **프로그램 테마인 연구소에서 알파를 탄생시키고 진화시킨다는 의학적인 컨셉**도 들어있는 느낌.
- **React, TypeScript**를 기반으로 개발 
- **투명한 유리같은 재질과 크롬, 흐르는 듯한 금색**을 주로 사용한다.
- **참고하는 것은 iOS 17 Liquid Glass**의 유리재질같은 디자인 컨셉과 **ComfyUI, Make** 등의 Workflow 같은 사용자가 사고과정을 쉽게 보고, 수정할 수 있도록 하는 것.

## [컬러 팔레트]
### 🎨 주요 색상
- **Primary Gold**: `#FFD700` - 메인 브랜드 컬러, 고급스러운 금색
- **Liquid Glass**: `rgba(255, 255, 255, 0.1)` - 투명 유리 효과
- **Chrome Silver**: `#C0C0C0` - 크롬 메탈릭 효과
- **Deep Blue**: `#1E3A8A` - 신뢰감을 주는 딥 블루
- **Success Green**: `#10B981` - 수익/성공을 나타내는 그린
- **Warning Orange**: `#F59E0B` - 주의/경고를 나타내는 오렌지
- **Error Red**: `#EF4444` - 손실/위험을 나타내는 레드

### 🌈 그라데이션
- **Gold Gradient**: `linear-gradient(135deg, #FFD700, #FFA500)`
- **Glass Gradient**: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`
- **Liquid Flow**: `linear-gradient(90deg, #FFD700, #FFA500, #FF6B6B)`

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

## [애니메이션 시스템]
### ✨ 마이크로 인터랙션
- **Hover Effects**: `transform: scale(1.02)` + `box-shadow` 증가
- **Click Feedback**: `transform: scale(0.98)` + 리플 효과
- **Loading States**: 스켈레톤 UI + 페이드 인/아웃
- **Data Transitions**: 숫자 카운팅 애니메이션

### 🌊 플로우 애니메이션
- **Liquid Flow**: 데이터가 흐르는 듯한 곡선 애니메이션
- **Glass Morphism**: 블러 + 투명도 변화
- **Particle Effects**: 금색 파티클이 흩어지는 효과
- **Wave Motion**: 물결치는 듯한 배경 애니메이션

## [컴포넌트 디자인]
### 🧩 UI 컴포넌트 스타일
- **Glass Cards**: `backdrop-filter: blur(10px)` + 투명 배경
- **Floating Elements**: `box-shadow` + 미묘한 떠있는 효과
- **Interactive Buttons**: 호버 시 금색 글로우 효과
- **Data Visualization**: 그라데이션 차트 + 애니메이션

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
  - `Comfystyle1.png`, `Comyfstyle2.jpg` - ComfyUI 스타일 워크플로우
  - `Makestyle1.png` - Make.com 스타일 워크플로우

## [접근성 (Accessibility)]
### ♿ 웹 접근성 가이드라인
- **WCAG 2.1 AA** 준수
- **색상 대비**: 최소 4.5:1 비율 유지
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **스크린 리더**: 적절한 ARIA 라벨 및 시맨틱 HTML
- **애니메이션**: `prefers-reduced-motion` 설정 존중

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

