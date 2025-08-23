# 계산된 각 알파의 누적 수익률을 시각화
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import glob
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# 한글 폰트 설정
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

class CumulativeReturnVisualizer:
    def __init__(self, config_file=None):
        """
        누적 수익률 시각화 클래스 초기화
        
        Args:
            config_file: 시각화 설정 파일 경로
        """
        # 설정 파일 경로 자동 설정
        if config_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_file = os.path.join(current_dir, 'visualize_config.json')
        
        self.config_file = config_file
        self.config = self.load_config()
        
        # 설정에서 경로 가져오기 (상대 경로를 절대 경로로 변환)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.data_directory = os.path.join(
            current_dir,
            self.config['data_settings']['base_data_directory'],
            f"{self.config['visualization_settings']['target_rebalancing_frequency']}_rebalancing"
        )
        
        # 출력 디렉토리 설정
        if self.config['output_settings']['output_directory'] == "../":
            self.output_directory = os.path.join(current_dir, '..')
        else:
            self.output_directory = self.config['output_settings']['output_directory']
        
        self.factor_data = {}
        self.metrics_data = None
    
    def load_config(self):
        """JSON 설정 파일 로드"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            print(f"✅ 시각화 설정 파일 로드 완료: {self.config_file}")
            return config
        except FileNotFoundError:
            print(f"⚠️ 설정 파일을 찾을 수 없습니다: {self.config_file}")
            print("기본 설정을 사용합니다.")
            return self.get_default_config()
        except json.JSONDecodeError as e:
            print(f"❌ 설정 파일 JSON 오류: {e}")
            print("기본 설정을 사용합니다.")
            return self.get_default_config()
    
    def get_default_config(self):
        """기본 설정 반환"""
        return {
            "visualization_settings": {
                "target_rebalancing_frequency": "daily",
                "available_frequencies": ["daily", "weekly", "monthly", "quarterly"],
                "top_n_factors": 10,
                "top_n_individual": 3,
                "save_plots": True,
                "plot_dpi": 300,
                "sorting_criteria": "CumulativeReturn",
                "available_sorting_criteria": [
                    "CumulativeReturn",
                    "CAGR", 
                    "SharpeRatio",
                    "SortinoRatio",
                    "IC",
                    "WinRate",
                    "MDD",
                    "Turnover",
                    "Skewness",
                    "Kurtosis"
                ]
            },
            "output_settings": {
                "output_directory": "../",
                "plot_format": "png",
                "include_comparison_plot": True,
                "include_individual_plots": True,
                "include_combined_plot": True
            },
            "data_settings": {
                "base_data_directory": "calculated_alphas",
                "metrics_filename": "enhanced_backtest_metrics.csv",
                "factor_returns_prefix": "factor_returns_"
            },
            "plot_settings": {
                "figure_size_comparison": [15, 10],
                "figure_size_individual": [15, 12],
                "figure_size_combined": [20, 15],
                "color_palette": "husl",
                "grid_alpha": 0.3,
                "line_width": 2,
                "alpha_transparency": 0.8
            }
        }
    
    def print_current_config(self):
        """현재 설정 출력"""
        print("\n📋 현재 시각화 설정:")
        print(f"   • 대상 리밸런싱 주기: {self.config['visualization_settings']['target_rebalancing_frequency']}")
        print(f"   • 데이터 디렉토리: {self.data_directory}")
        print(f"   • 출력 디렉토리: {self.output_directory}")
        print(f"   • 상위 N개 팩터: {self.config['visualization_settings']['top_n_factors']}")
        print(f"   • 상위 N개 개별 분석: {self.config['visualization_settings']['top_n_individual']}")
        print(f"   • 정렬 기준: {self.config['visualization_settings']['sorting_criteria']}")
    
    def get_sorting_criteria(self):
        """현재 정렬 기준 반환"""
        return self.config['visualization_settings']['sorting_criteria']
    
    def set_sorting_criteria(self, criteria):
        """정렬 기준 설정"""
        available_criteria = self.config['visualization_settings']['available_sorting_criteria']
        
        if criteria not in available_criteria:
            print(f"❌ 유효하지 않은 정렬 기준: {criteria}")
            print(f"   사용 가능한 기준: {available_criteria}")
            return False
        
        self.config['visualization_settings']['sorting_criteria'] = criteria
        print(f"✅ 정렬 기준 변경: {criteria}")
        return True
    
    def get_available_sorting_criteria(self):
        """사용 가능한 정렬 기준 목록 반환"""
        return self.config['visualization_settings']['available_sorting_criteria']
    
    def print_available_sorting_criteria(self):
        """사용 가능한 정렬 기준 출력"""
        criteria = self.get_available_sorting_criteria()
        current = self.get_sorting_criteria()
        
        print("\n📊 사용 가능한 정렬 기준:")
        for i, criterion in enumerate(criteria, 1):
            marker = "✓" if criterion == current else " "
            print(f"   {marker} {i:2d}. {criterion}")
    
    def get_top_factors_by_criteria(self, top_n=None, criteria=None):
        """정렬 기준에 따른 상위 팩터 반환"""
        if not self.factor_data:
            return []
        
        if top_n is None:
            top_n = self.config['visualization_settings']['top_n_factors']
        
        if criteria is None:
            criteria = self.get_sorting_criteria()
        
        # 정렬 기준에 따른 데이터 수집
        factor_scores = {}
        
        if criteria == "CumulativeReturn":
            # 누적 수익률 기준 (팩터 데이터에서 직접 계산)
            for factor, df in self.factor_data.items():
                final_return = df['CumulativeReturn'].iloc[-1]
                factor_scores[factor] = final_return
        elif self.metrics_data is not None and criteria in self.metrics_data.columns:
            # 성능 지표 파일에서 가져오기
            for _, row in self.metrics_data.iterrows():
                factor = row['Factor']
                if factor in self.factor_data:  # 팩터 데이터가 있는 경우만
                    factor_scores[factor] = row[criteria]
        else:
            print(f"❌ 정렬 기준 '{criteria}'에 대한 데이터를 찾을 수 없습니다.")
            return []
        
        # 정렬 (높은 값이 좋은 지표는 내림차순, 낮은 값이 좋은 지표는 오름차순)
        reverse_order_criteria = ["CumulativeReturn", "CAGR", "SharpeRatio", "SortinoRatio", "IC", "WinRate"]
        reverse = criteria in reverse_order_criteria
        
        # 상위 N개 선택
        sorted_factors = sorted(factor_scores.items(), key=lambda x: x[1], reverse=reverse)[:top_n]
        return [factor for factor, _ in sorted_factors]
    
    def update_config_file(self):
        """설정 파일 업데이트"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            print(f"✅ 설정 파일 업데이트 완료: {self.config_file}")
            return True
        except Exception as e:
            print(f"❌ 설정 파일 업데이트 실패: {e}")
            return False
        
    def load_factor_data(self):
        """팩터 수익률 데이터 로드"""
        print(f"📂 팩터 데이터 로딩 중... ({self.data_directory})")
        
        # factor_returns_*.csv 파일들 찾기
        pattern = os.path.join(self.data_directory, 'factor_returns_*.csv')
        factor_files = glob.glob(pattern)
        
        if not factor_files:
            print(f"❌ {self.data_directory}에서 팩터 파일을 찾을 수 없습니다.")
            print(f"   사용 가능한 리밸런싱 주기: {self.config['visualization_settings']['available_frequencies']}")
            return False
        
        print(f"✅ {len(factor_files)}개의 팩터 파일 발견")
        
        # 각 팩터 데이터 로드
        for file_path in factor_files:
            try:
                # 파일명에서 팩터명 추출
                factor_name = os.path.basename(file_path).replace('factor_returns_', '').replace('.csv', '')
                
                # CSV 파일 로드 (주석 라인 제외)
                df = pd.read_csv(file_path, comment='#')
                df['Date'] = pd.to_datetime(df['Date'])
                
                # CumulativeReturn 컬럼이 있는지 확인
                if 'CumulativeReturn' in df.columns:
                    self.factor_data[factor_name] = df
                    print(f"  ✅ {factor_name}: {len(df)}행 로드")
                else:
                    print(f"  ⚠️ {factor_name}: CumulativeReturn 컬럼 없음")
                    
            except Exception as e:
                print(f"  ❌ {file_path} 로드 실패: {e}")
        
        # 성능 지표 파일 로드
        metrics_file = os.path.join(self.data_directory, self.config['data_settings']['metrics_filename'])
        if os.path.exists(metrics_file):
            self.metrics_data = pd.read_csv(metrics_file)
            print(f"✅ 성능 지표 파일 로드: {len(self.metrics_data)}개 팩터")
        
        return len(self.factor_data) > 0
    
    def plot_cumulative_return_comparison(self, top_n=None, specific_factors=None, save_plot=None):
        """상위 N개 팩터의 누적 수익률 비교 그래프"""
        if not self.factor_data:
            print("❌ 팩터 데이터가 없습니다.")
            return
        
        # 설정 파일에서 기본값 가져오기
        if top_n is None:
            top_n = self.config['visualization_settings']['top_n_factors']
        if save_plot is None:
            save_plot = self.config['visualization_settings']['save_plots']
        
        # 특정 팩터가 지정된 경우 사용, 아니면 설정된 정렬 기준으로 선택
        if specific_factors:
            top_factors = [factor for factor in specific_factors if factor in self.factor_data]
        else:
            # 설정된 정렬 기준으로 상위 N개 선택
            top_factors = self.get_top_factors_by_criteria(top_n)
        
        current_criteria = self.get_sorting_criteria()
        print(f"📊 상위 {len(top_factors)}개 팩터 누적 수익률 비교 그래프 생성 중... (정렬 기준: {current_criteria})")
        
        # 설정에서 그래프 크기 가져오기
        fig_size = self.config['plot_settings']['figure_size_comparison']
        plt.figure(figsize=fig_size)
        
        # 설정에서 색상 팔레트 가져오기
        colors = sns.color_palette(self.config['plot_settings']['color_palette'], len(top_factors))
        
        for i, factor in enumerate(top_factors):
            if factor in self.factor_data:
                df = self.factor_data[factor]
                
                # 누적 수익률 데이터 플롯
                plt.plot(df['Date'], df['CumulativeReturn'], 
                        label=factor, color=colors[i], 
                        linewidth=self.config['plot_settings']['line_width'], 
                        alpha=self.config['plot_settings']['alpha_transparency'])
        
        plt.title(f'Cumulative Return Comparison (Top {len(top_factors)} Factors)', 
                    fontsize=16, fontweight='bold', pad=20)
        plt.xlabel('Date', fontsize=12)
        plt.ylabel('Cumulative Return', fontsize=12)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
        plt.grid(True, alpha=self.config['plot_settings']['grid_alpha'])
        plt.tight_layout()
        
        if save_plot:
            plot_format = self.config['output_settings']['plot_format']
            plot_path = os.path.join(self.output_directory, f'cumulative_return_comparison.{plot_format}')
            plt.savefig(plot_path, dpi=self.config['visualization_settings']['plot_dpi'], bbox_inches='tight')
            print(f"✅ 그래프 저장: {plot_path}")
        
        plt.show()
    
    def plot_individual_cumulative_return(self, factor_name, save_plot=True):
        """개별 팩터의 누적 수익률 상세 그래프"""
        if factor_name not in self.factor_data:
            print(f"❌ 팩터 {factor_name}을 찾을 수 없습니다.")
            return
        
        df = self.factor_data[factor_name]
        
        # 그래프 생성
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 12))
        
        # 상단: 누적 수익률
        ax1.plot(df['Date'], df['CumulativeReturn'], 
                color='blue', linewidth=2, label='Cumulative Return')
        ax1.axhline(y=0, color='red', linestyle='--', alpha=0.5, label='Zero Line')
        ax1.set_title(f'{factor_name} - Cumulative Return', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Cumulative Return', fontsize=12)
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # 하단: 일별 수익률
        if 'LongReturn_Net' in df.columns:
            daily_return_col = 'LongReturn_Net'
        else:
            daily_return_col = 'LongReturn'
            
        ax2.plot(df['Date'], df[daily_return_col], 
                color='green', linewidth=1, alpha=0.7, label='Daily Return')
        ax2.axhline(y=0, color='red', linestyle='--', alpha=0.5, label='Zero Line')
        ax2.set_title(f'{factor_name} - Daily Return', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Date', fontsize=12)
        ax2.set_ylabel('Daily Return', fontsize=12)
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        
        plt.tight_layout()
        
        if save_plot:
            plot_path = os.path.join(self.output_directory, f'{factor_name}_cumulative_return.png')
            plt.savefig(plot_path, dpi=300, bbox_inches='tight')
            print(f"✅ 그래프 저장: {plot_path}")
        
        plt.show()
    
    def plot_top3_factors_combined(self, save_plot=None):
        """상위 N개 팩터를 한 번에 보여주는 그래프"""
        if not self.factor_data:
            print("❌ 팩터 데이터가 없습니다.")
            return
        
        # 설정 파일에서 기본값 가져오기
        if save_plot is None:
            save_plot = self.config['visualization_settings']['save_plots']
        
        top_n = self.config['visualization_settings']['top_n_individual']
        
        # 설정된 정렬 기준으로 상위 N개 팩터 선택
        top_factors = self.get_top_factors_by_criteria(top_n)
        
        current_criteria = self.get_sorting_criteria()
        print(f"📊 상위 {top_n}개 팩터 ({current_criteria} 기준) 상세 분석 그래프 생성 중...")
        
        # Nx2 서브플롯 생성
        fig_size = self.config['plot_settings']['figure_size_combined']
        fig, axes = plt.subplots(top_n, 2, figsize=fig_size)
        current_criteria = self.get_sorting_criteria()
        fig.suptitle(f'Top {top_n} Factors Analysis ({current_criteria}-based)', fontsize=16, fontweight='bold')
        
        # 단일 팩터인 경우 axes를 2D 배열로 변환
        if top_n == 1:
            axes = axes.reshape(1, -1)
        
        for i, factor in enumerate(top_factors):
            if factor in self.factor_data:
                df = self.factor_data[factor]
                
                # 상단: 누적 수익률
                axes[i, 0].plot(df['Date'], df['CumulativeReturn'], 
                              color='blue', 
                              linewidth=self.config['plot_settings']['line_width'], 
                              label='Cumulative Return')
                axes[i, 0].axhline(y=0, color='red', linestyle='--', alpha=0.5, label='Zero Line')
                axes[i, 0].set_title(f'{factor} - Cumulative Return', fontsize=12, fontweight='bold')
                axes[i, 0].set_ylabel('Cumulative Return', fontsize=10)
                axes[i, 0].grid(True, alpha=self.config['plot_settings']['grid_alpha'])
                axes[i, 0].legend()
                
                # 하단: 일별 수익률
                if 'LongReturn_Net' in df.columns:
                    daily_return_col = 'LongReturn_Net'
                else:
                    daily_return_col = 'LongReturn'
                    
                axes[i, 1].plot(df['Date'], df[daily_return_col], 
                              color='green', linewidth=1, 
                              alpha=self.config['plot_settings']['alpha_transparency'], 
                              label='Daily Return')
                axes[i, 1].axhline(y=0, color='red', linestyle='--', alpha=0.5, label='Zero Line')
                axes[i, 1].set_title(f'{factor} - Daily Return', fontsize=12, fontweight='bold')
                axes[i, 1].set_xlabel('Date', fontsize=10)
                axes[i, 1].set_ylabel('Daily Return', fontsize=10)
                axes[i, 1].grid(True, alpha=self.config['plot_settings']['grid_alpha'])
                axes[i, 1].legend()
        
        plt.tight_layout()
        
        if save_plot:
            plot_format = self.config['output_settings']['plot_format']
            plot_path = os.path.join(self.output_directory, f'top{top_n}_factors_combined.{plot_format}')
            plt.savefig(plot_path, dpi=self.config['visualization_settings']['plot_dpi'], bbox_inches='tight')
            print(f"✅ 그래프 저장: {plot_path}")
        
        plt.show()
    
    def generate_summary_report(self):
        """누적 수익률 기준 요약 리포트 생성"""
        if not self.factor_data:
            print("❌ 팩터 데이터가 없습니다.")
            return
        
        current_criteria = self.get_sorting_criteria()
        print("\n" + "="*80)
        print(f"📊 {current_criteria} 기준 요약 리포트")
        print("="*80)
        
        # 각 팩터의 누적 수익률 통계
        cumulative_stats = []
        
        for factor, df in self.factor_data.items():
            final_return = df['CumulativeReturn'].iloc[-1]
            
            stats = {
                'Factor': factor,
                'Final_Return': final_return,
                'Max_Return': df['CumulativeReturn'].max(),
                'Min_Return': df['CumulativeReturn'].min(),
                'Positive_Days': (df['CumulativeReturn'] > 0).sum(),
                'Total_Days': len(df)
            }
            cumulative_stats.append(stats)
        
        if cumulative_stats:
            stats_df = pd.DataFrame(cumulative_stats)
            
            print(f"\n📈 누적 수익률 통계 ({len(stats_df)}개 팩터):")
            print(f"   • 평균 최종 수익률: {stats_df['Final_Return'].mean():.4f}")
            print(f"   • 최대 수익률: {stats_df['Max_Return'].max():.4f}")
            print(f"   • 최소 수익률: {stats_df['Min_Return'].min():.4f}")
            print(f"   • 수익률 표준편차: {stats_df['Final_Return'].std():.4f}")
            
            print(f"\n🏆 상위 10개 팩터 ({current_criteria} 기준):")
            top_10_return = stats_df.nlargest(10, 'Final_Return')[['Factor', 'Final_Return', 'Max_Return', 'Min_Return', 'Positive_Days']]
            print(top_10_return.to_string(index=False, float_format='%.4f'))
        else:
            print("❌ 팩터 데이터가 없습니다.")
        
        print("\n" + "="*80)

def main():
    """메인 실행 함수"""
    print("🎨 누적 수익률 기준 시각화 시작")
    
    # 시각화 객체 생성
    visualizer = CumulativeReturnVisualizer()
    
    # 현재 설정 출력
    visualizer.print_current_config()
    
    # 사용 가능한 정렬 기준 출력
    visualizer.print_available_sorting_criteria()
    
    # 데이터 로드
    if not visualizer.load_factor_data():
        print("❌ 데이터 로드 실패")
        return
    
    # 요약 리포트 생성
    visualizer.generate_summary_report()
    
    # 그래프 생성
    print("\n📊 그래프 생성 중...")
    
    # 설정에 따라 그래프 생성
    if visualizer.config['output_settings']['include_comparison_plot']:
        # 1. 상위 N개 팩터 누적 수익률 비교
        visualizer.plot_cumulative_return_comparison()
    
    if visualizer.config['output_settings']['include_combined_plot']:
        # 2. 상위 N개 팩터 한 번에 보여주기
        visualizer.plot_top3_factors_combined()
    
    print("✅ 시각화 완료!")

def interactive_sorting_demo():
    """정렬 기준 변경 데모 함수"""
    print("🎯 정렬 기준 변경 데모")
    
    visualizer = CumulativeReturnVisualizer()
    
    if not visualizer.load_factor_data():
        print("❌ 데이터 로드 실패")
        return
    
    # 사용 가능한 정렬 기준 출력
    visualizer.print_available_sorting_criteria()
    
    # 다양한 정렬 기준으로 테스트
    test_criteria = ["SharpeRatio", "IC", "CAGR", "MDD"]
    
    for criteria in test_criteria:
        print(f"\n🔄 정렬 기준을 '{criteria}'로 변경...")
        visualizer.set_sorting_criteria(criteria)
        
        # 상위 5개 팩터 출력
        top_factors = visualizer.get_top_factors_by_criteria(5)
        print(f"   상위 5개 팩터 ({criteria} 기준): {top_factors}")
    
    # 설정 파일 업데이트
    visualizer.update_config_file()
    print("\n✅ 데모 완료!")

if __name__ == "__main__":
    main()

