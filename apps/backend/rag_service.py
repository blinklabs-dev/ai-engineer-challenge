import os
import sys
import logging
from typing import List, Dict, Any
import tempfile
from pathlib import Path
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add aimakerspace to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'aimakerspace'))

# Try to import aimakerspace modules
try:
    from aimakerspace.text_utils import PDFFileLoader, CharacterTextSplitter
    from aimakerspace.vectordatabase import VectorDatabase
    from aimakerspace.openai_utils.embedding import EmbeddingModel
    from aimakerspace.openai_utils.chatmodel import ChatOpenAI
    AIMAKERSPACE_AVAILABLE = True
    logger.info("✅ aimakerspace modules imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ aimakerspace not available: {e}")
    AIMAKERSPACE_AVAILABLE = False

# Fallback imports
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
    logger.info("✅ OpenAI library available")
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("⚠️ OpenAI library not available")

class RAGService:
    def __init__(self):
        self.documents = []
        self.chunks = []
        self.vector_db = None
        self.embedding_model = None
        self.chat_model = None
        self.openai_client = None
        self.documents_loaded = 0
        self.chunks_available = 0
        
        # Initialize components
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize RAG components"""
        try:
            # Initialize OpenAI client
            if OPENAI_AVAILABLE:
                self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                logger.info("✅ OpenAI client initialized")
            
            # Initialize aimakerspace components if available
            if AIMAKERSPACE_AVAILABLE:
                try:
                    self.embedding_model = EmbeddingModel()
                    self.chat_model = ChatOpenAI()
                    self.vector_db = VectorDatabase()
                    logger.info("✅ aimakerspace components initialized")
                except Exception as e:
                    logger.warning(f"⚠️ aimakerspace component initialization failed: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Component initialization error: {e}")
    
    def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF file and extract text"""
        try:
            logger.info(f"📖 Processing PDF: {file_path}")
            
            # Check if file exists
            if not os.path.exists(file_path):
                logger.error(f"❌ File not found: {file_path}")
                return {"success": False, "error": "File not found"}
            
            # Try aimakerspace first
            if AIMAKERSPACE_AVAILABLE:
                try:
                    logger.info("🔄 Using aimakerspace PDFFileLoader")
                    pdf_loader = PDFFileLoader()
                    
                    # Load PDF
                    documents = pdf_loader.load_file(file_path)
                    logger.info(f"📄 PDFFileLoader result: {type(documents)}")
                    
                    if documents:
                        # Process documents
                        text_splitter = CharacterTextSplitter()
                        all_chunks = []
                        
                        for doc in documents:
                            if isinstance(doc, str):
                                chunks = text_splitter.split_text(doc)
                                all_chunks.extend(chunks)
                            elif hasattr(doc, 'page_content'):
                                chunks = text_splitter.split_text(doc.page_content)
                                all_chunks.extend(chunks)
                        
                        if all_chunks:
                            # Clean and filter chunks
                            cleaned_chunks = self._clean_chunks(all_chunks)
                            self.chunks = cleaned_chunks
                            self.documents_loaded = 1
                            self.chunks_available = len(cleaned_chunks)
                            
                            logger.info(f"✅ PDF processed successfully: {len(cleaned_chunks)} chunks created")
                            return {
                                "success": True,
                                "chunks": len(cleaned_chunks),
                                "message": f"PDF processed successfully with {len(cleaned_chunks)} chunks"
                            }
                    
                except Exception as e:
                    logger.warning(f"⚠️ aimakerspace processing failed: {e}")
            
            # Fallback to PyPDF2
            try:
                logger.info("🔄 Using PyPDF2 fallback")
                import PyPDF2
                
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    text = ""
                    
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text += page.extract_text() + "\n"
                    
                    if text.strip():
                        # Simple text chunking
                        chunks = self._simple_chunk_text(text)
                        cleaned_chunks = self._clean_chunks(chunks)
                        self.chunks = cleaned_chunks
                        self.documents_loaded = 1
                        self.chunks_available = len(cleaned_chunks)
                        
                        logger.info(f"✅ PDF processed with PyPDF2: {len(cleaned_chunks)} chunks created")
                        return {
                            "success": True,
                            "chunks": len(cleaned_chunks),
                            "message": f"PDF processed successfully with {len(cleaned_chunks)} chunks"
                        }
                    else:
                        logger.error("❌ No text extracted from PDF")
                        return {"success": False, "error": "No text could be extracted from PDF"}
                        
            except ImportError:
                logger.error("❌ PyPDF2 not available")
                return {"success": False, "error": "PDF processing libraries not available"}
            except Exception as e:
                logger.error(f"❌ PyPDF2 processing failed: {e}")
                return {"success": False, "error": f"PDF processing failed: {str(e)}"}
                
        except Exception as e:
            logger.error(f"❌ PDF processing error: {e}")
            return {"success": False, "error": str(e)}
    
    def _clean_chunks(self, chunks: List[str]) -> List[str]:
        """Clean and filter chunks to remove noise"""
        cleaned = []
        for chunk in chunks:
            # Remove very short chunks
            if len(chunk.strip()) < 50:
                continue
            
            # Remove chunks that are mostly metadata/headers
            if self._is_metadata_chunk(chunk):
                continue
            
            cleaned.append(chunk.strip())
        
        return cleaned
    
    def _is_metadata_chunk(self, chunk: str) -> bool:
        """Check if chunk is mostly metadata/headers"""
        # Count email addresses, URLs, and other metadata indicators
        email_count = len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', chunk))
        url_count = len(re.findall(r'http[s]?://[^\s]+', chunk))
        
        # If chunk has many emails/URLs relative to content, it's likely metadata
        words = chunk.split()
        if len(words) > 0:
            metadata_ratio = (email_count + url_count) / len(words)
            if metadata_ratio > 0.1:  # More than 10% metadata
                return True
        
        return False
    
    def _simple_chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        """Simple text chunking"""
        chunks = []
        words = text.split()
        current_chunk = []
        current_length = 0
        
        for word in words:
            if current_length + len(word) + 1 > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = [word]
                current_length = len(word)
            else:
                current_chunk.append(word)
                current_length += len(word) + 1
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks
    
    def query_documents(self, question: str) -> str:
        """Query processed documents - Generate well-crafted responses"""
        try:
            logger.info(f"🔍 Querying documents: {question[:50]}...")
            
            if not self.chunks:
                logger.warning("⚠️ No chunks available for querying")
                return "No documents have been uploaded to the knowledge base. Please upload a PDF document first."
            
            # ULTRA-STRICT: Check if question is even relevant to document type
            if not self._is_question_relevant_to_document(question):
                logger.info("❌ Question appears unrelated to document content")
                return "This question doesn't seem to be related to the uploaded document. Please ask questions about the specific content of the document you uploaded."
            
            # Find relevant chunks with ULTRA-STRICT matching
            relevant_chunks = self._find_ultra_relevant_chunks(question)
            logger.info(f"📊 Found {len(relevant_chunks)} ultra-relevant chunks")
            
            if not relevant_chunks:
                logger.info("❌ No ultra-relevant chunks found")
                return "I couldn't find information in the uploaded document that directly addresses your question. Please make sure your question is about the specific content of the document you uploaded."
            
            # IMPROVED: Better chunk processing and context creation
            processed_context = self._create_coherent_context(relevant_chunks, question)
            logger.info(f"📄 Processed context length: {len(processed_context)} characters")
            
            # Generate response using OpenAI with IMPROVED prompts
            if self.openai_client:
                try:
                    # IMPROVED: Better system prompt for well-crafted responses
                    system_prompt = """You are a helpful document assistant. Your job is to provide clear, well-written answers based ONLY on the provided document content.

INSTRUCTIONS:
1. Write a complete, coherent response using only information from the document
2. If the document directly answers the question, provide a clear, well-structured answer
3. If the document only partially addresses the question, explain what information is available
4. If the document doesn't contain relevant information, say so clearly
5. Write in a natural, helpful tone - don't just copy text fragments
6. Structure your response clearly with proper sentences and paragraphs
7. NEVER add information that's not in the document"""

                    user_prompt = f"""Document Content:
{processed_context}

Question: {question}

Please provide a clear, well-written answer based on the document content above. If the document doesn't contain enough information to fully answer the question, explain what information is available and what is missing."""

                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        max_tokens=400,  # Increased for better responses
                        temperature=0.1  # Low temperature for factual responses
                    )
                    
                    answer = response.choices[0].message.content
                    logger.info(f"✅ OpenAI response generated: {len(answer)} chars")
                    
                    # Quality check: ensure response is coherent
                    if self._is_response_low_quality(answer):
                        logger.warning("⚠️ Generated response seems low quality, providing fallback")
                        return self._create_fallback_response(processed_context, question)
                    
                    return answer
                    
                except Exception as e:
                    logger.error(f"❌ OpenAI API error: {e}")
                    return self._create_fallback_response(processed_context, question)
            
            # Fallback response if OpenAI not available
            logger.info("📋 Using fallback response (no OpenAI)")
            return self._create_fallback_response(processed_context, question)
            
        except Exception as e:
            logger.error(f"❌ Document query error: {e}")
            return f"Sorry, I encountered an error while searching the document: {str(e)}"
    
    def _create_coherent_context(self, chunks: List[str], question: str) -> str:
        """Create coherent context from relevant chunks"""
        # Sort chunks by relevance to question
        scored_chunks = []
        question_lower = question.lower()
        
        for chunk in chunks:
            # Calculate relevance score for ordering
            relevance_score = 0
            for word in question_lower.split():
                if len(word) > 2 and word in chunk.lower():
                    relevance_score += chunk.lower().count(word)
            
            scored_chunks.append((chunk, relevance_score))
        
        # Sort by relevance score
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        
        # Take the most relevant chunks and clean them
        context_parts = []
        for chunk, score in scored_chunks[:3]:  # Top 3 chunks
            # Clean the chunk
            cleaned = self._clean_chunk_for_context(chunk)
            if cleaned and len(cleaned) > 50:  # Only use substantial chunks
                context_parts.append(cleaned)
        
        return "\n\n".join(context_parts)
    
    def _clean_chunk_for_context(self, chunk: str) -> str:
        """Clean chunk text for better context"""
        # Remove excessive whitespace
        cleaned = " ".join(chunk.split())
        
        # Remove fragments that are clearly incomplete sentences at the start
        sentences = cleaned.split('. ')
        if len(sentences) > 1:
            # If first sentence seems incomplete (starts with lowercase or has no subject), remove it
            first_sentence = sentences[0].strip()
            if first_sentence and (first_sentence[0].islower() or len(first_sentence) < 10):
                cleaned = '. '.join(sentences[1:])
        
        # Ensure it ends properly
        if cleaned and not cleaned.endswith(('.', '!', '?', ':')):
            # Find the last complete sentence
            last_period = cleaned.rfind('.')
            if last_period > len(cleaned) * 0.7:  # If we find a period in the last 30%
                cleaned = cleaned[:last_period + 1]
        
        return cleaned.strip()
    
    def _is_response_low_quality(self, response: str) -> bool:
        """Check if AI response is low quality"""
        if not response or len(response.strip()) < 20:
            return True
        
        # Check for fragmented responses (lots of [...] or incomplete sentences)
        fragment_indicators = ['...', '[', ']', 'et al', 'Fig.', 'Table']
        fragment_count = sum(1 for indicator in fragment_indicators if indicator in response)
        
        if fragment_count > 2:  # Too many academic/fragment indicators
            return True
        
        # Check if response is mostly numbers, citations, or technical jargon without explanation
        words = response.split()
        if len(words) > 0:
            # Count words that are likely citations, numbers, or technical terms without context
            technical_count = sum(1 for word in words if 
                                word.startswith('[') or 
                                word.isdigit() or 
                                word.count('@') > 0 or
                                len(word) > 15)  # Very long technical terms
            
            if technical_count / len(words) > 0.3:  # More than 30% technical without context
                return True
        
        return False
    
    def _create_fallback_response(self, context: str, question: str) -> str:
        """Create a fallback response when AI fails"""
        if not context:
            return "I found some relevant sections in the document, but couldn't extract clear information to answer your question."
        
        # Try to find the most relevant sentence or paragraph
        sentences = context.split('.')
        question_words = set(question.lower().split())
        
        best_sentence = ""
        best_score = 0
        
        for sentence in sentences:
            if len(sentence.strip()) > 30:  # Substantial sentence
                sentence_words = set(sentence.lower().split())
                overlap = len(question_words.intersection(sentence_words))
                if overlap > best_score:
                    best_score = overlap
                    best_sentence = sentence.strip()
        
        if best_sentence:
            return f"Based on the document, here's what I found relevant to your question:\n\n{best_sentence}."
        else:
            return "I found relevant sections in the document, but the information is too fragmented to provide a clear answer. Please try asking a more specific question."
    
    def _is_question_relevant_to_document(self, question: str) -> bool:
        """Check if question could possibly be relevant to document content"""
        # Common customer support terms that likely aren't in research papers
        support_terms = {
            'subscription', 'cancel', 'billing', 'payment', 'account', 'login', 
            'password', 'reset', 'support', 'help', 'contact', 'refund',
            'business hours', 'phone', 'email', 'customer service'
        }
        
        question_lower = question.lower()
        question_words = set(question_lower.split())
        
        # If question contains support terms, check if document likely contains them
        support_words_in_question = question_words.intersection(support_terms)
        
        if support_words_in_question:
            # Check if document contains any support-related content
            document_text = " ".join(self.chunks[:5]).lower()  # Check first 5 chunks
            document_words = set(document_text.split())
            
            # If question has support terms but document doesn't, likely irrelevant
            if not document_words.intersection(support_terms):
                logger.info(f"❌ Question contains support terms {support_words_in_question} but document doesn't seem to contain support content")
                return False
        
        return True
    
    def _find_ultra_relevant_chunks(self, question: str) -> List[str]:
        """Find chunks with ULTRA-STRICT but SMART relevance matching"""
        question_lower = question.lower()
        question_words = set(question_lower.split())
        
        # Remove common words that cause false matches
        stop_words = {'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'of', 'for', 'in', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'around', 'over', 'under', 'against', 'within', 'without', 'upon', 'beneath', 'beside', 'beyond', 'across', 'along', 'toward', 'towards', 'since', 'until', 'except', 'despite', 'although', 'though', 'unless', 'because', 'if', 'when', 'where', 'while', 'how', 'who', 'whom', 'whose', 'why', 'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'ought', 'do', 'does', 'did', 'have', 'has', 'had', 'be', 'been', 'being', 'am', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'}
        
        # Key terms that must match (not just any word)
        key_terms = question_words - stop_words
        
        if not key_terms:
            logger.warning("⚠️ No key terms found in question")
            return []
        
        logger.info(f"🔍 Looking for key terms: {key_terms}")
        
        chunk_scores = []
        
        for chunk in self.chunks:
            chunk_lower = chunk.lower()
            chunk_words = set(chunk_lower.split())
            
            # Calculate different types of matches
            exact_phrase_score = 0
            key_term_matches = 0
            semantic_matches = 0
            matched_terms = set()
            
            # 1. Check for exact phrase match
            if question_lower in chunk_lower:
                exact_phrase_score = 10
                logger.info(f"🎯 Found exact phrase match: '{question_lower}'")
            
            # 2. Check for key term matches
            for key_term in key_terms:
                if len(key_term) >= 2:  # Lowered from 3 to catch important terms
                    if key_term in chunk_lower:
                        key_term_matches += 1
                        matched_terms.add(key_term)
            
            # 3. Check for semantic/conceptual matches (related terms)
            semantic_score = self._calculate_semantic_score(question_lower, chunk_lower, key_terms)
            if semantic_score > 0:
                semantic_matches = semantic_score
                logger.info(f"🧠 Found semantic matches: {semantic_score}")
            
            # Calculate total score
            total_score = exact_phrase_score + (key_term_matches * 2) + semantic_matches
            
            # SMART THRESHOLD: Different criteria for different types of questions
            threshold_met = False
            
            if exact_phrase_score > 0:  # Exact phrase match - always good
                threshold_met = True
            elif key_term_matches >= 1 and semantic_matches >= 2:  # Key term + semantic context
                threshold_met = True
            elif key_term_matches >= 2:  # Multiple key terms
                threshold_met = True
            elif semantic_matches >= 3:  # Strong semantic match even without exact terms
                threshold_met = True
            
            if threshold_met:
                chunk_scores.append((chunk, total_score, matched_terms))
                logger.info(f"📊 Chunk scored {total_score} (exact: {exact_phrase_score}, terms: {key_term_matches}, semantic: {semantic_matches}) for terms: {matched_terms}")
        
        # Sort by total score
        chunk_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top scoring chunks
        top_chunks = [chunk for chunk, score, terms in chunk_scores[:3] if score >= 2]
        
        logger.info(f"📋 Returning {len(top_chunks)} relevant chunks with smart scoring")
        return top_chunks
    
    def _calculate_semantic_score(self, question: str, chunk: str, key_terms: set) -> int:
        """Calculate semantic similarity score for better matching"""
        semantic_score = 0
        
        # Define semantic relationships for common concepts
        semantic_mappings = {
            'transformer': ['attention', 'encoder', 'decoder', 'self-attention', 'multi-head', 'neural', 'model', 'architecture'],
            'attention': ['transformer', 'mechanism', 'query', 'key', 'value', 'self-attention', 'multi-head'],
            'model': ['architecture', 'neural', 'network', 'transformer', 'encoder', 'decoder'],
            'machine': ['learning', 'neural', 'model', 'training', 'algorithm'],
            'learning': ['machine', 'training', 'model', 'neural', 'optimization'],
            'neural': ['network', 'model', 'learning', 'transformer', 'attention'],
            'subscription': ['cancel', 'billing', 'payment', 'account', 'plan'],
            'cancel': ['subscription', 'account', 'billing', 'terminate'],
            'payment': ['billing', 'subscription', 'card', 'method', 'charge'],
            'support': ['help', 'contact', 'customer', 'service', 'assistance'],
            'refund': ['return', 'money', 'payment', 'billing', 'cancel']
        }
        
        # Check if any key terms have semantic matches in the chunk
        for key_term in key_terms:
            if key_term in semantic_mappings:
                related_terms = semantic_mappings[key_term]
                for related_term in related_terms:
                    if related_term in chunk:
                        semantic_score += 1
                        logger.info(f"🔗 Semantic match: '{key_term}' -> '{related_term}'")
        
        return semantic_score
    
    def _is_answer_generic_or_unrelated(self, answer: str, question: str) -> bool:
        """Check if AI answer seems generic or unrelated to the question"""
        answer_lower = answer.lower()
        question_lower = question.lower()
        
        # Check if answer contains generic "I don't have" phrases
        generic_phrases = [
            "i don't have", "i don't know", "not available", "not provided",
            "doesn't contain", "cannot find", "unable to find"
        ]
        
        for phrase in generic_phrases:
            if phrase in answer_lower:
                return False  # These are good responses, not generic
        
        # Check if answer seems to be about a completely different topic
        # Extract key nouns from question and answer
        question_words = set(question_lower.split())
        answer_words = set(answer_lower.split())
        
        # Common words that might indicate mismatch
        support_words = {'subscription', 'cancel', 'billing', 'payment', 'account', 'login', 'password'}
        tech_words = {'attention', 'neural', 'transformer', 'model', 'paper', 'research', 'google', 'brain'}
        
        question_has_support = bool(question_words.intersection(support_words))
        answer_has_tech = bool(answer_words.intersection(tech_words))
        
        # If question is about support but answer is about technical research, it's likely wrong
        if question_has_support and answer_has_tech:
            logger.info("❌ Answer seems to be about technical research when question is about support")
            return True
        
        return False
    
    def general_chat(self, message: str) -> str:
        """General chat functionality"""
        try:
            logger.info(f"💬 General chat: {message[:50]}...")
            
            if self.openai_client:
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "user", "content": message}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                
                answer = response.choices[0].message.content
                logger.info(f"✅ General chat response: {len(answer)} chars")
                return answer
            else:
                return "Sorry, the chat service is not available right now."
                
        except Exception as e:
            logger.error(f"❌ General chat error: {e}")
            return f"Sorry, I encountered an error: {str(e)}"
    
    def get_status(self) -> Dict[str, Any]:
        """Get current system status"""
        return {
            "ready": len(self.chunks) > 0,
            "documents_loaded": self.documents_loaded,
            "chunks_available": self.chunks_available,
            "api_key_set": bool(os.getenv("OPENAI_API_KEY")),
            "aimakerspace_available": AIMAKERSPACE_AVAILABLE,
            "openai_available": OPENAI_AVAILABLE
        }
    
    def reset(self) -> Dict[str, Any]:
        """Reset the system"""
        try:
            logger.info("🔄 Resetting RAG system...")
            self.documents = []
            self.chunks = []
            self.documents_loaded = 0
            self.chunks_available = 0
            
            # Reinitialize components
            self._initialize_components()
            
            logger.info("✅ RAG system reset successfully")
            return {
                "success": True,
                "message": "RAG system reset successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Reset error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Reset failed: {str(e)}"
            }