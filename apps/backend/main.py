from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, validator
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI
import os, re

# ── Env & OpenAI ────────────────────────────────────────────────────────────────
load_dotenv("./.env")
SERVER_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_MODELS = {"gpt-3.5-turbo", "gpt-4o"}

# ── Request schema ─────────────────────────────────────────────────────────────
class AskRequest(BaseModel):
    q: str = Field(..., min_length=3)
    model: str = Field("gpt-3.5-turbo")
    api_key: Optional[str] = None
    temperature: float = Field(0.7, ge=0, le=1)

    @validator("model")
    def model_ok(cls, v):
        if v not in ALLOWED_MODELS:
            raise ValueError(f"Model '{v}' not allowed")
        return v

# ── Safety filter (very light) ─────────────────────────────────────────────────
BAD = re.compile(r"\b(fuck|shit|bitch|asshole)\b", re.I)
def is_clean(text: str) -> bool:
    return not BAD.search(text)

# ── FastAPI setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="AskNerd API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helper: detect summarization w/o paragraph ─────────────────────────────────
def missing_paragraph(prompt: str) -> bool:
    key = prompt.lower()
    return (
        "summary" in key
        and ("paragraph" in key or "summarize" in key)
        and len(prompt.split()) < 25
    )

# ── /api/ask endpoint ──────────────────────────────────────────────────────────
@app.post("/api/ask")
async def ask(req: AskRequest):
    if not is_clean(req.q):
        raise HTTPException(400, "Inappropriate language detected.")

    if missing_paragraph(req.q):
        raise HTTPException(
            400,
            "No paragraph detected. Please include the text you want summarized.",
        )

    key = req.api_key or SERVER_KEY
    if not key:
        raise HTTPException(400, "No API key provided and server default is missing.")

    client = OpenAI(api_key=key)

    try:
        resp = client.chat.completions.create(
            model=req.model,
            temperature=req.temperature,
            messages=[{"role": "user", "content": req.q}],
        )
        return {"answer": resp.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(500, str(e))
