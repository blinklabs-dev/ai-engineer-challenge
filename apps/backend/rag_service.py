# apps/backend/rag_service.py - Fixed with correct method name
import os
import tempfile
from typing import Dict, Any
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Try to import aimakerspace components
try:
    from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
    from aimakerspace.vectordatabase import VectorDatabase
    AIMAKERSPACE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: aimakerspace not available: {e}")
    AIMAKERSPACE_AVAILABLE = False

class RAGService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.current_documents = []
        self.is_ready = False
        
        if AIMAKERSPACE_AVAILABLE:
            try:
                self.text_splitter = CharacterTextSplitter()
                self.vector_db = VectorDatabase()
                print("✅ RAG service initialized with aimakerspace")
            except Exception as e:
                print(f"⚠️ RAG service initialized with limited functionality: {e}")
        else:
            print("✅ RAG service initialized (basic version)")
    
    def process_pdf(self, pdf_file_path: str) -> Dict[str, Any]:
        """Process uploaded PDF and prepare for RAG"""
        try:
            if not os.path.exists(pdf_file_path):
                return {"success": False, "error": "PDF file not found"}
            
            if not AIMAKERSPACE_AVAILABLE:
                return {"success": False, "error": "PDF processing not available - aimakerspace library missing"}
            
            # Load PDF using aimakerspace
            pdf_loader = PDFLoader(pdf_file_path)
            documents = pdf_loader.load_documents()
            
            if not documents:
                return {"success": False, "error": "No content found in PDF"}
            
            # Split into chunks using the correct method: split_texts
            chunks = []
            for doc in documents:
                if doc.strip():
                    # Use the correct method name: split_texts
                    doc_chunks = self.text_splitter.split_texts([doc])
                    chunks.extend([chunk for chunk in doc_chunks if chunk.strip()])
            
            if not chunks:
                return {"success": False, "error": "Failed to create chunks from PDF"}
            
            # Store chunks
            self.current_documents = chunks
            self.is_ready = True
            
            return {
                "success": True,
                "message": f"PDF processed successfully! {len(chunks)} chunks created.",
                "chunks": len(chunks)
            }
            
        except Exception as e:
            return {"success": False, "error": f"Error processing PDF: {str(e)}"}
    
    def query(self, question: str, k: int = 3) -> Dict[str, Any]:
        """Query the RAG system with a question"""
        if not self.is_ready:
            return {
                "success": False,
                "error": "No documents loaded. Please upload a PDF first."
            }
        
        if not question.strip():
            return {
                "success": False,
                "error": "Question cannot be empty."
            }
        
        try:
            if not self.api_key:
                return {"success": False, "error": "OpenAI API key not configured"}
            
            # Simple search in chunks (without embeddings for now)
            relevant_chunks = []
            question_lower = question.lower()
            
            for chunk in self.current_documents:
                # Simple keyword matching
                if any(word in chunk.lower() for word in question_lower.split()):
                    relevant_chunks.append(chunk)
                    if len(relevant_chunks) >= k:
                        break
            
            if not relevant_chunks:
                return {
                    "success": False,
                    "error": "No relevant content found for your question."
                }
            
            # Create context from relevant chunks
            context = "\n\n".join(relevant_chunks[:k])
            
            # Use OpenAI to generate response
            client = openai.OpenAI(api_key=self.api_key)
            
            prompt = f"""You are a helpful assistant that answers questions based on the provided context.

Context:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to answer the question, say so clearly."""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            
            answer = response.choices[0].message.content.strip()
            
            return {
                "success": True,
                "answer": answer,
                "sources": len(relevant_chunks),
                "context_used": len(context)
            }
            
        except Exception as e:
            return {"success": False, "error": f"Error querying: {str(e)}"}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current RAG system status"""
        return {
            "ready": self.is_ready,
            "documents_loaded": len(self.current_documents),
            "chunks_available": len(self.current_documents) if self.current_documents else 0,
            "api_key_set": bool(self.api_key),
            "aimakerspace_available": AIMAKERSPACE_AVAILABLE
        }
    
    def reset(self):
        """Reset the RAG system"""
        self.current_documents = []
        self.is_ready = False
        if AIMAKERSPACE_AVAILABLE:
            try:
                self.vector_db = VectorDatabase()
            except:
                pass
        print("RAG system reset")

# Global RAG service instance
rag_service = RAGService()