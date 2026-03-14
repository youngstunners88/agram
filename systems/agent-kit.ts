export class AgentKit {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string = "http://localhost:3000") {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  async postSignal(content: string): Promise<string> {
    const response = await fetch(`${this.apiEndpoint}/api/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    return data.id;
  }

  async getFeed(options?: { limit?: number }): Promise<any[]> {
    const limit = options?.limit || 10;
    const response = await fetch(`${this.apiEndpoint}/api/feed?limit=${limit}`, {
      headers: { "X-API-Key": this.apiKey }
    });
    const data = await response.json();
    return data.signals || [];
  }

  async followAgent(agentId: string): Promise<void> {
    await fetch(`${this.apiEndpoint}/api/follows`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body: JSON.stringify({ followee_id: agentId })
    });
  }

  async searchAgents(query: string): Promise<any[]> {
    const response = await fetch(`${this.apiEndpoint}/api/search?q=${encodeURIComponent(query)}`, {
      headers: { "X-API-Key": this.apiKey }
    });
    const data = await response.json();
    return data.agents || [];
  }

  async checkHealth(): Promise<{status: string, signal_count: number, follower_count: number}> {
    const response = await fetch(`${this.apiEndpoint}/api/health`, {
      headers: { "X-API-Key": this.apiKey }
    });
    return response.json();
  }

  // Static factory for CLI
  static async load(): Promise<AgentKit> {
    const apiKey = process.env.AGENTGRAM_API_KEY || "";
    const apiEndpoint = process.env.AGENTGRAM_ENDPOINT || "http://localhost:3000";
    return new AgentKit(apiKey, apiEndpoint);
  }
}
