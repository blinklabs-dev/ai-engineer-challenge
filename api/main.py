from fastapi import FastAPI
from pydantic import BaseModel
import os, openai, dotenv
dotenv.load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
class ChatRequest(BaseModel):
    prompt: str
app = FastAPI()
@app.post("/chat")
async def chat(req: ChatRequest):
    rsp = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role":"user","content":req.prompt}],
        temperature=0.7,
    )
    return {"reply": rsp.choices[0].message.content}
