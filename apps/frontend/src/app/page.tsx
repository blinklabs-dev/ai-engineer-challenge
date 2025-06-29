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
      const res = await fetch("http://localhost:8000/ask", {
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
    } catch (err) {
      console.error(err); // ✅ Fix: log err to avoid ESLint error
      setAnswer("⚠️ Failed to reach backend.");
    } finally {
      setLoading(false);
    }

    if (apiKey) {
      localStorage.setItem("OPENAI_API_KEY", apiKey);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      askQuestion();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AskNerd 🤖
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Ask anything, get intelligent answers
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-slate-200 dark:border-gray-700 hover:shadow-md transition-all"
          >
            <FiSettings />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-4">
              <div className="flex gap-3">
                <textarea
                  className="flex-1 resize-none border-0 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-0"
                  placeholder="Ask me anything..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={3}
                />
                <button
                  onClick={askQuestion}
                  disabled={loading || !question.trim()}
                  className="self-end p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:scale-100"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSend />
                  )}
                </button>
              </div>
            </div>

            {answer && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-semibold text-slate-900 dark:text-white">Response</h2>
                  <button
                    onClick={() => copyToClipboard(answer)}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copied ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {answer}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 ${
                showSettings ? "block" : "hidden lg:block"
              }`}
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    AI Model
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    API Key (Optional)
                  </label>
                  <input
                    type="password"
                    className="w-full p-3 border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={apiKey}
                    placeholder="sk-..."
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Leave empty to use server default
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-gray-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  💡 Tip: Press Cmd/Ctrl + Enter to send your message quickly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
