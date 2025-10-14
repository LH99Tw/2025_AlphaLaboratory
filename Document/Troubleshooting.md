# 트러블슈팅 가이드

프로젝트 개발 과정에서 발생한 문제들과 해결 방법을 기록합니다.

---

## [1] 2025.01.15 - Proxy Error & CSV 인증 시스템 연동 실패

### 🔴 문제 상황

**에러 메시지:**
```
Unexpected token 'P', "Proxy erro"... is not valid JSON
```

**증상:**
- 프론트엔드에서 백엔드 API 호출 시 Proxy Error 발생
- 회원가입/로그인 기능이 작동하지 않음
- CSV 기반 인증 시스템이 연동되지 않음

### 🔍 원인 분석

#### 1. 백엔드-프론트엔드 포트 불일치
- **백엔드**: `backend/app.py`에서 포트를 5002 → 5000으로 변경
- **프론트엔드**: `frontend/package.json`의 proxy 설정이 여전히 5002
- **결과**: 프론트엔드가 잘못된 포트로 요청을 보내 Proxy Error 발생

```json
// frontend/package.json (변경 전)
{
  "proxy": "http://localhost:5002"  // ❌ 잘못된 포트
}
```

#### 2. CSV 파일 스키마 불일치
- **CSV Manager**: `csv_manager.py`에서 `users.csv`에 `profile_emoji` 필드 추가
- **초기화 스크립트**: `create_admin.py`가 이전 스키마 사용
- **결과**: CSV 파일의 컬럼 수가 맞지 않아 데이터 로드 실패

```python
# create_admin.py (변경 전)
writer.writerow(['user_id', 'username', 'email', 'password_hash', 'name', 
                 'created_at', 'last_login', 'is_active', 'user_type'])
# ❌ profile_emoji 누락
```

### ✅ 해결 과정

#### 1단계: 포트 설정 수정
```json
// frontend/package.json
{
  "proxy": "http://localhost:5000"  // ✅ 올바른 포트
}
```

#### 2단계: CSV 스키마 통일
```python
# backend/create_admin.py - 헤더 수정
writer.writerow(['user_id', 'username', 'email', 'password_hash', 'name', 
                 'profile_emoji',  # ✅ 추가
                 'created_at', 'last_login', 'is_active', 'user_type'])

# Admin 계정 생성 시 데이터 추가
writer.writerow([
    admin_id,
    'admin',
    'admin@smartanalytics.com',
    hash_password('admin123'),
    '관리자',
    '😀',  # ✅ profile_emoji 추가
    datetime.now().isoformat(),
    None,
    'True',
    'admin'
])
```

#### 3단계: CSV 파일 재생성
```bash
# 기존 CSV 파일 삭제
rm database/csv_data/*.csv

# 새로운 스키마로 CSV 파일 생성
cd backend && python create_admin.py
```

**생성된 CSV 파일 확인:**
```csv
user_id,username,email,password_hash,name,profile_emoji,created_at,last_login,is_active,user_type
15903c6a-03fe-4dde-937b-e5b008101f5e,admin,admin@smartanalytics.com,240be518...,관리자,😀,2025-10-15T04:48:18.219635,,True,admin
```

#### 4단계: 백엔드 재시작
```bash
# 기존 프로세스 종료
kill $(lsof -ti:5000)

# 백엔드 재시작
cd backend && python app.py
```

### 📊 검증 결과

✅ **포트 통일**: 프론트엔드와 백엔드 모두 5000번 포트 사용  
✅ **CSV 스키마**: 모든 CSV 파일이 동일한 스키마로 생성됨  
✅ **Admin 계정**: `admin / admin123` 정상 생성  
✅ **프로필 이모지**: 😀 기본값으로 설정  
✅ **API 연동**: `/api/csv/user/login`, `/api/csv/user/register` 정상 작동  

### 🎓 교훈 및 예방책

#### 1. 포트 관리
- **문제**: 백엔드 포트 변경 시 프론트엔드 설정 미반영
- **해결**: 환경 변수로 포트 관리
  ```javascript
  // .env
  REACT_APP_API_URL=http://localhost:5000
  
  // package.json
  "proxy": process.env.REACT_APP_API_URL
  ```

#### 2. 스키마 동기화
- **문제**: CSV 스키마 변경 시 초기화 스크립트 미업데이트
- **해결**: 
  - CSV 스키마를 단일 소스(csv_manager.py)에서 관리
  - 초기화 스크립트가 csv_manager의 스키마를 참조하도록 수정
  ```python
  # 개선 방안
  from csv_manager import CSVManager
  
  csv_manager = CSVManager()
  csv_manager._initialize_csv_files()  # 스키마 자동 동기화
  ```

