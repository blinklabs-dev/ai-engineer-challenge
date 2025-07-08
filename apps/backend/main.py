from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import tempfile
from typing import List, Optional
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import RAG service
from rag_service import RAGService

app = FastAPI(title="Customer Support RAG API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG service
rag_service = RAGService()

# Pydantic models - FIXED to match frontend exactly
class GeneralChatRequest(BaseModel):
    q: str  # Frontend sends "q" not "message"
    model: Optional[str] = "gpt-3.5-turbo"
    api_key: Optional[str] = None

    class Config:
        # Allow extra fields that we might not use
        extra = "allow"

class RAGChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Customer Support RAG API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "customer-support-rag"}

@app.post("/ask")
async def ask_endpoint(request: GeneralChatRequest):
    """General chat endpoint - FIXED to match frontend format"""
    try:
        logger.info(f"💬 General chat request received")
        logger.info(f"💬 Request data: q='{request.q[:50]}...', model='{request.model}', api_key_provided={bool(request.api_key)}")
        
        if not request.q or not request.q.strip():
            logger.warning("❌ Empty question received")
            return {"error": "Question cannot be empty", "answer": ""}
        
        # Use the provided API key temporarily if given
        original_api_key = os.getenv("OPENAI_API_KEY")
        if request.api_key:
            logger.info("🔑 Using provided API key temporarily")
            os.environ["OPENAI_API_KEY"] = request.api_key
            # Reinitialize the service with new key
            rag_service._initialize_components()
        
        try:
            response = rag_service.general_chat(request.q)
            logger.info(f"✅ General chat response: {len(response)} chars")
            return {"answer": response}
        finally:
            # Restore original API key
            if original_api_key:
                os.environ["OPENAI_API_KEY"] = original_api_key
            elif request.api_key:
                # Remove the temporary key
                if "OPENAI_API_KEY" in os.environ:
                    del os.environ["OPENAI_API_KEY"]
            # Reinitialize with original key
            rag_service._initialize_components()
            
    except Exception as e:
        logger.error(f"❌ General chat error: {str(e)}")
        logger.error(f"❌ Error type: {type(e)}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        return {"error": f"Chat failed: {str(e)}", "answer": ""}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process PDF for RAG"""
    try:
        logger.info(f"📤 PDF upload started: {file.filename}")
        logger.info(f"📋 File size: {file.size} bytes")
        logger.info(f"📋 Content type: {file.content_type}")
        
        # Validate file
        if not file.filename.endswith('.pdf'):
            logger.warning(f"❌ Invalid file type: {file.filename}")
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
            logger.info(f"📁 Temporary file created: {tmp_file_path}")
        
        try:
            # Process PDF
            logger.info("🔄 Starting PDF processing...")
            result = rag_service.process_pdf(tmp_file_path)
            logger.info(f"📊 PDF processing result: {result}")
            
            if result['success']:
                logger.info(f"✅ PDF processed successfully: {result['chunks']} chunks created")
                return {
                    "success": True,
                    "message": f"PDF uploaded and processed successfully! Created {result['chunks']} chunks.",
                    "chunks": result['chunks'],
                    "chunks_count": result['chunks'],  # For backward compatibility
                    "filename": file.filename
                }
            else:
                logger.error(f"❌ PDF processing failed: {result['error']}")
                return {
                    "success": False,
                    "error": result['error'],
                    "message": f"Failed to process PDF: {result['error']}"
                }
                
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                logger.info(f"🗑️ Temporary file cleaned up: {tmp_file_path}")
                
    except Exception as e:
        logger.error(f"❌ PDF upload error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Upload failed: {str(e)}"
        }

@app.post("/api/rag-chat")
async def rag_chat(request: RAGChatRequest):
    """Chat with uploaded documents"""
    try:
        logger.info(f"🤖 RAG chat request: {request.question[:50]}...")
        
        # Check if documents are loaded
        status = rag_service.get_status()
        logger.info(f"📊 RAG status: {status}")
        
        if not status['ready'] or status['chunks_available'] == 0:
            logger.warning("⚠️ No documents loaded for RAG chat")
            return {
                "success": False,
                "error": "No documents loaded. Please upload a PDF first.",
                "answer": "Please upload a PDF document before asking questions."
            }
        
        # Process question
        answer = rag_service.query_documents(request.question)
        logger.info(f"✅ RAG chat response: {len(answer)} chars")
        
        return {
            "success": True,
            "answer": answer,
            "question": request.question
        }
        
    except Exception as e:
        logger.error(f"❌ RAG chat error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "answer": f"Sorry, I encountered an error: {str(e)}"
        }

@app.get("/api/rag-status")
async def get_rag_status():
    """Get current RAG system status"""
    try:
        status = rag_service.get_status()
        logger.info(f"📊 RAG status check: {status}")
        return status
    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}")
        return {
            "ready": False,
            "documents_loaded": 0,
            "chunks_available": 0,
            "api_key_set": bool(os.getenv("OPENAI_API_KEY")),
            "error": str(e)
        }

@app.post("/api/rag-reset")
async def reset_rag():
    """Reset RAG system"""
    try:
        logger.info("🔄 RAG system reset requested")
        result = rag_service.reset()
        logger.info(f"✅ RAG system reset: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Reset error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Reset failed: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)