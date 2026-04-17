from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api import stock_routes, crypto_routes, news_routes, chat_routes

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Stock Market API",
    description="API for fetching stock prices, company info, news, and crypto data",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes must register before mounting "/" so /api/* is not swallowed by StaticFiles
app.include_router(stock_routes.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(crypto_routes.router, prefix="/api/crypto", tags=["crypto"])
app.include_router(news_routes.router, prefix="/api/news", tags=["news"])
app.include_router(chat_routes.router, prefix="/api", tags=["chat"])

# Serve static frontend assets (for both uvicorn and standalone static servers)
if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="frontend",
    )

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the stock tracker SPA (also works when opening frontend/index.html directly)."""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")
    return HTMLResponse("<h1>Frontend missing</h1>", status_code=200)

@app.get("/api")
async def api_index():
    """API metadata endpoint."""
    return {
        "message": "Stock Market API",
        "version": "1.0.0",
        "endpoints": {
            "stocks": "/api/stocks",
            "crypto": "/api/crypto",
            "news": "/api/news"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

