// src/app/rag/page.tsx - RAG Chat (Document-Specific Chat)
'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function RAGChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [hasDocument, setHasDocument] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const uploadPDF = async (file: File) => {
    setIsUploading(true)
    setUploadStatus(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await axios.post(`${API_BASE}/api/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setUploadStatus({
        type: 'success',
        message: response.data.message
      })
      
      setHasDocument(true)
      
      // Add system message to chat
      addMessage('system', `✅ PDF uploaded successfully! ${response.data.chunks} chunks created. You can now ask questions about the document.`)
      
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Upload failed'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      uploadPDF(file)
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Please select a PDF file'
      })
    }
  }

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }])
  }

  const sendMessage = async () => {
    if (!question.trim()) return
    
    if (!hasDocument) {
      addMessage('system', '❌ Please upload a PDF document first!')
      return
    }
    
    const userQuestion = question.trim()
    setQuestion('')
    setIsLoading(true)
    
    // Add user message
    addMessage('user', userQuestion)
    
    try {
      const response = await axios.post(`${API_BASE}/api/rag-chat`, {
        question: userQuestion
      })
      
      if (response.data.success) {
        addMessage('assistant', response.data.answer)
      } else {
        addMessage('system', `❌ Error: ${response.data.error}`)
      }
      
    } catch (error: any) {
      addMessage('system', `❌ Error: ${error.response?.data?.detail || 'Failed to get response'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSystem = async () => {
    try {
      await axios.post(`${API_BASE}/api/rag-reset`)
      setMessages([])
      setUploadStatus(null)
      setHasDocument(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      addMessage('system', '✅ System reset. Please upload a new PDF to start chatting.')
    } catch (error) {
      addMessage('system', '❌ Failed to reset system')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📄 RAG Document Chat
          </h1>
          <p className="text-gray-600 text-lg">
            Upload a PDF document and ask questions about its specific content
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📤 Step 1: Upload Your PDF Document
          </h2>
          
          <div className="flex items-center gap-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
            >
              {isUploading ? 'Uploading...' : 'Choose PDF'}
            </button>
          </div>
          
          {uploadStatus && (
            <div className={`p-3 rounded-md mb-4 ${
              uploadStatus.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {uploadStatus.message}
            </div>
          )}

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><strong>Document Status:</strong> {hasDocument ? '✅ Document loaded' : '❌ No document uploaded'}</p>
          </div>
        </div>
        
        {/* Chat Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              💬 Step 2: Ask Questions About Your Document
            </h2>
            <button
              onClick={resetSystem}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Reset & Upload New PDF
            </button>
          </div>
          
          {/* Messages */}
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-gray-600 text-center py-8">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-lg font-medium">
                  {hasDocument 
                    ? 'Document loaded! Ask questions about its content.' 
                    : 'Upload a PDF document first, then ask questions about it!'
                  }
                </p>
                <p className="text-sm mt-2">
                  {hasDocument 
                    ? 'Example: "What are the main points?" or "Summarize this document"'
                    : 'Examples: research papers, contracts, manuals, reports'
                  }
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md max-w-3xl ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : message.role === 'assistant'
                      ? 'bg-gray-100 text-gray-800 mr-auto'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      {message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️'}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm mb-1 capitalize ${
                        message.role === 'user' ? 'text-blue-100' : 
                        message.role === 'assistant' ? 'text-gray-600' : 'text-yellow-700'
                      }`}>
                        {message.role}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={hasDocument ? "Ask about the document..." : "Upload a PDF first..."}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isLoading || !hasDocument}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !question.trim() || !hasDocument}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          
          {/* Info */}
          <div className="mt-4 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
            <p className="font-medium text-green-800">💡 About RAG Chat:</p>
            <ul className="mt-1 space-y-1 text-green-700">
              <li>• Answers are based ONLY on your uploaded document</li>
              <li>• Perfect for analyzing contracts, research papers, manuals</li>
              <li>• AI finds relevant sections and answers from your content</li>
              <li>• Upload a new PDF anytime to analyze different documents</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}