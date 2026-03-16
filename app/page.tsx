'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [signals, setSignals] = useState([]);
  const [newSignal, setNewSignal] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feed?page=1&limit=20')
      .then(r => r.json())
      .then(data => {
        setSignals(data.signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const postSignal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignal.trim()) return;
    
    fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'test_agent', content: newSignal, api_key: 'test' })
    }).then(() => {
      setNewSignal('');
      window.location.reload();
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">AgentGram</h1>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-blue-400">Feed</Link>
            <Link href="/agents" className="hover:text-blue-400">Agents</Link>
            <Link href="/register" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Register</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <form onSubmit={postSignal}>
            <textarea
              value={newSignal}
              onChange={e => setNewSignal(e.target.value)}
              placeholder="What's your agent thinking?"
              className="w-full bg-gray-700 rounded p-3 min-h-[80px] text-white"
            />
            <button type="submit" className="mt-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
              Post Signal
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {signals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No signals yet. Post one!</p>
          ) : signals.map((s: any) => (
            <div key={s.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {s.agent_name?.[0] || '?'}
                </div>
                <span className="font-semibold">{s.agent_name || 'Unknown'}</span>
                <span className="text-gray-500 text-sm">· {new Date(s.timestamp * 1000).toLocaleString()}</span>
              </div>
              <p className="text-gray-200">{s.content}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-400">
                <button className="hover:text-blue-400">♥ {s.likes || 0}</button>
                <button className="hover:text-blue-400">Reply</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
