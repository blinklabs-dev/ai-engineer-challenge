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

  const handleFileUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    setUploadStatus("Uploading and processing PDF...");
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API_BASE}/api/upload-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setUploadStatus("PDF uploaded successfully! You can now ask questions about it.");
      setIsUploaded(true);
      console.log("Upload response:", response.data);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error uploading PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRAGChat = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setAnswer("");
    
    try {
      const response = await axios.post(`${API_BASE}/api/rag-chat`, {
        question: question,
      });
      
      setAnswer(response.data.answer);
      setQuestion("");
    } catch (error) {
      console.error("RAG chat error:", error);
      setAnswer("Error processing your question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetRAG = async () => {
    try {
      await axios.post(`${API_BASE}/api/rag-reset`);
      setFile(null);
      setUploadStatus("");
      setIsUploaded(false);
      setAnswer("");
      setQuestion("");
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("");
    } else {
      alert("Please select a PDF file");
    }
  };

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
                  uploadStatus.includes("Error") 
                    ? "bg-red-600/20 text-red-200 border border-red-400/30" 
                    : "bg-green-600/20 text-green-200 border border-green-400/30"
                }`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
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
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRAGChat()}
                      className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      placeholder="What would you like to know about this document?"
                      disabled={loading}
                    />
                    <button
                      onClick={handleRAGChat}
                      disabled={loading || !question.trim()}
                      className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors"
                    >
                      <FiSend className="w-4 h-4" />
                      <span>{loading ? "Thinking..." : "Ask"}</span>
                    </button>
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
        </div>
      </div>
    </div>
  );
}