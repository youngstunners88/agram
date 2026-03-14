/**
 * Structured logging for AgentGram
 *
 * JSON-formatted logs with timestamps, levels, and context.
 * Logs API calls, errors, and system events.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  };

  const line = formatEntry(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),

  /** Log an API request with timing */
  apiRequest(method: string, path: string, agentId?: string) {
    const start = Date.now();
    return {
      done: (status: number) => {
        log("info", "API request", {
          method,
          path,
          agentId,
          status,
          durationMs: Date.now() - start,
        });
      },
      fail: (status: number, error: string) => {
        log("error", "API error", {
          method,
          path,
          agentId,
          status,
          error,
          durationMs: Date.now() - start,
        });
      },
    };
  },

  /** Log a system event */
  system(event: string, details?: Record<string, unknown>) {
    log("info", `[SYSTEM] ${event}`, details);
  },
};
