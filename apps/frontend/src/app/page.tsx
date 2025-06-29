"use client";

import { useState, useEffect } from "react";
import { FiSend, FiSettings, FiCopy, FiCheck } from "react-icons/fi";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Ask Marvin 🧠</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your curious AI sidekick</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Settings"
          >
            <FiSettings className="text-xl text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Chat Panel */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 mb-4">
          <textarea
            className="w-full bg-gray-100 dark:bg-gray-700 rounded-md p-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none mb-4"
            placeholder="Ask Marvin anything..."
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            onClick={askQuestion}
            disabled={loading || !question.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-md py-2 flex justify-center items-center"
          >
            {loading ? <div className="loader w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FiSend className="mr-2" /> Ask</>}
          </button>
        </div>

        {answer && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-900 dark:text-green-100 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Answer:</h2>
              <button
                onClick={() => copyToClipboard(answer)}
                className="text-sm text-blue-600 hover:underline"
              >
                {copied ? <FiCheck /> : <FiCopy />}
              </button>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-6 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-xl p-6">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-white">Settings</h3>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">API Key (optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 mt-1">Used if you want to override the default key</p>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">gpt-4</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
