from fastapi import APIRouter
import os
import openai

router = APIRouter()

@router.get("/ask")
def ask_question(q: str):
    openai.api_key = os.getenv("OPENAI_API_KEY")

    if not openai.api_key:
        return {"error": "Missing OPENAI_API_KEY"}

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": q}],
        )
        return {"response": response.choices[0].message["content"]}
    except Exception as e:
        return {"error": str(e)}
