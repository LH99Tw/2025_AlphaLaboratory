# API Endpoints Documentation

## 🔌 Backend API 엔드포인트

### Health & Status

#### `GET /api/health`
서버 상태 확인
```json
Response: {
  "status": "healthy",
  "timestamp": "2025-10-14T12:00:00",
  "systems": {
    "backtest": true,
    "ga": true,
    "langchain": true,
    "database": true
  }
}
```

---

### Backtest APIs

#### `POST /api/backtest`
백테스트 실행 (비동기)
```json
Request: {
  "start_date": "2020-01-01",
  "end_date": "2024-12-31",
  "factors": ["alpha001", "alpha002"],
  "rebalancing_frequency": "weekly",
  "transaction_cost": 0.001,
  "quantile": 0.1,
  "max_factors": 2
}

Response: {
  "success": true,
  "task_id": "backtest_1234567890",
  "message": "Backtest started"
}
```

#### `GET /api/backtest/status/<task_id>`
백테스트 진행 상태 조회
```json
Response: {
  "status": "completed",
  "progress": 100,
  "result": {
    "cumulative_return": 0.85,
    "sharpe_ratio": 1.85,
    "max_drawdown": -0.12,
    ...
  }
}
```

---

### GA (Genetic Algorithm) APIs

#### `POST /api/ga/run`
유전 알고리즘 실행
```json
Request: {
  "generations": 10,
  "population": 50,
  "max_depth": 5
}

Response: {
  "success": true,
  "task_id": "ga_1234567890",
  "message": "GA evolution started"
}
```

#### `GET /api/ga/status/<task_id>`
GA 진행 상태 조회
```json
Response: {
  "status": "running",
  "progress": 45,
  "current_generation": 5,
  "best_alphas": [...]
}
```

---

### AI Agent (Langchain) APIs

#### `POST /api/chat`
AI 에이전트와 채팅
```json
Request: {
  "message": "What are the best performing alpha factors?"
}

Response: {
  "success": true,
  "response": "I've analyzed the alpha factors. Based on our data, momentum-based alphas are showing strong performance...",
  "timestamp": "2025-10-14T12:00:00",
  "agents": {
    "coordinator": "active",
    "data_analyst": "completed",
    "alpha_researcher": "completed",
    "portfolio_manager": "completed"
  }
}
```

---

### Data APIs

#### `GET /api/data/factors`
사용 가능한 알파 팩터 목록 조회
```json
Response: {
  "success": true,
  "factors": ["alpha001", "alpha002", ...],
  "total_count": 101
}
```

#### `GET /api/data/stats`
데이터 통계 정보 조회
```json
Response: {
  "success": true,
  "stats": {
    "price_data": {
      "file_exists": true,
      "columns": [...],
      "sample_rows": 1000
    },
    "alpha_data": {
      "file_exists": true,
      "total_columns": 150,
      "alpha_factors": 101,
      "sample_rows": 1000
    }
  }
}
```

#### `GET /api/data/ticker-list`
S&P 500 티커 목록 조회
```json
Response: {
  "success": true,
  "tickers": ["AAPL", "MSFT", "GOOGL", ...],
  "total_count": 500
}
```

---

### Authentication APIs

#### `POST /api/auth/login`
로그인
```json
Request: {
  "username": "admin",
  "password": "password123"
}

Response: {
  "success": true,
  "message": "Login successful",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

#### `POST /api/auth/logout`
로그아웃
```json
Response: {
  "success": true,
  "message": "Logout successful"
}
```

#### `GET /api/auth/me`
현재 사용자 정보 조회
```json
Response: {
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## 🔧 Frontend Integration

### API 호출 예시 (TypeScript)

```typescript
import { api } from './services/api';

// Health Check
const healthData = await api.get('/health');

// Backtest
const backtestResult = await api.post('/backtest', {
  start_date: '2020-01-01',
  end_date: '2024-12-31',
  factors: ['alpha001'],
  rebalancing_frequency: 'weekly'
});

// GA Evolution
const gaResult = await api.post('/ga/run', {
  generations: 10,
  population: 50
});

// AI Chat
const chatResponse = await api.post('/chat', {
  message: 'Analyze alpha factors'
});
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Authentication uses session-based cookies
- CORS is enabled for frontend communication
- Error responses include `{ "error": "Error message" }` with appropriate HTTP status codes

---

## 👤 User Profile Endpoints

### 1. GET `/api/csv/user/info`
사용자 정보를 조회합니다.

**Response:**
```json
{
  "success": true,
  "user_info": {
    "user_id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "name": "관리자",
    "profile_emoji": "😀",
    "created_at": "2025-01-15T10:00:00",
    "last_login": "2025-01-15T15:00:00"
  }
}
```

### 2. PUT `/api/csv/user/profile/update`
프로필 정보를 업데이트합니다.

**Request Body:**
```json
{
  "nickname": "새닉네임",
  "name": "새이름",
  "email": "new@example.com",
  "profile_emoji": "🤓"
}
```

**Response:**
```json
{
  "success": true,
  "message": "프로필이 업데이트되었습니다"
}
```

### 3. POST `/api/csv/user/password/change`
비밀번호를 변경합니다.

**Request Body:**
```json
{
  "current_password": "현재비밀번호",
  "new_password": "새비밀번호"
}
```

**Response:**
```json
{
  "success": true,
  "message": "비밀번호가 변경되었습니다"
}
```

### 4. GET `/api/csv/user/investment`
사용자의 투자 데이터를 조회합니다.

**Response:**
```json
{
  "success": true,
  "investment_data": {
    "user_id": "uuid",
    "total_assets": "50000000",
    "cash": "20000000",
    "stock_value": "30000000",
    "updated_at": "2025-01-15T10:00:00"
  },
  "asset_history": [...]
}
```

