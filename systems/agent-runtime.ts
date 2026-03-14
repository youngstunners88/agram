/**
 * AgentRuntime - Execution environment for agents
 *
 * Manages agent lifecycle, rate limit compliance, error recovery,
 * and performance tracking.
 */

import { AgentKit } from "./agent-kit";
import { checkRateLimit } from "@/lib/rate-limiter";

type RuntimeEvent = {
  type: "signal_posted" | "message_sent" | "follow" | "error" | "rate_limited";
  timestamp: number;
  detail: string;
};

type RuntimeStats = {
  signalsPosted: number;
  messagesSent: number;
  errorsEncountered: number;
  rateLimitsHit: number;
  uptimeMs: number;
};

export class AgentRuntime {
  private kit: AgentKit;
  private events: RuntimeEvent[] = [];
  private stats: RuntimeStats;
  private startTime: number;
  private maxEventLog = 1000;

  constructor(kit: AgentKit) {
    this.kit = kit;
    this.startTime = Date.now();
    this.stats = {
      signalsPosted: 0,
      messagesSent: 0,
      errorsEncountered: 0,
      rateLimitsHit: 0,
      uptimeMs: 0,
    };
  }

  /** Post a signal with automatic error handling and stats tracking */
  postSignal(content: string): { success: boolean; id?: string; error?: string } {
    try {
      const id = this.kit.postSignal(content);
      if (!id) {
        this.logEvent("rate_limited", "Signal rate limited");
        this.stats.rateLimitsHit++;
        return { success: false, error: "rate_limited" };
      }
      this.logEvent("signal_posted", `Signal ${id}`);
      this.stats.signalsPosted++;
      return { success: true, id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logEvent("error", msg);
      this.stats.errorsEncountered++;
      return { success: false, error: msg };
    }
  }

  /** Send a message with automatic error handling */
  sendMessage(recipientId: string, content: string): { success: boolean; id?: string; error?: string } {
    try {
      const id = this.kit.sendMessage(recipientId, content);
      if (!id) {
        this.logEvent("rate_limited", "Message rate limited");
        this.stats.rateLimitsHit++;
        return { success: false, error: "rate_limited" };
      }
      this.logEvent("message_sent", `To ${recipientId}`);
      this.stats.messagesSent++;
      return { success: true, id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logEvent("error", msg);
      this.stats.errorsEncountered++;
      return { success: false, error: msg };
    }
  }

  /** Follow an agent with error handling */
  follow(targetId: string): boolean {
    try {
      const result = this.kit.follow(targetId);
      if (result) this.logEvent("follow", `Followed ${targetId}`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logEvent("error", msg);
      this.stats.errorsEncountered++;
      return false;
    }
  }

  /** Get runtime statistics */
  getStats(): RuntimeStats {
    return {
      ...this.stats,
      uptimeMs: Date.now() - this.startTime,
    };
  }

  /** Get recent event log */
  getEventLog(limit = 50): RuntimeEvent[] {
    return this.events.slice(-limit);
  }

  /** Check if the agent is healthy (low error rate) */
  isHealthy(): boolean {
    const total = this.stats.signalsPosted + this.stats.messagesSent;
    if (total === 0) return true;
    const errorRate = this.stats.errorsEncountered / total;
    return errorRate < 0.1; // Less than 10% error rate
  }

  private logEvent(type: RuntimeEvent["type"], detail: string) {
    this.events.push({ type, timestamp: Date.now(), detail });
    if (this.events.length > this.maxEventLog) {
      this.events = this.events.slice(-this.maxEventLog);
    }
  }
}
