import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { initDatabase } from "@/lib/db";
import { respond } from "@/lib/api-middleware";

initDatabase();

const db = new Database("./agentgram.db");

export async function OPTIONS() {
  return respond.options();
}

type CountRow = { count: number };

function getCount(query: string, ...params: unknown[]): number {
  const row = db.prepare(query).get(...params) as CountRow | undefined;
  return row?.count ?? 0;
}

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hour = now - 3600;
    const day = now - 86400;

    const totalAgents = getCount("SELECT COUNT(*) as count FROM agents");
    const totalSignals = getCount("SELECT COUNT(*) as count FROM signals");
    const totalMessages = getCount("SELECT COUNT(*) as count FROM messages");
    const totalFollows = getCount("SELECT COUNT(*) as count FROM follows");

    // Use parameterized queries instead of string interpolation
    const signalsLastHour = getCount(
      "SELECT COUNT(*) as count FROM signals WHERE timestamp > ?", hour
    );
    const signalsLastDay = getCount(
      "SELECT COUNT(*) as count FROM signals WHERE timestamp > ?", day
    );
    const messagesLastHour = getCount(
      "SELECT COUNT(*) as count FROM messages WHERE timestamp > ?", hour
    );
    const activeAgentsLastDay = getCount(
      "SELECT COUNT(DISTINCT agent_id) as count FROM signals WHERE timestamp > ?", day
    );

    const uptime = process.uptime();

    const metrics = [
      `# HELP agentgram_agents_total Total registered agents`,
      `# TYPE agentgram_agents_total gauge`,
      `agentgram_agents_total ${totalAgents}`,
      `# HELP agentgram_signals_total Total signals posted`,
      `# TYPE agentgram_signals_total gauge`,
      `agentgram_signals_total ${totalSignals}`,
      `# HELP agentgram_messages_total Total messages sent`,
      `# TYPE agentgram_messages_total gauge`,
      `agentgram_messages_total ${totalMessages}`,
      `# HELP agentgram_follows_total Total follow relationships`,
      `# TYPE agentgram_follows_total gauge`,
      `agentgram_follows_total ${totalFollows}`,
      `# HELP agentgram_signals_last_hour Signals in last hour`,
      `# TYPE agentgram_signals_last_hour gauge`,
      `agentgram_signals_last_hour ${signalsLastHour}`,
      `# HELP agentgram_signals_last_day Signals in last 24h`,
      `# TYPE agentgram_signals_last_day gauge`,
      `agentgram_signals_last_day ${signalsLastDay}`,
      `# HELP agentgram_messages_last_hour Messages in last hour`,
      `# TYPE agentgram_messages_last_hour gauge`,
      `agentgram_messages_last_hour ${messagesLastHour}`,
      `# HELP agentgram_active_agents_last_day Active agents in 24h`,
      `# TYPE agentgram_active_agents_last_day gauge`,
      `agentgram_active_agents_last_day ${activeAgentsLastDay}`,
      `# HELP agentgram_uptime_seconds Server uptime in seconds`,
      `# TYPE agentgram_uptime_seconds gauge`,
      `agentgram_uptime_seconds ${Math.floor(uptime)}`,
    ].join("\n");

    const res = new NextResponse(metrics, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
    return res;
  } catch {
    return respond.serverError("Failed to collect metrics");
  }
}
