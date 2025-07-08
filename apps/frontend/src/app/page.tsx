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

  useEffect(() => {
    const storedKey = localStorage.getItem("OPENAI_API_KEY");
    if (storedKey) setApiKey(storedKey);
  }, []);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: question,
          model,
          api_key: apiKey || null,
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setAnswer(data.answer);
      } else if (data.error) {
        setAnswer(data.error);
      }
    } catch (error) {
      console.error(error);
      setAnswer("⚠️ Failed to reach backend. Make sure it's running.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveApiKey = () => {
    if (apiKey) {
      localStorage.setItem("OPENAI_API_KEY", apiKey);
      alert("API key saved!");
    }
  };

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
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-2 flex space-x-2">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium shadow-md hover:bg-blue-700 transition-colors">
                General Chat
              </button>
              <button 
                className="px-6 py-3 text-white hover:bg-white/20 rounded-md font-medium transition-colors"
                onClick={() => window.location.href = '/rag'}
              >
                RAG Chat
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-white/20">
            <button
              onClick={() => setShowSettings(!showSettings)}
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
                      onChange={(e) => setApiKey(e.target.value)}
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
                    onChange={(e) => setModel(e.target.value)}
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
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                  className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="What would you like to know?"
                  disabled={loading}
                />
                <button
                  onClick={askQuestion}
                  disabled={loading || !question.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors"
                >
                  <FiSend className="w-4 h-4" />
                  <span>{loading ? "Thinking..." : "Ask"}</span>
                </button>
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