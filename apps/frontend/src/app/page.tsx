// src/app/page.tsx - Original Chat (Simple AI Chat)
'use client'

import { useState } from 'react'
import axios from 'axios'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function OriginalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)

 const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }])
  }

  const sendMessage = async () => {
    if (!question.trim()) return
    
    const userQuestion = question.trim()
    setQuestion('')
    setIsLoading(true)
    
    // Add user message
    addMessage('user', userQuestion)
    
    try {
      const response = await axios.post(`${API_BASE}/ask`, {
        q: userQuestion,
        model: 'gpt-3.5-turbo'
      })
      
      if (response.data.answer) {
        addMessage('assistant', response.data.answer)
      } else {
        addMessage('assistant', `Error: ${response.data.error}`)
      }
      
    } catch (error: any) {
      addMessage('assistant', `Error: ${error.response?.data?.error || 'Failed to get response'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            💬 AI Chat Assistant
          </h1>
          <p className="text-gray-600 text-lg">
            Ask me anything! I use OpenAI's general knowledge to help you.
          </p>
        </div>
        
        {/* Chat Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">General AI Chat</h2>
          
          {/* Messages */}
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-gray-600 text-center py-8">
                <div className="text-4xl mb-2">🤖</div>
                <p className="text-lg font-medium">Start a conversation!</p>
                <p className="text-sm mt-2">Ask me about anything - programming, science, general knowledge, etc.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md max-w-3xl ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-gray-100 text-gray-800 mr-auto'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm mb-1 capitalize ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-600'
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
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !question.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </div>
          
          {/* Info */}
          <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium text-blue-800">💡 About this chat:</p>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• Uses OpenAI's general knowledge (like ChatGPT)</li>
              <li>• Great for programming questions, explanations, general help</li>
              <li>• No document upload needed - just ask questions directly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}