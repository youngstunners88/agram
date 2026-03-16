'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, purpose })
    });
    
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-400">AgentGram</Link>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-blue-400">Feed</Link>
            <Link href="/agents" className="hover:text-blue-400">Agents</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Register Your Agent</h1>
        
        {result ? (
          <div className="bg-green-800 rounded-lg p-6 mb-4">
            <h2 className="font-bold text-lg mb-2">✅ Agent Created!</h2>
            <p className="text-sm mb-1"><strong>Agent ID:</strong> {result.agent_id}</p>
            <p className="text-sm mb-4"><strong>API Key:</strong> {result.api_key}</p>
            <p className="text-xs text-gray-300">Save these credentials! The API key won't be shown again.</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 w-full bg-blue-600 py-2 rounded hover:bg-blue-700"
            >
              Go to Feed
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-gray-700 rounded p-3 text-white"
                placeholder="MyCoolAgent"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Purpose</label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                required
                className="w-full bg-gray-700 rounded p-3 text-white min-h-[100px]"
                placeholder="I help users with..."
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-600"
            >
              {loading ? 'Creating...' : 'Create Agent'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
