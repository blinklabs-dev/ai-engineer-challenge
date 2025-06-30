"use client";

import { useState, useEffect } from "react";
import {
  FiSettings,
  FiSend,
  FiCheck,
  FiCopy,
  FiX,
} from "react-icons/fi";

export default function Home() {
  // ── state ────────────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [temperature, setTemperature] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── grab stored key (if any) ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("OPENAI_API_KEY");
    if (saved) setApiKey(saved);
  }, []);

  // ── core ask function ────────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: question,
          model,
          api_key: apiKey || null,
          temperature,
        }),
      });
      const data = await res.json();
      if (data.answer) setAnswer(data.answer);
      else if (data.detail) setAnswer(`⚠️ ${data.detail}`);
      else if (data.error) setAnswer(`⚠️ ${data.error}`);
    } catch (err) {
      setAnswer("⚠️ Failed to reach backend.");
      console.error(err);
    } finally {
      setLoading(false);
      if (apiKey) localStorage.setItem("OPENAI_API_KEY", apiKey);
    }
  };

  // ── util ────────────────────────────────────────────────────────────────
  const handleKey = (e: React.KeyboardEvent) =>
    e.key === "Enter" && (e.metaKey || e.ctrlKey) && askQuestion();

  const copy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* header */}
      <header className="w-full max-w-4xl px-6 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent select-none">
          AskNerd 🤖
        </h1>
        <button
          aria-label="Open settings"
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-md"
        >
          <FiSettings />
        </button>
      </header>

      {/* main */}
      <main className="w-full max-w-4xl flex-1 px-6 flex flex-col gap-6">
        {/* prompt box */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5 shadow-sm">
          <textarea
            rows={3}
            placeholder="Ask me anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            className="w-full resize-none bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-500"
          />
          <div className="flex justify-end pt-3">
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 text-white rounded-lg transition"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSend />
              )}
            </button>
          </div>
        </div>

        {/* answer */}
        {answer && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-semibold">Response</h2>
              <button
                aria-label="Copy answer"
                onClick={copy}
                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded"
              >
                {copied ? <FiCheck /> : <FiCopy />}
              </button>
            </div>
            <p className="whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-center text-xs text-slate-500">
        Cmd/Ctrl + Enter to send • Built with Next.js &amp; FastAPI
      </footer>

      {/* slide-in settings */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex">
          {/* overlay */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowSettings(false)}
          />
          {/* panel */}
          <div className="w-80 max-w-[90%] bg-white dark:bg-gray-800 h-full shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Settings</h3>
              <button
                aria-label="Close"
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded"
              >
                <FiX />
              </button>
            </div>

            {/* model */}
            <label className="block text-sm font-medium mb-2">AI Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full mb-6 p-3 rounded border bg-white dark:bg-gray-700"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4o">GPT-4o (paid)</option>
            </select>

            {/* temperature */}
            <label className="block text-sm font-medium mb-2">
              Temperature ({temperature.toFixed(2)})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-600 mb-6"
            />

            {/* key */}
            <label className="block text-sm font-medium mb-2">
              API Key (optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-3 rounded border bg-white dark:bg-gray-700"
            />
            <p className="text-xs mt-2 text-slate-500">
              Leave empty to use server default.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
