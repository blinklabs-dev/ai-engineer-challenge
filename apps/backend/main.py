import os
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import RAG service
from rag_service import rag_service

app = FastAPI(title="RAG-enabled FastAPI Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")
RAG_ENABLED = True

# Request models
class ChatRequest(BaseModel):
    q: str
    model: str = "gpt-3.5-turbo"
    api_key: str = None

class RAGChatRequest(BaseModel):
    question: str
    api_key: str = None

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📥 {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"✅ {request.method} {request.url.path} - {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ {request.method} {request.url.path} - Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

@app.post("/ask")
async def ask_question(request: ChatRequest):
    """General chat endpoint"""
    try:
        logger.info(f"💬 General chat question: {request.q[:50]}...")
        
        # Use provided API key or default
        api_key = request.api_key or openai.api_key
        if not api_key:
            logger.warning("❌ No OpenAI API key provided")
            return {"error": "OpenAI API key not provided"}
        
        # Create OpenAI client
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": request.q}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        answer = response.choices[0].message.content
        logger.info("✅ General chat response generated")
        
        return {"answer": answer}
        
    except Exception as e:
        logger.error(f"❌ Error in general chat: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": f"Error: {str(e)}"}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file for RAG"""
    try:
        logger.info(f"📄 PDF upload request: {file.filename}")
        logger.info(f"📊 File size: {file.size if hasattr(file, 'size') else 'unknown'}")
        logger.info(f"📋 Content type: {file.content_type}")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            logger.warning(f"❌ Invalid file type: {file.filename}")
            return {"success": False, "error": "Please upload a PDF file"}
        
        # Check if RAG service is available
        if not rag_service:
            logger.error("❌ RAG service not available")
            return {"success": False, "error": "RAG service not available"}
        
        # Process the file
        logger.info("🔄 Processing PDF...")
        result = await rag_service.upload_pdf(file)
        
        logger.info(f"✅ PDF upload result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in upload_pdf endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/rag-chat")
async def rag_chat(request: RAGChatRequest):
    """Chat with uploaded documents using RAG"""
    try:
        logger.info(f"🤖 RAG chat request: {request.question[:50]}...")
        
        # Check if documents are loaded
        if not rag_service or not rag_service.documents:
            logger.warning("❌ No documents loaded")
            return {"error": "No documents uploaded. Please upload a PDF first."}
        
        logger.info(f"📚 Documents available: {len(rag_service.documents)}")
        
        # Process the question
        result = await rag_service.chat_with_documents(request.question, request.api_key)
        
        logger.info("✅ RAG chat response generated")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in rag_chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": f"Error: {str(e)}"}

@app.get("/api/rag-status")
async def rag_status():
    """Get RAG service status"""
    try:
        logger.info("📊 RAG status request")
        
        if not rag_service:
            return {"error": "RAG service not available"}
        
        status = rag_service.get_status()
        logger.info(f"✅ RAG status: {status}")
        return status
        
    except Exception as e:
        logger.error(f"❌ Error getting RAG status: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": f"Error: {str(e)}"}

@app.post("/api/rag-reset")
async def rag_reset():
    """Reset RAG service"""
    try:
        logger.info("🔄 RAG reset request")
        
        if not rag_service:
            return {"error": "RAG service not available"}
        
        result = rag_service.reset()
        logger.info("✅ RAG reset completed")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in rag_reset endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": f"Error: {str(e)}"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        logger.info("🏥 Health check request")
        
        health_data = {
            "status": "healthy",
            "rag_enabled": RAG_ENABLED,
            "rag_ready": False,
            "documents_loaded": 0,
            "aimakerspace_available": False,
            "message": "Backend is running"
        }
        
        if rag_service:
            status = rag_service.get_status()
            health_data.update({
                "rag_ready": status.get("initialized", False),
                "documents_loaded": status.get("documents_count", 0),
                "aimakerspace_available": status.get("aimakerspace_available", False)
            })
        
        logger.info(f"✅ Health check: {health_data}")
        return health_data
        
    except Exception as e:
        logger.error(f"❌ Error in health check: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    """Root endpoint with API documentation"""
    try:
        logger.info("📖 Root endpoint accessed")
        
        return {
            "message": "RAG-enabled FastAPI backend",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "general_chat": {
                    "path": "/ask",
                    "method": "POST",
                    "description": "General AI chat"
                },
                "rag_upload": {
                    "path": "/api/upload-pdf",
                    "method": "POST", 
                    "description": "Upload PDF for RAG"
                },
                "rag_chat": {
                    "path": "/api/rag-chat",
                    "method": "POST",
                    "description": "Chat with uploaded documents"
                },
                "rag_status": {
                    "path": "/api/rag-status",
                    "method": "GET",
                    "description": "Get RAG service status"
                },
                "rag_reset": {
                    "path": "/api/rag-reset",
                    "method": "POST",
                    "description": "Reset RAG service"
                },
                "health": {
                    "path": "/health",
                    "method": "GET",
                    "description": "Health check"
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error in root endpoint: {str(e)}")
        return {"error": f"Error: {str(e)}"}

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"🚨 Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"🚨 HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")