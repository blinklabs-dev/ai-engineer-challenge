from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
import os

# Load from .env
load_dotenv()
DEFAULT_API_KEY = os.getenv("OPENAI_API_KEY")

# FastAPI setup
app = FastAPI()

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic request model
class QueryRequest(BaseModel):
    q: str
    model: str = "gpt-3.5-turbo"
    api_key: str | None = None  # Optional, override default key

# POST route
@app.post("/ask")
async def ask(request: QueryRequest):
    # Determine which key to use
    api_key = request.api_key or DEFAULT_API_KEY
    if not api_key:
        return {"error": "❌ Missing API key (none in .env or request)"}

    if not request.q.strip():
        return {"error": "❌ Question cannot be empty."}

    if request.model not in ["gpt-3.5-turbo"]:
        return {"error": f"❌ Unsupported model: {request.model}"}

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=request.model,
            messages=[{"role": "user", "content": request.q}],
        )
        answer = response.choices[0].message.content.strip()
        return {"answer": answer}

    except openai.OpenAIError as e:
        return {"error": f"❌ OpenAI API error: {str(e)}"}
    except Exception as e:
        return {"error": f"❌ Server error: {str(e)}"}
