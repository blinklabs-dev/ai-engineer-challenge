"use client";

import { useState } from "react";
import axios from "axios";
import { FiUpload, FiSend, FiTrash2, FiFileText } from "react-icons/fi";

export default function RAGChat() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploaded, setIsUploaded] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Debug: Log API_BASE on component mount
  console.log('🔧 RAG Chat Component Loaded');
  console.log('🔧 API_BASE:', API_BASE);

  const handleFileUpload = async () => {
    console.log('🔍 Starting file upload...');
    console.log('🔍 File selected:', file);
    console.log('🔍 File name:', file?.name);
    console.log('🔍 File type:', file?.type);
    console.log('🔍 File size:', file?.size);
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    
    setLoading(true);
    setUploadStatus("Uploading and processing PDF...");
    console.log('🔄 Upload started, loading state set to true');
    
    const formData = new FormData();
    formData.append("file", file);
    console.log('📦 FormData created with file');
    
    try {
      console.log('📤 Sending upload request to:', `${API_BASE}/api/upload-pdf`);
      console.log('📤 Request headers: multipart/form-data');
      
      const response = await axios.post(`${API_BASE}/api/upload-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      console.log('📥 Upload response received');
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response success:', response.data?.success);
      console.log('📥 Response error:', response.data?.error);
      console.log('📥 Response message:', response.data?.message);
      console.log('📥 Chunks count:', response.data?.chunks_count);
      
      if (response.data && response.data.success) {
        const successMessage = `PDF uploaded successfully! Created ${response.data.chunks_count || 0} chunks. You can now ask questions about it.`;
        setUploadStatus(successMessage);
        setIsUploaded(true);
        console.log('✅ Upload successful, isUploaded set to true');
        console.log('✅ Success message:', successMessage);
      } else {
        const errorMessage = response.data?.error || 'Unknown upload error';
        setUploadStatus(`Error: ${errorMessage}`);
        setIsUploaded(false);
        console.log('❌ Upload failed:', errorMessage);
        console.log('❌ isUploaded set to false');
      }
      
    } catch (error) {
      console.error('❌ Upload request failed:');
      console.error('❌ Error object:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Axios error response:', error.response?.data);
        console.error('❌ Axios error status:', error.response?.status);
        console.error('❌ Axios error message:', error.message);
      }
      setUploadStatus("Error uploading PDF. Please try again.");
      setIsUploaded(false);
      console.log('❌ isUploaded set to false due to error');
    } finally {
      setLoading(false);
      console.log('🔄 Upload finished, loading state set to false');
    }
  };

  const handleRAGChat = async () => {
    console.log('🤖 Starting RAG chat...');
    console.log('🤖 Question:', question);
    console.log('🤖 Question length:', question.length);
    console.log('🤖 Question trimmed length:', question.trim().length);
    console.log('🤖 Is uploaded:', isUploaded);
    console.log('🤖 Current loading state:', loading);
    
    if (!question.trim()) {
      console.log('❌ Empty question, returning early');
      return;
    }
    
    setLoading(true);
    setAnswer("");
    console.log('🔄 RAG chat started, loading state set to true');
    console.log('🔄 Answer cleared');
    
    try {
      console.log('📤 Sending RAG chat request to:', `${API_BASE}/api/rag-chat`);
      console.log('📤 Request payload:', { question: question });
      
      const response = await axios.post(`${API_BASE}/api/rag-chat`, {
        question: question,
      });
      
      console.log('📥 RAG chat response received');
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response answer:', response.data?.answer);
      console.log('📥 Response error:', response.data?.error);
      console.log('📥 Response sources:', response.data?.sources);
      console.log('📥 Response chunks_used:', response.data?.chunks_used);
      
      if (response.data && response.data.answer) {
        setAnswer(response.data.answer);
        setQuestion("");
        console.log('✅ RAG chat successful');
        console.log('✅ Answer set, question cleared');
      } else if (response.data && response.data.error) {
        const errorMessage = response.data.error;
        setAnswer(`Error: ${errorMessage}`);
        console.log('❌ RAG chat returned error:', errorMessage);
      } else {
        const fallbackError = 'No answer received from server';
        setAnswer(`Error: ${fallbackError}`);
        console.log('❌ RAG chat no answer or error:', fallbackError);
      }
      
    } catch (error) {
      console.error('❌ RAG chat request failed:');
      console.error('❌ Error object:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Axios error response:', error.response?.data);
        console.error('❌ Axios error status:', error.response?.status);
        console.error('❌ Axios error message:', error.message);
      }
      setAnswer("Error processing your question. Please try again.");
      console.log('❌ Error message set due to request failure');
    } finally {
      setLoading(false);
      console.log('🔄 RAG chat finished, loading state set to false');
    }
  };

  const resetRAG = async () => {
    console.log('🔄 Starting RAG reset...');
    
    try {
      console.log('📤 Sending reset request to:', `${API_BASE}/api/rag-reset`);
      
      const response = await axios.post(`${API_BASE}/api/rag-reset`);
      
      console.log('📥 Reset response:', response.data);
      
      setFile(null);
      setUploadStatus("");
      setIsUploaded(false);
      setAnswer("");
      setQuestion("");
      console.log('✅ RAG reset successful, all states cleared');
      
    } catch (error) {
      console.error('❌ Reset error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    console.log('📁 File selection changed');
    console.log('📁 Selected file:', selectedFile);
    console.log('📁 File name:', selectedFile?.name);
    console.log('📁 File type:', selectedFile?.type);
    console.log('📁 File size:', selectedFile?.size);
    
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("");
      setIsUploaded(false);
      console.log('✅ Valid PDF file selected');
      console.log('✅ Upload status cleared, isUploaded set to false');
    } else {
      console.log('❌ Invalid file type or no file selected');
      alert("Please select a PDF file");
    }
  };

  // Debug: Log state changes
  console.log('🔧 Current component state:');
  console.log('🔧 file:', file?.name || 'null');
  console.log('🔧 question:', question);
  console.log('🔧 answer length:', answer.length);
  console.log('🔧 loading:', loading);
  console.log('🔧 uploadStatus:', uploadStatus);
  console.log('🔧 isUploaded:', isUploaded);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              RAG Chat
            </h1>
            <p className="text-purple-200 text-lg">
              Upload a PDF and ask questions about its content
            </p>
            <div className="text-sm text-purple-300 mt-2">
              API Base: {API_BASE}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-2 flex space-x-2">
              <button 
                className="px-6 py-3 text-white hover:bg-white/20 rounded-md font-medium transition-colors"
                onClick={() => window.location.href = '/'}
              >
                General Chat
              </button>
              <button className="px-6 py-3 bg-purple-600 text-white rounded-md font-medium shadow-md hover:bg-purple-700 transition-colors">
                RAG Chat
              </button>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 border border-white/20">
            <h3 className="text-white font-medium mb-2">Debug Info:</h3>
            <div className="text-sm text-white/80 space-y-1">
              <div>File Selected: {file ? `${file.name} (${file.size} bytes)` : 'None'}</div>
              <div>Upload Status: {uploadStatus || 'None'}</div>
              <div>Is Uploaded: {isUploaded ? 'Yes' : 'No'}</div>
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Question Length: {question.length}</div>
              <div>Answer Length: {answer.length}</div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">📄</span>
              Upload PDF Document
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select PDF file:
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:transition-colors"
                />
              </div>

              {file && (
                <div className="flex items-center space-x-2 p-3 bg-white/20 backdrop-blur-sm rounded-md border border-white/30">
                  <FiFileText className="w-5 h-5 text-purple-300" />
                  <span className="text-sm text-white font-medium">{file.name}</span>
                  <span className="text-xs text-purple-200">({file.size} bytes)</span>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <FiUpload className="w-4 h-4" />
                  <span>{loading ? "Processing..." : "Upload & Process"}</span>
                </button>

                {isUploaded && (
                  <button
                    onClick={resetRAG}
                    className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {uploadStatus && (
                <div className={`p-4 rounded-md font-medium ${
                  uploadStatus.includes("Error") || uploadStatus.includes("error")
                    ? "bg-red-600/20 text-red-200 border border-red-400/30" 
                    : "bg-green-600/20 text-green-200 border border-green-400/30"
                }`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface - Always show if document is uploaded */}
          {isUploaded && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-2">💬</span>
                Ask Questions About Your Document
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Your question:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        console.log('📝 Question updated:', e.target.value);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          console.log('⌨️ Enter key pressed, triggering RAG chat');
                          handleRAGChat();
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      placeholder="What would you like to know about this document?"
                      disabled={loading}
                    />
                    <button
                      onClick={() => {
                        console.log('🖱️ Ask button clicked');
                        handleRAGChat();
                      }}
                      disabled={loading || !question.trim()}
                      className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors"
                    >
                      <FiSend className="w-4 h-4" />
                      <span>{loading ? "Thinking..." : "Ask"}</span>
                    </button>
                  </div>
                  
                  {/* Button state debug - Fixed ESLint errors */}
                  <div className="text-xs text-purple-300 mt-1">
                    Button enabled: {(!loading && question.trim()) ? 'Yes' : 'No'} 
                    (loading: {loading ? 'true' : 'false'}, question: &ldquo;{question.trim()}&rdquo;)
                  </div>
                </div>

                {/* Answer Display */}
                {answer && (
                  <div className="mt-6 p-4 bg-black/20 rounded-md border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">Answer:</h3>
                    <div className="text-white whitespace-pre-wrap leading-relaxed">
                      {answer}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="mt-6 p-4 bg-purple-600/20 rounded-md border border-purple-400/30">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                      <span className="text-purple-200">Processing your question...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show message if not uploaded */}
          {!isUploaded && !loading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
              <div className="text-center text-white/80">
                <p>Upload a PDF document above to start asking questions about it.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}