"use client";

import { useState, useEffect } from "react";
import { FiSettings, FiSend, FiCheck, FiCopy } from "react-icons/fi";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Debug: Log API_BASE on component mount
  console.log('🔧 General Chat Component Loaded');
  console.log('🔧 API_BASE:', API_BASE);

  useEffect(() => {
    const storedKey = localStorage.getItem("OPENAI_API_KEY");
    if (storedKey) {
      setApiKey(storedKey);
      console.log('🔑 API key loaded from localStorage');
    } else {
      console.log('🔑 No API key found in localStorage');
    }
  }, []);

  const askQuestion = async () => {
    console.log('💬 Starting general chat...');
    console.log('💬 Question:', question);
    console.log('💬 Model:', model);
    console.log('💬 API Key provided:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
    
    if (!question.trim()) {
      console.log('❌ Empty question, returning early');
      return;
    }
    
    setLoading(true);
    setAnswer("");
    console.log('🔄 General chat started, loading state set to true');

    try {
      console.log('📤 Sending general chat request to:', `${API_BASE}/ask`);
      console.log('📤 Request payload:', {
        q: question,
        model,
        api_key: apiKey || null,
      });

      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: question,
          model,
          api_key: apiKey || null,
        }),
      });

      console.log('📥 General chat response received');
      console.log('📥 Response status:', res.status);
      console.log('📥 Response ok:', res.ok);

      const data = await res.json();
      console.log('📥 Response data:', data);
      console.log('📥 Response answer:', data.answer);
      console.log('📥 Response error:', data.error);

      if (data.answer) {
        setAnswer(data.answer);
        console.log('✅ General chat successful, answer set');
      } else if (data.error) {
        setAnswer(data.error);
        console.log('❌ General chat returned error:', data.error);
      } else {
        setAnswer("No response received");
        console.log('❌ General chat no answer or error');
      }
    } catch (error) {
      console.error('❌ General chat request failed:');
      console.error('❌ Error:', error);
      setAnswer("⚠️ Failed to reach backend. Make sure it's running.");
      console.log('❌ Error message set due to request failure');
    } finally {
      setLoading(false);
      console.log('🔄 General chat finished, loading state set to false');
    }
  };

  const copyToClipboard = () => {
    console.log('📋 Copying answer to clipboard');
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    console.log('✅ Answer copied to clipboard');
  };

  const saveApiKey = () => {
    console.log('💾 Saving API key to localStorage');
    if (apiKey) {
      localStorage.setItem("OPENAI_API_KEY", apiKey);
      alert("API key saved!");
      console.log('✅ API key saved successfully');
    } else {
      console.log('❌ No API key to save');
    }
  };

  // Debug: Log state changes
  console.log('🔧 Current component state:');
  console.log('🔧 question:', question);
  console.log('🔧 answer length:', answer.length);
  console.log('🔧 model:', model);
  console.log('🔧 loading:', loading);
  console.log('🔧 showSettings:', showSettings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              General AI Chat
            </h1>
            <p className="text-blue-200 text-lg">
              Ask me anything! I&apos;m powered by OpenAI&apos;s GPT models.
            </p>
            <div className="text-sm text-blue-300 mt-2">
              API Base: {API_BASE}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-2 flex space-x-2">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium shadow-md hover:bg-blue-700 transition-colors">
                General Chat
              </button>
              <button 
                className="px-6 py-3 text-white hover:bg-white/20 rounded-md font-medium transition-colors"
                onClick={() => {
                  console.log('🔗 Navigating to RAG chat');
                  window.location.href = '/rag';
                }}
              >
                RAG Chat
              </button>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 border border-white/20">
            <h3 className="text-white font-medium mb-2">Debug Info:</h3>
            <div className="text-sm text-white/80 space-y-1">
              <div>API Key: {apiKey ? `Set (${apiKey.length} chars)` : 'Not set'}</div>
              <div>Model: {model}</div>
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Question Length: {question.length}</div>
              <div>Answer Length: {answer.length}</div>
              <div>Settings Shown: {showSettings ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-white/20">
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                console.log('⚙️ Settings panel toggled:', !showSettings);
              }}
              className="flex items-center space-x-2 text-white hover:text-blue-200 transition-colors"
            >
              <FiSettings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
            
            {showSettings && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    OpenAI API Key
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        console.log('🔑 API key updated');
                      }}
                      className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="sk-..."
                    />
                    <button
                      onClick={saveApiKey}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      console.log('🤖 Model changed to:', e.target.value);
                    }}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-white/20">
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Ask me anything:
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
                      console.log('⌨️ Enter key pressed, triggering general chat');
                      askQuestion();
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="What would you like to know?"
                  disabled={loading}
                />
                <button
                  onClick={() => {
                    console.log('🖱️ Ask button clicked');
                    askQuestion();
                  }}
                  disabled={loading || !question.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors"
                >
                  <FiSend className="w-4 h-4" />
                  <span>{loading ? "Thinking..." : "Ask"}</span>
                </button>
              </div>
              
              {/* Button state debug - Fixed ESLint errors */}
              <div className="text-xs text-blue-300 mt-1">
                Button enabled: {(!loading && question.trim()) ? 'Yes' : 'No'} 
                (loading: {loading ? 'true' : 'false'}, question: &ldquo;{question.trim()}&rdquo;)
              </div>
            </div>

            {/* Answer Display */}
            {answer && (
              <div className="mt-6 p-4 bg-black/20 rounded-md border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">Answer:</h3>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1 text-blue-200 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <FiCheck className="w-4 h-4 text-green-400" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                    <span className="text-sm">{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="text-white whitespace-pre-wrap leading-relaxed">
                  {answer}
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 p-4 bg-blue-600/20 rounded-md border border-blue-400/30">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span className="text-blue-200">Processing your question...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}