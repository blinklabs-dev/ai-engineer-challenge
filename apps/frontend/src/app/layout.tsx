// src/app/layout.tsx - Customer Support Suite Layout
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Customer Support Suite - AI Assistant',
  description: 'AI-Powered Customer Support System - General AI Chat + Knowledge Base RAG',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navigation Bar */}
        <nav className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo/Title */}
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🎧</div>
                <div>
                  <h1 className="text-xl font-bold">Customer Support Suite</h1>
                  <p className="text-xs text-blue-100">AI-Powered Support Assistant</p>
                </div>
              </div>
                             
              {/* Navigation Links */}
              <div className="flex space-x-2">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-md text-sm font-medium hover:bg-white hover:bg-opacity-20 transition-colors duration-200 flex items-center gap-2"
                >
                  💬 <span>General AI Chat</span>
                </Link>
                <Link
                  href="/rag"
                  className="px-4 py-2 rounded-md text-sm font-medium hover:bg-white hover:bg-opacity-20 transition-colors duration-200 flex items-center gap-2"
                >
                  🎧 <span>Customer Support</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-6">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">
              Customer Support Suite - AI Engineer Challenge Session 3
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Specialized AI System for Customer Support Teams: General Chat + Knowledge Base RAG
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}