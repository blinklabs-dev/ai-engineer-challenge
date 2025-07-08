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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch {
      console.error("Reset error");
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              RAG Chat
            </h1>
            <p className="text-gray-600">
              Upload a PDF and ask questions about its content
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-2 flex space-x-2">
              <button 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium"
                onClick={() => window.location.href = '/'}
              >
                General Chat
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md font-medium">
                RAG Chat
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📄 Upload PDF Document
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select PDF file:
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              {file && (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                  <FiFileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiUpload className="w-4 h-4" />
                  <span>{loading ? "Processing..." : "Upload & Process"}</span>
                </button>

                {isUploaded && (
                  <button
                    onClick={resetRAG}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {uploadStatus && (
                <div className={`p-3 rounded-md ${
                  uploadStatus.includes("Error") 
                    ? "bg-red-50 text-red-700" 
                    : "bg-green-50 text-green-700"
                }`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          {isUploaded && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                💬 Ask Questions About Your Document
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your question:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRAGChat()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="What would you like to know about this document?"
                      disabled={loading}
                    />
                    <button
                      onClick={handleRAGChat}
                      disabled={loading || !question.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <FiSend className="w-4 h-4" />
                      <span>{loading ? "Thinking..." : "Ask"}</span>
                    </button>
                  </div>
                </div>

                {/* Answer Display */}
                {answer && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Answer:</h3>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {answer}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-purple-600">Processing your question...</span>
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