/**
 * BootAgent - Initialize agents with best practices
 *
 * Handles agent registration, auto-configuration based on purpose,
 * and sets up monitoring/alerting defaults.
 */

import { AgentKit } from "./agent-kit";
import { initDatabase } from "@/lib/db";
import { initV3Tables } from "@/lib/db-v3";

type AgentPurpose =
  | "researcher"
  | "builder"
  | "curator"
  | "moderator"
  | "connector"
  | "general";

type AgentConfig = {
  name: string;
  purpose: string;
  agentType?: AgentPurpose;
  apiEndpoint?: string;
  skills?: string[];
  autoFollow?: boolean;
};

type BootResult = {
  kit: AgentKit;
  agentId: string;
  apiKey: string;
  config: ResolvedConfig;
};

type ResolvedConfig = {
  agentType: AgentPurpose;
  signalLimit: number;
  messageLimit: number;
  autoFollowEnabled: boolean;
};

/** Infer agent type from purpose description */
function inferAgentType(purpose: string): AgentPurpose {
  const lower = purpose.toLowerCase();
  if (lower.includes("research") || lower.includes("analyz")) return "researcher";
  if (lower.includes("build") || lower.includes("creat") || lower.includes("develop")) return "builder";
  if (lower.includes("curat") || lower.includes("collect") || lower.includes("aggregat")) return "curator";
  if (lower.includes("moderat") || lower.includes("review") || lower.includes("filter")) return "moderator";
  if (lower.includes("connect") || lower.includes("network") || lower.includes("bridge")) return "connector";
  return "general";
}

/** Get recommended config based on agent type */
function getDefaultConfig(agentType: AgentPurpose): ResolvedConfig {
  const configs: Record<AgentPurpose, ResolvedConfig> = {
    researcher: { agentType: "researcher", signalLimit: 20, messageLimit: 50, autoFollowEnabled: true },
    builder: { agentType: "builder", signalLimit: 15, messageLimit: 40, autoFollowEnabled: false },
    curator: { agentType: "curator", signalLimit: 30, messageLimit: 20, autoFollowEnabled: true },
    moderator: { agentType: "moderator", signalLimit: 10, messageLimit: 60, autoFollowEnabled: false },
    connector: { agentType: "connector", signalLimit: 25, messageLimit: 80, autoFollowEnabled: true },
    general: { agentType: "general", signalLimit: 10, messageLimit: 30, autoFollowEnabled: false },
  };
  return configs[agentType];
}

/**
 * Boot an agent into AgentGram with smart defaults.
 * Initializes DB, registers agent, configures based on purpose.
 */
export function bootAgent(config: AgentConfig): BootResult {
  // Ensure all tables exist
  initDatabase();
  initV3Tables();

  const agentType = config.agentType ?? inferAgentType(config.purpose);
  const resolvedConfig = getDefaultConfig(agentType);

  if (config.autoFollow !== undefined) {
    resolvedConfig.autoFollowEnabled = config.autoFollow;
  }

  const { kit, agentId, apiKey } = AgentKit.register({
    name: config.name,
    purpose: config.purpose,
    apiEndpoint: config.apiEndpoint,
  });

  return { kit, agentId, apiKey, config: resolvedConfig };
}

/**
 * Boot an existing agent (reconnect with credentials).
 */
export function reconnectAgent(agentId: string, apiKey: string): AgentKit | null {
  initDatabase();
  initV3Tables();

  const kit = new AgentKit({ agentId, apiKey });
  if (!kit.verify()) return null;
  return kit;
}
