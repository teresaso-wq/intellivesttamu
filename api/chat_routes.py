"""
Intellivest Chatbot API — uses Alpha Vantage for real stock quotes.
Endpoint: POST /api/chat  { "message": "..." }
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter()


# ── Request / Response models ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    symbol: Optional[str] = None
    market_data: Optional[dict[str, Any]] = None
    as_of_utc: str
    disclaimer: str


# ── Symbol extraction (from user message) ────────────────────────────────────

SYMBOL_RE = re.compile(r"(?:\$\s*)?\b([A-Z]{1,5})(?:\b|\.US\b)")

SYMBOL_STOPWORDS = {
    "A", "AN", "AND", "ARE", "AS", "AT", "BE", "BUY", "DO", "DOING",
    "FOR", "FROM", "HAS", "HAVE", "HELP", "HOW", "I", "IN", "IS", "IT",
    "ME", "MY", "OF", "ON", "OR", "SELL", "SO", "THE", "THIS", "TO",
    "TODAY", "UP", "WAS", "WE", "WHAT", "WHEN", "WHERE", "WHY", "WITH",
    "YOU", "YOUR", "AI", "API", "ETF", "IPO", "CEO", "CFO", "USA",
}


def extract_symbol(text: str) -> Optional[str]:
    upper = text.upper()
    matches = list(SYMBOL_RE.finditer(upper))
    if not matches:
        return None
    # Explicit tickers ($AAPL or AAPL.US) win
    for m in matches:
        sym = m.group(1)
        if sym in SYMBOL_STOPWORDS:
            continue
        if "$" in m.group(0) or ".US" in m.group(0):
            return sym
    # First plausible token
    for m in matches:
        sym = m.group(1)
        if sym not in SYMBOL_STOPWORDS:
            return sym
    return None


# ── Alpha Vantage quote fetch ─────────────────────────────────────────────────

async def fetch_quote(symbol: str) -> Optional[dict[str, Any]]:
    key = settings.alphavantage_api_key
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://www.alphavantage.co/query",
                params={"function": "GLOBAL_QUOTE", "symbol": symbol.upper(), "apikey": key},
            )
            data = r.json()

        if "Error Message" in data or "Note" in data:
            return None

        q = data.get("Global Quote", {})
        price = q.get("05. price")
        if not price:
            return None

        return {
            "symbol":            q.get("01. symbol", symbol),
            "price":             price,
            "open":              q.get("02. open"),
            "high":              q.get("03. high"),
            "low":               q.get("04. low"),
            "volume":            q.get("06. volume"),
            "previous_close":    q.get("08. previous close"),
            "change":            q.get("09. change"),
            "change_percent":    q.get("10. change percent"),
            "latest_trading_day": q.get("07. latest trading day"),
        }
    except Exception:
        return None


# ── Reply builder ─────────────────────────────────────────────────────────────

def build_reply(message: str, symbol: Optional[str], md: Optional[dict]) -> str:
    # ── Stock quote response ──
    if symbol and md:
        price        = md.get("price", "N/A")
        change       = md.get("change", "0")
        change_pct   = md.get("change_percent", "0%")
        prev_close   = md.get("previous_close", "N/A")
        volume       = md.get("volume", "N/A")
        high         = md.get("high", "N/A")
        low          = md.get("low", "N/A")
        day          = md.get("latest_trading_day", "today")

        try:
            arrow = "▲" if float(change.replace(",", "")) >= 0 else "▼"
        except Exception:
            arrow = ""

        try:
            vol_fmt = f"{int(float(volume)):,}"
        except Exception:
            vol_fmt = volume

        return (
            f"📊 {symbol} — Live Quote ({day})\n\n"
            f"• Price: ${price}\n"
            f"• Change: {arrow} {change} ({change_pct})\n"
            f"• Day Range: ${low} – ${high}\n"
            f"• Prev Close: ${prev_close}\n"
            f"• Volume: {vol_fmt}\n\n"
            f"Want a buy/hold/sell analysis? Share your time horizon and "
            f"risk tolerance and I'll walk you through a decision framework!"
        )

    if symbol:
        return (
            f"I couldn't pull a live quote for {symbol} right now — "
            "Alpha Vantage may be rate-limited (25 free calls/day). "
            "Try again in a minute or check finance.yahoo.com."
        )

    # ── General financial advice ──
    msg = message.lower()

    if any(w in msg for w in ["budget", "spending", "50/30", "track money"]):
        return (
            "📋 The 50/30/20 Budgeting Rule:\n\n"
            "• 50% → Needs (rent, food, utilities)\n"
            "• 30% → Wants (dining, subscriptions)\n"
            "• 20% → Savings + debt payoff\n\n"
            "Best free apps: Mint, YNAB, EveryDollar.\n"
            "Start with a $1,000 emergency fund goal first!"
        )
    if any(w in msg for w in ["etf", "index fund", "voo", "vti", "qqq"]):
        return (
            "📈 Best Beginner ETFs:\n\n"
            "• VOO — S&P 500, 0.03% fee, very reliable\n"
            "• VTI — Total US market, even more diversified\n"
            "• QQQ — Top 100 tech companies, higher growth\n"
            "• SCHD — Dividend ETF, pays you quarterly\n\n"
            "Recommended split: 60% VOO + 20% VXUS + 20% BND"
        )
    if any(w in msg for w in ["retire", "401k", "roth", "ira", "pension"]):
        return (
            "🏖️ Retirement Priority Order:\n\n"
            "1. 401k up to employer match — FREE money, always do this\n"
            "2. Roth IRA — $7,000/yr limit, tax-free growth\n"
            "3. Max out 401k after Roth\n"
            "4. HSA if on high-deductible health plan\n\n"
            "$200/mo starting at 22 → ~$1M at 65 (7% avg return).\n"
            "Starting 10 years later cuts that roughly in half."
        )
    if any(w in msg for w in ["credit", "score", "fico", "credit card"]):
        return (
            "💳 Credit Score Breakdown:\n\n"
            "• 35% — Payment history (never miss a payment)\n"
            "• 30% — Utilization (keep under 10%)\n"
            "• 15% — Account age (keep old cards open)\n"
            "• 10% — Credit mix\n"
            "• 10% — New credit (limit hard inquiries)\n\n"
            "Check free at: Credit Karma or annualcreditreport.com"
        )
    if any(w in msg for w in ["stock", "buy", "invest", "portfolio", "share"]):
        return (
            "Tell me the stock ticker and I'll pull the live price!\n\n"
            "For example: 'What is AAPL doing today?' or 'Show me NVDA price'\n\n"
            "I use Alpha Vantage to get real-time market data for any stock."
        )

    return (
        "I can help with:\n\n"
        "• 📊 Live stock quotes — just type a ticker like AAPL, NVDA, TSLA\n"
        "• 💰 Budgeting and saving strategies\n"
        "• 📈 ETF and index fund recommendations\n"
        "• 🏖️ Retirement and 401k planning\n"
        "• 💳 Credit score improvement\n\n"
        "What would you like to know?"
    )


# ── Chat endpoint ─────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    symbol = extract_symbol(req.message)
    md = await fetch_quote(symbol) if symbol else None
    reply = build_reply(req.message, symbol, md)

    return ChatResponse(
        reply=reply,
        symbol=symbol,
        market_data=md,
        as_of_utc=datetime.now(timezone.utc).isoformat(),
        disclaimer="Not financial advice. Always verify data and consider consulting a professional.",
    )
