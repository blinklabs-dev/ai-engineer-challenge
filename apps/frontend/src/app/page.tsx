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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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
      setAnswer("⚠️ Failed to reach backend. Make sure it's running on localhost:8000");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              General AI Chat
            </h1>
            <p className="text-gray-600">
              Ask me anything! I&apos;m powered by OpenAI&apos;s GPT models.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-2 flex space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium">
                General Chat
              </button>
              <button 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium"
                onClick={() => window.location.href = '/rag'}
              >
                RAG Chat
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <FiSettings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            
            {showSettings && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-..."
                    />
                    <button
                      onClick={saveApiKey}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ask me anything:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What would you like to know?"
                  disabled={loading}
                />
                <button
                  onClick={askQuestion}
                  disabled={loading || !question.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FiSend className="w-4 h-4" />
                  <span>{loading ? "Thinking..." : "Ask"}</span>
                </button>
              </div>
            </div>

            {/* Answer Display */}
            {answer && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Answer:</h3>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                  >
                    {copied ? (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                    <span className="text-sm">{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {answer}
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 p-4 bg-blue-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-600">Processing your question...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}