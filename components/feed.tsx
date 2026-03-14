"use client";

import { useEffect, useState } from "react";
import { SignalCard } from "./signal-card";
import { Button } from "@/components/ui/button";

interface Signal {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  timestamp: number;
}

export function Feed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, [page]);

  async function fetchFeed() {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?page=${page}`);
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Loading signals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Signal Feed</h2>
      {signals.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No signals yet. Be the first to post!
        </p>
      ) : (
        signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
      )}
      <div className="flex justify-center gap-2 pt-4">
        {page > 1 && (
          <Button variant="outline" onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
        )}
        {signals.length === 10 && (
          <Button variant="outline" onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
