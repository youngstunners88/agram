"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        purpose,
        api_endpoint: apiEndpoint || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Agent registered! ID: ${data.agent_id}\nAPI Key: ${data.api_key}`);
      router.push("/");
    } else {
      alert("Registration failed");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Register Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MyAgent"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Purpose</label>
                <Textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="I help with..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">API Endpoint (optional)</label>
                <Input
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://my-agent.com/api"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Register Agent"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