#### 3. 데이터 검증
- **문제**: CSV 파일 생성 후 스키마 검증 부재
- **해결**: 
  - CSV 파일 생성 후 자동 검증 스크립트 추가
  - 컬럼 수, 필드명 일치 여부 확인
  ```python
  def validate_csv_schema():
      expected_columns = ['user_id', 'username', ..., 'profile_emoji', ...]
      with open('users.csv', 'r') as f:
          reader = csv.reader(f)
          headers = next(reader)
          assert headers == expected_columns
  ```

### 📝 관련 파일

- `frontend/package.json` - Proxy 설정
- `backend/app.py` - 백엔드 포트 설정
- `backend/csv_manager.py` - CSV 스키마 정의
- `backend/create_admin.py` - 초기 데이터 생성
- `database/csv_data/users.csv` - 사용자 데이터

### 🔗 관련 문서

- [DataStructure.md](./DataStructure.md) - CSV 데이터 구조
- [Log.md](./Log.md) - [15] 인증 시스템 개선
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - User Profile Endpoints

---

## 트러블슈팅 템플릿

새로운 문제 발생 시 아래 템플릿을 사용하여 기록합니다:

```markdown
## [번호] YYYY.MM.DD - 문제 제목

### 🔴 문제 상황
**에러 메시지:**
\`\`\`
에러 메시지
\`\`\`

**증상:**
- 증상 1
- 증상 2

### 🔍 원인 분석
#### 1. 원인 1
- 설명
- 코드 예시

### ✅ 해결 과정
#### 1단계: 해결 방법 1
\`\`\`
코드 또는 명령어
\`\`\`

### 📊 검증 결과
✅ 항목 1
✅ 항목 2

### 🎓 교훈 및 예방책
- 교훈
- 예방 방법

### 📝 관련 파일
- 파일 목록

### 🔗 관련 문서
- 문서 링크
```

---

## 자주 발생하는 문제 (FAQ)

### Q1. "Module not found" 에러
**원인**: Python 가상환경이 활성화되지 않음  
**해결**: `source venv/bin/activate`

### Q2. "Port already in use" 에러
**원인**: 이전 프로세스가 포트를 사용 중  
**해결**: `kill $(lsof -ti:포트번호)`

### Q3. CSV 파일 인코딩 문제
**원인**: UTF-8 BOM 없이 저장됨  
**해결**: `encoding='utf-8-sig'` 사용

### Q4. 프론트엔드 proxy 에러
**원인**: 백엔드 서버가 실행되지 않음 또는 포트 불일치  
**해결**: 
1. 백엔드 실행 확인
2. package.json의 proxy 설정 확인

---

## 디버깅 체크리스트

문제 발생 시 순서대로 확인:

### 백엔드
- [ ] 가상환경 활성화 (`source venv/bin/activate`)
- [ ] 필요한 패키지 설치 (`pip install -r requirements.txt`)
- [ ] 백엔드 서버 실행 확인 (`lsof -ti:5000`)
- [ ] 로그 확인 (콘솔 출력 또는 로그 파일)
- [ ] CSV 파일 존재 및 스키마 확인

### 프론트엔드
- [ ] Node 모듈 설치 (`npm install`)
- [ ] Proxy 설정 확인 (`package.json`)
- [ ] 브라우저 콘솔 에러 확인
- [ ] 네트워크 탭에서 API 요청/응답 확인

### 데이터베이스 (CSV)
- [ ] CSV 파일 존재 확인 (`ls database/csv_data/`)
- [ ] CSV 파일 인코딩 확인 (UTF-8 BOM)
- [ ] CSV 헤더와 데이터 컬럼 수 일치 확인
- [ ] 필수 데이터 존재 확인 (admin 계정 등)

---

## 로그 수집 방법

### 백엔드 로그
```bash
# 백엔드 로그를 파일로 저장
cd backend
python app.py 2>&1 | tee backend.log
```

### 프론트엔드 로그
```bash
# 개발자 도구 > 콘솔 > 우클릭 > Save as...
```

### 시스템 로그
```bash
# 포트 사용 현황
lsof -i :5000

# 프로세스 확인
ps aux | grep python
ps aux | grep node

# CSV 파일 확인
cat database/csv_data/users.csv
```

---

## 문의 및 기여

트러블슈팅 과정에서 새로운 문제를 발견하거나 해결 방법을 찾았다면:
1. 이 문서에 추가
2. Log.md에 참조 링크 추가
3. 관련 코드에 주석으로 문서 링크 추가

