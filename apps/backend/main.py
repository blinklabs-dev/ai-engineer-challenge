# apps/backend/main.py - Complete file with your existing code + RAG functionality
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
import os
import tempfile

# Load from .env
load_dotenv()
DEFAULT_API_KEY = os.getenv("OPENAI_API_KEY")

# Import RAG service (create this file next)
try:
    from rag_service import rag_service
    RAG_ENABLED = True
except ImportError:
    RAG_ENABLED = False
    print("Warning: RAG service not available")

# FastAPI setup
app = FastAPI(title="AI Engineer Challenge with RAG", version="1.0.0")

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic request models
class QueryRequest(BaseModel):
    q: str
    model: str = "gpt-3.5-turbo"
    api_key: str | None = None  # Optional, override default key

class RAGQueryRequest(BaseModel):
    question: str
    api_key: str | None = None

# ========== YOUR EXISTING ENDPOINTS ==========

# POST route - Your original functionality
@app.post("/ask")
async def ask(request: QueryRequest):
    """Your original chat endpoint - unchanged"""
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

# ========== NEW RAG ENDPOINTS ==========

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process PDF for RAG"""
    if not RAG_ENABLED:
        raise HTTPException(status_code=503, detail="RAG service not available")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Process PDF using RAG service
        result = rag_service.process_pdf(tmp_file_path)
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        if result["success"]:
            return {"message": result["message"], "chunks": result["chunks"]}
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag-chat")
async def rag_chat(request: RAGQueryRequest):
    """Chat with uploaded documents using RAG"""
    if not RAG_ENABLED:
        raise HTTPException(status_code=503, detail="RAG service not available")
    
    try:
        # Set API key if provided
        if request.api_key:
            rag_service.api_key = request.api_key
            # Update RAG service API keys
            rag_service.chat_model.api_key = request.api_key
            rag_service.embedding_model.api_key = request.api_key
        
        result = rag_service.query(request.question)
        return result
        
    except Exception as e:
        return {"success": False, "error": f"Server error: {str(e)}"}

@app.get("/api/rag-status")
async def get_rag_status():
    """Get RAG system status"""
    if not RAG_ENABLED:
        return {"ready": False, "error": "RAG service not available"}
    
    return rag_service.get_status()

@app.post("/api/rag-reset")
async def reset_rag():
    """Reset RAG system"""
    if not RAG_ENABLED:
        raise HTTPException(status_code=503, detail="RAG service not available")
    
    rag_service.reset()
    return {"message": "RAG system reset successfully"}

# ========== GENERAL ENDPOINTS ==========

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "rag_enabled": RAG_ENABLED,
        "rag_ready": (rag_service.is_ready if rag_service else False) if RAG_ENABLED else False
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    endpoints = {
        "chat": "/ask",
        "health": "/health"
    }
    
    if RAG_ENABLED:
        endpoints.update({
            "rag_upload": "/api/upload-pdf", 
            "rag_chat": "/api/rag-chat",
            "rag_status": "/api/rag-status",
            "rag_reset": "/api/rag-reset"
        })
    
    return {
        "message": "AI Engineer Challenge API" + (" with RAG" if RAG_ENABLED else ""),
        "version": "1.0.0",
        "endpoints": endpoints
    }