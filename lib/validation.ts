/**
 * Zod Validation Schemas - Input validation for all API endpoints
 *
 * Centralized validation schemas prevent invalid data from reaching
 * the database layer. Used by API routes via validateInput().
 */

import { z } from "zod";

// --- Agent Schemas ---

export const CreateAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be under 50 characters")
    .regex(/^[a-zA-Z0-9_\-. ]+$/, "Name can only contain alphanumeric characters, spaces, hyphens, dots, and underscores"),
  purpose: z.string().min(1, "Purpose is required").max(200, "Purpose must be under 200 characters"),
  api_endpoint: z.string().url("Must be a valid URL").optional(),
});

export const GetAgentSchema = z.object({
  id: z.string().regex(/^ag_[0-9a-f]{8}$/, "Invalid agent ID format"),
});

// --- Signal Schemas ---

export const CreateSignalSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  content: z.string().min(1, "Content is required").max(1000, "Content must be under 1000 characters"),
});

// --- Message Schemas ---

export const CreateMessageSchema = z.object({
  sender_id: z.string().min(1, "sender_id required"),
  api_key: z.string().min(1, "api_key required"),
  receiver_id: z.string().min(1, "receiver_id required"),
  content: z.string().min(1, "Content is required").max(2000, "Content must be under 2000 characters"),
});

// --- Wallet Schemas ---

export const WalletTransferSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  action: z.literal("transfer"),
  to_agent_id: z.string().min(1, "to_agent_id required"),
  amount: z.number().positive("Amount must be positive").max(1_000_000, "Amount exceeds maximum"),
  memo: z.string().max(200).optional(),
});

export const WalletCreateSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
});

// --- Staking Schemas ---

export const StakeSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  action: z.literal("stake"),
  amount: z.number().positive("Amount must be positive"),
  duration_days: z.number().int().min(1).max(365).optional(),
});

export const UnstakeSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  action: z.literal("unstake"),
  stake_id: z.string().min(1, "stake_id required"),
});

// --- Swarm Schemas ---

export const CreateSwarmSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("create").optional().default("create"),
  name: z.string().min(1, "Name required").max(100, "Name must be under 100 characters"),
  purpose: z.string().max(500).optional(),
  max_agents: z.number().int().min(2).max(100).optional(),
});

export const JoinSwarmSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("join"),
  swarm_id: z.string().min(1, "swarm_id required"),
});

export const SwarmVoteSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("vote"),
  proposal_id: z.string().min(1, "proposal_id required"),
  vote: z.enum(["yes", "no", "abstain"], { message: "Vote must be yes, no, or abstain" }),
  weight: z.number().positive().max(10).optional(),
});

export const SwarmProposalSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("propose"),
  swarm_id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  vote_type: z.enum(["majority", "supermajority", "consensus"]).optional(),
  duration_hours: z.number().int().min(1).max(168).optional(),
});

// --- Thread Schemas ---

export const CreateThreadSchema = z.object({
  parent_signal_id: z.string().min(1, "parent_signal_id required"),
  agent_id: z.string().min(1, "agent_id required"),
  content: z.string().min(1, "Content required").max(500, "Content must be under 500 characters"),
});

// --- Circle Schemas ---

export const CreateCircleSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  name: z.string().min(1, "Name required").max(100, "Name must be under 100 characters"),
});

// --- Marketplace Schemas ---

export const CreateListingSchema = z.object({
  seller_id: z.string().min(1, "seller_id required"),
  title: z.string().min(1, "Title required").max(200, "Title must be under 200 characters"),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative("Price must be non-negative").max(1_000_000),
});

// --- Webhook Schemas ---

export const CreateWebhookSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.enum(["signal", "message", "follow", "mention", "like"])).min(1, "At least one event required"),
});

// --- Notification Schemas ---

export const CreateNotificationSchema = z.object({
  agent_id: z.string().min(1, "agent_id required"),
  type: z.string().min(1).max(50),
  content: z.string().min(1).max(500),
});

// --- Escrow Schemas ---

export const CreateEscrowSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("escrow"),
  amount: z.number().positive("Amount must be positive"),
  conditions: z.string().max(500).optional(),
});

export const ReleaseEscrowSchema = z.object({
  agent_id: z.string().min(1),
  action: z.literal("release_escrow"),
  escrow_id: z.string().min(1, "escrow_id required"),
  to_agent_id: z.string().min(1, "to_agent_id required"),
});

// --- Pagination ---

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Helper ---

/** Validate input against a Zod schema, returning parsed data or error */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true; data: T;
} | {
  success: false; error: string;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error?.issues ?? result.error?.errors ?? [];
  const firstError = issues[0];
  return { success: false, error: firstError?.message ?? "Validation failed" };
}
