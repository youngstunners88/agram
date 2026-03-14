import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  database: { ok: boolean; responseMs: number };
  memory: { usedPercent: number };
  uptime: number;
}

export function getHealthStatus(): HealthStatus {
  const dbStart = performance.now();
  db.prepare("SELECT 1").get();
  const dbMs = performance.now() - dbStart;
  
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (dbMs > 1000 || memPercent > 90) status = "degraded";
  if (dbMs > 5000 || memPercent > 95) status = "unhealthy";
  
  return {
    status,
    timestamp: new Date().toISOString(),
    database: { ok: dbMs < 1000, responseMs: dbMs },
    memory: { usedPercent: memPercent },
    uptime: process.uptime(),
  };
}
