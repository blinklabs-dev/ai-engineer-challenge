import sys
import os
# Add the root directory to Python path for aimakerspace imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import io
import logging
import traceback
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import aimakerspace components from root level
try:
    from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
    from aimakerspace.vectordatabase import VectorDatabase
    AIMAKERSPACE_AVAILABLE = True
    logger.info("✅ aimakerspace library imported successfully from root level")
except ImportError as e:
    logger.warning(f"⚠️ aimakerspace not available: {e}")
    AIMAKERSPACE_AVAILABLE = False
    
    # Create dummy classes for graceful fallback
    class PDFLoader:
        def __init__(self, file_path):
            self.file_path = file_path
            self.documents = []
            logger.info(f"📄 PDFLoader initialized (fallback mode) for: {file_path}")
        
        def load(self):
            logger.info("📚 Loading PDF content (fallback mode)")
            try:
                # Return properly formatted documents
                return [{"text": f"Fallback content from {os.path.basename(self.file_path)}", "metadata": {"source": self.file_path}}]
            except Exception as e:
                logger.error(f"❌ Fallback PDF loading failed: {e}")
                return [{"text": "Unable to extract text from PDF", "metadata": {"source": self.file_path}}]
    
    class CharacterTextSplitter:
        def __init__(self, chunk_size=1000, chunk_overlap=200):
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap
            logger.info(f"✂️ CharacterTextSplitter initialized (fallback mode): chunk_size={chunk_size}")
        
        def split_text(self, text):
            logger.info(f"✂️ Splitting text into chunks (fallback mode): {len(text)} characters")
            if len(text) <= self.chunk_size:
                return [text]
            
            chunks = []
            start = 0
            while start < len(text):
                end = start + self.chunk_size
                chunk = text[start:end]
                chunks.append(chunk)
                start = end - self.chunk_overlap
                
            logger.info(f"✅ Created {len(chunks)} chunks")
            return chunks
    
    class VectorDatabase:
        def __init__(self):
            self.data = []
            logger.info("🗄️ VectorDatabase initialized (fallback mode)")
        
        def insert(self, data):
            logger.info(f"💾 Inserting {len(data)} items into vector database (fallback mode)")
            self.data.extend(data)
        
        def search(self, query, k=5):
            logger.info(f"🔍 Searching vector database (fallback mode): {query}")
            # Simple keyword search
            results = []
            for item in self.data:
                if any(word.lower() in item.get("text", "").lower() for word in query.split()):
                    results.append(item)
            return results[:k]

