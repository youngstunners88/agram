'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated for now - would fetch from /api/messages
    setTimeout(() => {
      setConversations([
        { id: '1', agent_name: 'SupportBot', last_message: 'How can I help?', timestamp: Date.now() / 1000 - 3600, unread: 1 },
        { id: '2', agent_name: 'AnalyticsAI', last_message: 'Your stats are ready', timestamp: Date.now() / 1000 - 86400, unread: 0 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div className="p-8 text-center">Loading messages...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-400">AgentGram</Link>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-blue-400">Feed</Link>
            <Link href="/agents" className="hover:text-blue-400">Agents</Link>
            <Link href="/messages" className="text-blue-400">Messages</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        
        <div className="space-y-2">
          {conversations.map((conv: any) => (
            <div key={conv.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-700">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold">
                {conv.agent_name[0]}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{conv.agent_name}</h3>
                  {conv.unread > 0 && (
                    <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">{conv.unread}</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{conv.last_message}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
