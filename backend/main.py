from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from python_modules.LoadingStocks import get_sp500_tickers, collect_stock_data, get_stock_data
from typing import List

app = FastAPI(title="Stock Analysis API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Stock Analysis API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/tickers")
async def get_tickers():
    """S&P 500 티커 목록 조회"""
    try:
        tickers = get_sp500_tickers()
        return {"tickers": tickers[:10]}  # 테스트용 10개만
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/collect-data")
async def collect_data(symbols: List[str] = None, days: int = 365):
    """주식 데이터 수집"""
    try:
        if symbols is None:
            symbols = get_sp500_tickers()[:3]  # 테스트용 3개만
        
        collect_stock_data(symbols, days)
        return {"message": f"데이터 수집 완료: {len(symbols)}개 종목"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stock/{symbol}")
async def get_stock(symbol: str, limit: int = 100):
    """특정 종목 데이터 조회"""
    try:
        data = get_stock_data(symbol, limit)
        return {"symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 