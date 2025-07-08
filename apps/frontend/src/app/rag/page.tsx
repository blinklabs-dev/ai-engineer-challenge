"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { FiUpload, FiSend, FiTrash2, FiFileText, FiHeadphones, FiHelpCircle } from "react-icons/fi";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function CustomerSupportAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Customer Support Quick Questions
  const quickQuestions = [
    "What is your return policy?",
    "How do I reset my password?",
    "What are your business hours?",
    "How can I contact support?",
    "What payment methods do you accept?",
    "How do I cancel my subscription?",
    "How do I update my billing information?",
    "What is your refund policy?"
  ]

  // Debug: Log API_BASE on component mount
  console.log('🔧 Customer Support Assistant Component Loaded')
  console.log('🔧 API_BASE:', API_BASE)

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    console.log(`💬 Adding message: ${role} - ${content.substring(0, 50)}...`)
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }])
  }

  const handleFileUpload = async () => {
    console.log('🔍 Starting knowledge base upload...')
    console.log('🔍 File selected:', file)
    console.log('🔍 File name:', file?.name)
    console.log('🔍 File type:', file?.type)
    console.log('🔍 File size:', file?.size)
    
    if (!file) {
      console.log('❌ No file selected')
      return
    }
    
    setIsLoading(true)
    setIsUploading(true)
    setUploadStatus("Uploading knowledge base document...")
    console.log('🔄 Upload started, loading state set to true')
    
    const formData = new FormData()
    formData.append("file", file)
    console.log('📦 FormData created with file')
    
    try {
      console.log('📤 Sending upload request to:', `${API_BASE}/api/upload-pdf`)
      
      const response = await axios.post(`${API_BASE}/api/upload-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      
      console.log('📥 Upload response received')
      console.log('📥 Response status:', response.status)
      console.log('📥 Response data:', response.data)
      
      if (response.data && response.data.success) {
        const successMessage = `✅ Knowledge base updated! Created ${response.data.chunks || 0} searchable sections. Support agents can now query this document.`
        setUploadStatus(successMessage)
        setIsDocumentUploaded(true)
        console.log('✅ Upload successful, isDocumentUploaded set to true')
        
        // Add system message to chat
        addMessage('system', `📚 Knowledge base updated! Document "${file.name}" processed with ${response.data.chunks || 0} sections. You can now ask customer support questions.`)
      } else {
        const errorMessage = response.data?.error || 'Unknown upload error'
        setUploadStatus(`❌ Upload failed: ${errorMessage}`)
        setIsDocumentUploaded(false)
        console.log('❌ Upload failed:', errorMessage)
      }
      
    } catch (error) {
      console.error('❌ Upload request failed:', error)
      setUploadStatus("❌ Error uploading knowledge base document. Please try again.")
      setIsDocumentUploaded(false)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
      console.log('🔄 Upload finished, loading state set to false')
    }
  }

  const handleSupportQuery = async (queryText?: string) => {
    const supportQuestion = queryText || question
    console.log('🎧 Processing support query:', supportQuestion)
    console.log('🎧 Question length:', supportQuestion.length)
    console.log('🎧 Is document uploaded:', isDocumentUploaded)
    
    if (!supportQuestion.trim()) {
      console.log('❌ Empty support question')
      return
    }
    
    setIsLoading(true)
    addMessage('user', supportQuestion)
    
    // Clear input only if not from quick question
    if (!queryText) {
      setQuestion("")
    }
    
    try {
      console.log('📤 Sending support query to:', `${API_BASE}/api/rag-chat`)
      console.log('📤 Request payload:', { question: supportQuestion })
      
      const response = await axios.post(`${API_BASE}/api/rag-chat`, {
        question: supportQuestion,
      })
      
      console.log('📥 Support query response received')
      console.log('📥 Response data:', response.data)
      
      if (response.data && response.data.success && response.data.answer) {
        addMessage('assistant', response.data.answer)
        console.log('✅ Support query successful')
      } else if (response.data && response.data.error) {
        addMessage('system', `❌ Support System Error: ${response.data.error}`)
        console.log('❌ Support query error:', response.data.error)
      } else {
        addMessage('system', '❌ No response from support system. Please try again.')
        console.log('❌ No answer received from support system')
      }
      
    } catch (error) {
      console.error('❌ Support query failed:', error)
      addMessage('system', "❌ Support system temporarily unavailable. Please try again or contact support directly.")
    } finally {
      setIsLoading(false)
      console.log('🔄 Support query finished, loading state set to false')
    }
  }

  const handleQuickQuestion = (quickQ: string) => {
    console.log('⚡ Quick question selected:', quickQ)
    if (!isDocumentUploaded) {
      console.log('❌ No document uploaded for quick question')
      return
    }
    handleSupportQuery(quickQ)
  }

  const resetKnowledgeBase = async () => {
    console.log('🔄 Resetting knowledge base...')
    
    try {
      const response = await axios.post(`${API_BASE}/api/rag-reset`)
      console.log('📥 Reset response:', response.data)
      
      setFile(null)
      setUploadStatus("")
      setIsDocumentUploaded(false)
      setMessages([])
      setQuestion("")
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log('✅ Knowledge base reset successful')
      
    } catch (error) {
      console.error('❌ Reset error:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    console.log('📁 File selection changed:', selectedFile?.name)
    
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setUploadStatus("")
      setIsDocumentUploaded(false)
      console.log('✅ Valid PDF file selected')
    } else {
      console.log('❌ Invalid file type or no file selected')
      alert("Please select a PDF file")
    }
  }

  // Debug: Log current state
  console.log('🔧 Current component state:')
  console.log('🔧 file:', file?.name || 'null')
  console.log('🔧 question:', question)
  console.log('🔧 isLoading:', isLoading)
  console.log('🔧 isUploading:', isUploading)
  console.log('🔧 uploadStatus:', uploadStatus)
  console.log('🔧 isDocumentUploaded:', isDocumentUploaded)
  console.log('🔧 messages count:', messages.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <FiHeadphones className="text-5xl text-blue-400 mr-3" />
              <h1 className="text-4xl font-bold text-white">
                Customer Support Assistant
              </h1>
            </div>
            <p className="text-blue-200 text-lg">
              Upload knowledge base documents and get instant answers to customer support questions
            </p>
            <div className="text-sm text-blue-300 mt-2">
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
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium shadow-md hover:bg-blue-700 transition-colors">
                Customer Support
              </button>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 border border-white/20">
            <h3 className="text-white font-medium mb-2">Debug Info:</h3>
            <div className="text-sm text-white/80 space-y-1">
              <div>File Selected: {file ? `${file.name} (${file.size} bytes)` : 'None'}</div>
              <div>Upload Status: {uploadStatus || 'None'}</div>
              <div>Document Uploaded: {isDocumentUploaded ? 'Yes' : 'No'}</div>
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              <div>Question Length: {question.length}</div>
              <div>Messages Count: {messages.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Knowledge Base Upload */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-2">📚</span>
                Knowledge Base
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Upload Support Documents:
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:transition-colors"
                  />
                  <p className="text-xs text-blue-300 mt-1">
                    PDF files: FAQs, policies, troubleshooting guides
                  </p>
                </div>

                {file && (
                  <div className="flex items-center space-x-2 p-3 bg-white/20 backdrop-blur-sm rounded-md border border-white/30">
                    <FiFileText className="w-5 h-5 text-blue-300" />
                    <div>
                      <div className="text-sm font-medium text-white">{file.name}</div>
                      <div className="text-xs text-blue-300">{Math.round(file.size / 1024)} KB</div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleFileUpload}
                    disabled={!file || isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                    <FiUpload className="w-4 h-4" />
                    <span>{isUploading ? "Processing..." : "Upload"}</span>
                  </button>

                  {isDocumentUploaded && (
                    <button
                      onClick={resetKnowledgeBase}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {uploadStatus && (
                  <div className={`p-3 rounded-md text-sm font-medium ${
                    uploadStatus.includes("❌") || uploadStatus.includes("Error")
                      ? "bg-red-600/20 text-red-200 border border-red-400/30" 
                      : "bg-green-600/20 text-green-200 border border-green-400/30"
                  }`}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Questions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FiHelpCircle className="w-5 h-5 mr-2 text-yellow-400" />
                Common Questions
              </h2>
              
              <div className="space-y-2">
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={isLoading || !isDocumentUploaded}
                    className="w-full text-left px-3 py-2 text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/30 text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
              
              {!isDocumentUploaded && (
                <div className="mt-4 p-3 bg-yellow-600/20 rounded-md border border-yellow-400/30">
                  <p className="text-sm text-yellow-200">
                    📚 Upload a knowledge base document to enable quick questions
                  </p>
                </div>
              )}
            </div>

            {/* Support Chat */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-2">💬</span>
                Support Chat
              </h2>
              
              {/* Messages */}
              <div className="h-96 overflow-y-auto border border-white/30 rounded-md p-4 mb-4 space-y-3 bg-black/20">
                {messages.length === 0 ? (
                  <div className="text-white/60 text-center py-8">
                    <FiHeadphones className="w-12 h-12 mx-auto mb-4 text-white/30" />
                    <p className="text-sm">Upload a knowledge base document to start providing customer support</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white ml-8' 
                          : message.role === 'assistant'
                          ? 'bg-white/20 text-white mr-8 backdrop-blur-sm'
                          : 'bg-yellow-600/20 text-yellow-200 border border-yellow-400/30'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">
                        {message.role === 'user' ? '👤 Customer' : 
                         message.role === 'assistant' ? '🤖 Support Assistant' : 
                         '🔔 System'}
                      </div>
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSupportQuery()}
                    placeholder="Ask a customer support question..."
                    className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                    disabled={isLoading || !isDocumentUploaded}
                  />
                  <button
                    onClick={() => handleSupportQuery()}
                    disabled={isLoading || !question.trim() || !isDocumentUploaded}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors text-sm"
                  >
                    <FiSend className="w-4 h-4" />
                    <span>{isLoading ? "..." : "Ask"}</span>
                  </button>
                </div>
                
                {/* Button state debug */}
                <div className="text-xs text-blue-300">
                  Input enabled: {(isDocumentUploaded && !isLoading) ? 'Yes' : 'No'} 
                  (uploaded: {isDocumentUploaded ? 'true' : 'false'}, loading: {isLoading ? 'true' : 'false'})
                </div>
              </div>

              {isLoading && (
                <div className="mt-4 p-3 bg-blue-600/20 rounded-md border border-blue-400/30">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-blue-200 text-sm">Searching knowledge base...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}