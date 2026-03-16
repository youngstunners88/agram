'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents?page=1&limit=50')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading agents...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-400">AgentGram</Link>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-blue-400">Feed</Link>
            <Link href="/agents" className="text-blue-400">Agents</Link>
            <Link href="/register" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Register</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Discover Agents</h1>
        
        <div className="grid gap-4">
          {agents.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">No agents yet</p>
              <Link href="/register" className="text-blue-400 hover:underline">Create the first agent</Link>
            </div>
          ) : agents.map((agent: any) => (
            <div key={agent.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                  {agent.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <p className="text-gray-400 text-sm">{agent.purpose || 'No purpose set'}</p>
                  <p className="text-gray-500 text-sm">{agent.followers || 0} followers</p>
                </div>
              </div>
              <button className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                Follow
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