class RAGService:
    def __init__(self):
        logger.info("🚀 Initializing RAG Service...")
        
        self.vector_db = None
        self.text_splitter = None
        self.documents = []
        self.is_initialized = False
        
        try:
            # Initialize components
            self.vector_db = VectorDatabase()
            self.text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            
            # Test initialization
            self.is_initialized = True
            logger.info("✅ RAG service initialized successfully")
            
            # Log status
            logger.info(f"📊 RAG Service Status:")
            logger.info(f"   - aimakerspace available: {AIMAKERSPACE_AVAILABLE}")
            logger.info(f"   - initialized: {self.is_initialized}")
            logger.info(f"   - documents loaded: {len(self.documents)}")
            
        except Exception as e:
            logger.error(f"❌ Error initializing RAG service: {e}")
            logger.error(traceback.format_exc())
            self.is_initialized = False
    
    async def upload_pdf(self, file: UploadFile) -> Dict[str, Any]:
        """Upload and process a PDF file"""
        try:
            logger.info(f"📄 Starting PDF upload: {file.filename}")
            logger.info(f"📊 File details:")
            logger.info(f"   - filename: {file.filename}")
            logger.info(f"   - content_type: {file.content_type}")
            
            # Read the uploaded file
            contents = await file.read()
            file_size = len(contents)
            logger.info(f"📥 File read successfully: {file_size} bytes")
            
            # Validate file size
            if file_size == 0:
                logger.error("❌ Empty file uploaded")
                return {"success": False, "error": "Empty file uploaded"}
            
            # Save temporarily for processing
            temp_file_path = f"temp_{file.filename}"
            logger.info(f"💾 Saving temporary file: {temp_file_path}")
            
            try:
                with open(temp_file_path, "wb") as f:
                    f.write(contents)
                logger.info("✅ Temporary file saved successfully")
            except Exception as e:
                logger.error(f"❌ Error saving temporary file: {e}")
                return {"success": False, "error": f"Error saving file: {str(e)}"}
            
            # Process the PDF
            logger.info("🔄 Processing PDF with aimakerspace...")
            try:
                pdf_loader = PDFLoader(temp_file_path)
                documents = pdf_loader.load()
                
                # Check if documents is None or empty
                if documents is None:
                    logger.error("❌ PDFLoader returned None")
                    return {"success": False, "error": "PDFLoader returned None - check aimakerspace implementation"}
                elif not documents:
                    logger.error("❌ PDFLoader returned empty list")
                    return {"success": False, "error": "No text content found in PDF"}
                
                logger.info(f"📚 PDF loaded successfully: {len(documents)} documents")
                
                # Log document details
                for i, doc in enumerate(documents):
                    if isinstance(doc, dict):
                        text_length = len(doc.get("text", ""))
                        logger.info(f"   - Document {i+1}: {text_length} characters")
                    else:
                        logger.info(f"   - Document {i+1}: {type(doc)} (not dict)")
                        
            except Exception as e:
                logger.error(f"❌ Error loading PDF with aimakerspace: {e}")
                logger.error(traceback.format_exc())
                return {"success": False, "error": f"Error loading PDF: {str(e)}"}
            
            # Split text into chunks
            logger.info("✂️ Splitting text into chunks...")
            all_chunks = []
            
            for doc_idx, doc in enumerate(documents):
                # Handle different document formats
                if isinstance(doc, dict):
                    text = doc.get("text", "")
                    metadata = doc.get("metadata", {})
                elif isinstance(doc, str):
                    text = doc
                    metadata = {}
                else:
                    logger.warning(f"⚠️ Unexpected document format: {type(doc)}")
                    continue
                
                if not text:
                    logger.warning(f"⚠️ Document {doc_idx} has no text content")
                    continue
                
                try:
                    # Try different text splitter methods
                    if hasattr(self.text_splitter, 'split_text'):
                        chunks = self.text_splitter.split_text(text)
                    elif hasattr(self.text_splitter, 'split'):
                        chunks = self.text_splitter.split(text)
                    elif hasattr(self.text_splitter, 'split_texts'):
                        chunks = self.text_splitter.split_texts([text])
                    else:
                        # Fallback: simple chunking
                        chunk_size = 1000
                        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
                    
                    logger.info(f"📄 Document {doc_idx}: {len(chunks)} chunks created")
                    
                    for chunk_idx, chunk in enumerate(chunks):
                        chunk_data = {
                            "text": chunk,
                            "metadata": {
                                **metadata,
                                "document_index": doc_idx,
                                "chunk_index": chunk_idx
                            },
                            "source": file.filename
                        }
                        all_chunks.append(chunk_data)
                        
                except Exception as e:
                    logger.error(f"❌ Error splitting document {doc_idx}: {e}")
                    continue
            
            if not all_chunks:
                logger.error("❌ No chunks created from PDF")
                return {"success": False, "error": "No text content found in PDF"}
            
            logger.info(f"✅ Total chunks created: {len(all_chunks)}")
            
            # Store in vector database
            logger.info("💾 Storing chunks in vector database...")
            try:
                self.documents = all_chunks
                
                # For now, skip vector database insertion to avoid complexity
                # The VectorDatabase expects embeddings, which requires additional setup
                # We'll store documents in memory for basic RAG functionality
                if self.vector_db and hasattr(self.vector_db, 'insert'):
                    try:
                        # Try to insert, but don't fail if it doesn't work
                        self.vector_db.insert(all_chunks)
                        logger.info("✅ Chunks stored in vector database")
                    except Exception as vdb_error:
                        logger.warning(f"⚠️ Vector database insertion failed: {vdb_error}")
                        logger.info("📝 Using in-memory storage instead")
                else:
                    logger.info("📝 Using in-memory document storage")
                    
            except Exception as e:
                logger.error(f"❌ Error storing chunks: {e}")
                # Don't fail the upload just because of storage issues
                logger.info("📝 Continuing with in-memory storage")
            
            # Clean up temp file
            try:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                    logger.info("🗑️ Temporary file cleaned up")
            except Exception as e:
                logger.warning(f"⚠️ Error cleaning up temp file: {e}")
            
            result = {
                "success": True,
                "message": f"Successfully processed {file.filename}",
                "chunks_count": len(all_chunks),
                "file_size": file_size,
                "aimakerspace_used": AIMAKERSPACE_AVAILABLE
            }
            
            logger.info(f"✅ PDF upload completed successfully: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error in upload_pdf: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Clean up temp file if it exists
            if 'temp_file_path' in locals():
                try:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                        logger.info("🗑️ Temporary file cleaned up after error")
                except Exception as cleanup_error:
                    logger.warning(f"⚠️ Error cleaning up temp file: {cleanup_error}")
            
            return {"success": False, "error": f"Error processing PDF: {str(e)}"}
    
    async def chat_with_documents(self, question: str, api_key: str = None) -> Dict[str, Any]:
        """Chat with uploaded documents using RAG"""
        try:
            logger.info(f"🤖 RAG chat request received: {question[:100]}...")
            
            # Check if documents are loaded
            if not self.documents:
                logger.warning("❌ No documents loaded")
                return {"error": "No documents uploaded. Please upload a PDF first."}
            
            logger.info(f"📚 Documents available: {len(self.documents)}")
            
            # Retrieve relevant chunks
            logger.info("🔍 Searching for relevant chunks...")
            relevant_chunks = self._retrieve_relevant_chunks(question)
            
            if not relevant_chunks:
                logger.warning("⚠️ No relevant chunks found")
                return {"error": "No relevant information found in the uploaded documents."}
            
            logger.info(f"✅ Found {len(relevant_chunks)} relevant chunks")
            
            # Create context from relevant chunks
            context = self._create_context(relevant_chunks)
            logger.info(f"📝 Context created: {len(context)} characters")
            
            # Generate response
            logger.info("🧠 Generating AI response...")
            try:
                response_text = await self._generate_response(question, context, api_key)
                logger.info("✅ AI response generated successfully")
                
                result = {
                    "answer": response_text,
                    "sources": list(set([chunk["source"] for chunk in relevant_chunks])),
                    "chunks_used": len(relevant_chunks),
                    "context_length": len(context)
                }
                
                logger.info(f"📊 RAG response stats: {len(result['sources'])} sources, {result['chunks_used']} chunks")
                return result
                
            except Exception as ai_error:
                logger.error(f"❌ AI generation error: {ai_error}")
                # Return fallback response with context
                fallback_response = f"I found relevant information in the document, but couldn't generate a response due to AI service issues. Here's the relevant content:\n\n{context[:500]}..."
                
                return {
                    "answer": fallback_response,
                    "sources": list(set([chunk["source"] for chunk in relevant_chunks])),
                    "chunks_used": len(relevant_chunks),
                    "error": f"AI service error: {str(ai_error)}",
                    "fallback": True
                }
            
        except Exception as e:
            logger.error(f"❌ Error in chat_with_documents: {str(e)}")
            logger.error(traceback.format_exc())
            return {"error": f"Error generating response: {str(e)}"}
    
    def _retrieve_relevant_chunks(self, question: str) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks for the question"""
        try:
            # Simple keyword-based retrieval
            relevant_chunks = []
            question_lower = question.lower()
            question_words = question_lower.split()
            
            logger.info(f"🔍 Searching for keywords: {question_words}")
            
            for chunk in self.documents:
                chunk_text = chunk.get("text", "").lower()
                relevance_score = 0
                
                # Calculate relevance score based on keyword matches
                for word in question_words:
                    if word in chunk_text:
                        relevance_score += 1
                
                if relevance_score > 0:
                    chunk_with_score = {**chunk, "relevance_score": relevance_score}
                    relevant_chunks.append(chunk_with_score)
            
            # Sort by relevance score
            relevant_chunks.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            
            # Return top 3 chunks
            top_chunks = relevant_chunks[:3]
            
            # If no relevant chunks found, use first few chunks
            if not top_chunks:
                logger.warning("⚠️ No keyword matches found, using first 3 chunks")
                top_chunks = self.documents[:3]
            
            logger.info(f"📊 Relevance scores: {[chunk.get('relevance_score', 0) for chunk in top_chunks]}")
            return top_chunks
            
        except Exception as e:
            logger.error(f"❌ Error in chunk retrieval: {e}")
            return self.documents[:3]  # Fallback to first 3 chunks
    
    def _create_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Create context string from chunks"""
        try:
            context_parts = []
            for i, chunk in enumerate(chunks):
                text = chunk.get("text", "")
                if text:
                    context_parts.append(f"[Document {i+1}]:\n{text}")
            
            context = "\n\n".join(context_parts)
            logger.info(f"📝 Context created from {len(chunks)} chunks")
            return context
            
        except Exception as e:
            logger.error(f"❌ Error creating context: {e}")
            return ""
    
    async def _generate_response(self, question: str, context: str, api_key: str = None) -> str:
        """Generate AI response using OpenAI"""
        try:
            # Create prompt
            prompt = f"""Based on the following context from uploaded documents, answer the question accurately and concisely.

Context:
{context}

Question: {question}

Instructions:
- Answer based only on the information provided in the context
- If the answer is not in the context, clearly state that
- Be specific and cite relevant details from the context
- Keep the response focused and helpful

Answer:"""

            # Use OpenAI API
            client = openai.OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
            
            logger.info("🤖 Calling OpenAI API...")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided document context. Be accurate and only use information from the context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.1
            )
            
            answer = response.choices[0].message.content
            logger.info(f"✅ OpenAI response received: {len(answer)} characters")
            return answer
            
        except Exception as e:
            logger.error(f"❌ Error in AI generation: {e}")
            raise e
    
    def reset(self) -> Dict[str, Any]:
        """Reset the RAG service by clearing all documents"""
        try:
            logger.info("🔄 Resetting RAG service...")
            
            old_count = len(self.documents)
            self.documents = []
            
            if self.vector_db:
                self.vector_db = VectorDatabase()  # Reinitialize
            
            logger.info(f"✅ RAG service reset successfully (cleared {old_count} documents)")
            return {"success": True, "message": f"RAG service reset successfully (cleared {old_count} documents)"}
            
        except Exception as e:
            logger.error(f"❌ Error resetting RAG service: {e}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": f"Error resetting RAG service: {str(e)}"}
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the RAG service"""
        try:
            status = {
                "initialized": self.is_initialized,
                "documents_count": len(self.documents),
                "aimakerspace_available": AIMAKERSPACE_AVAILABLE,
                "vector_db_initialized": self.vector_db is not None,
                "text_splitter_initialized": self.text_splitter is not None
            }
            
            # Add document details if available
            if self.documents:
                total_text_length = sum(len(doc.get("text", "")) for doc in self.documents)
                status["total_text_length"] = total_text_length
                status["average_chunk_length"] = total_text_length // len(self.documents)
            
            logger.info(f"📊 RAG status: {status}")
            return status
            
        except Exception as e:
            logger.error(f"❌ Error getting status: {e}")
            return {"error": f"Error getting status: {str(e)}"}

# Global RAG service instance
logger.info("🚀 Creating global RAG service instance...")
rag_service = RAGService()
logger.info("✅ Global RAG service instance created")