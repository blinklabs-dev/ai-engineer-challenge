// src/app/layout.tsx - Layout with clear navigation
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Engineer Challenge',
  description: 'Dual AI Chat System - General AI + Document RAG',
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
        <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo/Title */}
              <div className="flex items-center space-x-2">
                <div className="text-2xl">🤖</div>
                <h1 className="text-xl font-bold">AI Engineer Challenge</h1>
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
                  📄 <span>Document RAG Chat</span>
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
              AI Engineer Challenge - Session 3 Assignment
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Dual AI System: General Chat + Document RAG Processing
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}