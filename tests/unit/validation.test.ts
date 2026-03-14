/**
 * Unit Tests - Validation Schemas
 *
 * Tests all Zod schemas for correct acceptance/rejection of inputs.
 * Run: npx tsx tests/unit/validation.test.ts
 */

import {
  validateInput,
  CreateAgentSchema,
  CreateSignalSchema,
  CreateMessageSchema,
  WalletTransferSchema,
  CreateSwarmSchema,
  SwarmVoteSchema,
  CreateListingSchema,
  CreateWebhookSchema,
  CreateThreadSchema,
  PaginationSchema,
} from "@/lib/validation";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

function testGroup(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

// --- Agent Validation ---
testGroup("CreateAgentSchema", () => {
  const valid = validateInput(CreateAgentSchema, { name: "TestBot", purpose: "Testing" });
  assert(valid.success === true, "accepts valid agent");

  const noName = validateInput(CreateAgentSchema, { purpose: "Testing" });
  assert(noName.success === false, "rejects missing name");

  const shortName = validateInput(CreateAgentSchema, { name: "AB", purpose: "Testing" });
  assert(shortName.success === false, "rejects name under 3 chars");

  const longName = validateInput(CreateAgentSchema, { name: "A".repeat(51), purpose: "Testing" });
  assert(longName.success === false, "rejects name over 50 chars");

  const badChars = validateInput(CreateAgentSchema, { name: "Bot<script>", purpose: "Test" });
  assert(badChars.success === false, "rejects name with special characters");

  const noPurpose = validateInput(CreateAgentSchema, { name: "TestBot" });
  assert(noPurpose.success === false, "rejects missing purpose");

  const longPurpose = validateInput(CreateAgentSchema, { name: "Bot", purpose: "A".repeat(201) });
  assert(longPurpose.success === false, "rejects purpose over 200 chars");

  const withEndpoint = validateInput(CreateAgentSchema, {
    name: "Bot", purpose: "Test", api_endpoint: "https://example.com/api",
  });
  assert(withEndpoint.success === true, "accepts valid api_endpoint");

  const badEndpoint = validateInput(CreateAgentSchema, {
    name: "Bot", purpose: "Test", api_endpoint: "not-a-url",
  });
  assert(badEndpoint.success === false, "rejects invalid api_endpoint");
});

// --- Signal Validation ---
testGroup("CreateSignalSchema", () => {
  const valid = validateInput(CreateSignalSchema, {
    agent_id: "ag_12345678", content: "Hello world",
  });
  assert(valid.success === true, "accepts valid signal");

  const empty = validateInput(CreateSignalSchema, { agent_id: "ag_12345678", content: "" });
  assert(empty.success === false, "rejects empty content");

  const long = validateInput(CreateSignalSchema, {
    agent_id: "ag_12345678", content: "A".repeat(1001),
  });
  assert(long.success === false, "rejects content over 1000 chars");
});

// --- Message Validation ---
testGroup("CreateMessageSchema", () => {
  const valid = validateInput(CreateMessageSchema, {
    sender_id: "ag_1", api_key: "ak_123", receiver_id: "ag_2", content: "Hello",
  });
  assert(valid.success === true, "accepts valid message");

  const noReceiver = validateInput(CreateMessageSchema, {
    sender_id: "ag_1", api_key: "ak_123", content: "Hello",
  });
  assert(noReceiver.success === false, "rejects missing receiver");

  const long = validateInput(CreateMessageSchema, {
    sender_id: "ag_1", api_key: "ak_123", receiver_id: "ag_2", content: "A".repeat(2001),
  });
  assert(long.success === false, "rejects content over 2000 chars");
});

// --- Wallet Validation ---
testGroup("WalletTransferSchema", () => {
  const valid = validateInput(WalletTransferSchema, {
    agent_id: "ag_1", action: "transfer", to_agent_id: "ag_2", amount: 50,
  });
  assert(valid.success === true, "accepts valid transfer");

  const negative = validateInput(WalletTransferSchema, {
    agent_id: "ag_1", action: "transfer", to_agent_id: "ag_2", amount: -10,
  });
  assert(negative.success === false, "rejects negative amount");

  const zero = validateInput(WalletTransferSchema, {
    agent_id: "ag_1", action: "transfer", to_agent_id: "ag_2", amount: 0,
  });
  assert(zero.success === false, "rejects zero amount");

  const huge = validateInput(WalletTransferSchema, {
    agent_id: "ag_1", action: "transfer", to_agent_id: "ag_2", amount: 2_000_000,
  });
  assert(huge.success === false, "rejects amount over 1M");
});

// --- Swarm Validation ---
testGroup("CreateSwarmSchema", () => {
  const valid = validateInput(CreateSwarmSchema, {
    agent_id: "ag_1", name: "My Swarm",
  });
  assert(valid.success === true, "accepts valid swarm");

  const noName = validateInput(CreateSwarmSchema, { agent_id: "ag_1" });
  assert(noName.success === false, "rejects missing name");

  const bigMax = validateInput(CreateSwarmSchema, {
    agent_id: "ag_1", name: "Swarm", max_agents: 200,
  });
  assert(bigMax.success === false, "rejects max_agents over 100");
});

testGroup("SwarmVoteSchema", () => {
  const valid = validateInput(SwarmVoteSchema, {
    agent_id: "ag_1", action: "vote", proposal_id: "prop_1", vote: "yes",
  });
  assert(valid.success === true, "accepts valid vote");

  const badVote = validateInput(SwarmVoteSchema, {
    agent_id: "ag_1", action: "vote", proposal_id: "prop_1", vote: "maybe",
  });
  assert(badVote.success === false, "rejects invalid vote value");
});

// --- Marketplace Validation ---
testGroup("CreateListingSchema", () => {
  const valid = validateInput(CreateListingSchema, {
    seller_id: "ag_1", title: "My Service", price: 100,
  });
  assert(valid.success === true, "accepts valid listing");

  const negPrice = validateInput(CreateListingSchema, {
    seller_id: "ag_1", title: "Service", price: -5,
  });
  assert(negPrice.success === false, "rejects negative price");
});

// --- Webhook Validation ---
testGroup("CreateWebhookSchema", () => {
  const valid = validateInput(CreateWebhookSchema, {
    agent_id: "ag_1", url: "https://example.com/hook", events: ["signal", "message"],
  });
  assert(valid.success === true, "accepts valid webhook");

  const badUrl = validateInput(CreateWebhookSchema, {
    agent_id: "ag_1", url: "not-a-url", events: ["signal"],
  });
  assert(badUrl.success === false, "rejects invalid URL");

  const badEvent = validateInput(CreateWebhookSchema, {
    agent_id: "ag_1", url: "https://example.com", events: ["invalid_event"],
  });
  assert(badEvent.success === false, "rejects invalid event type");

  const emptyEvents = validateInput(CreateWebhookSchema, {
    agent_id: "ag_1", url: "https://example.com", events: [],
  });
  assert(emptyEvents.success === false, "rejects empty events array");
});

// --- Pagination ---
testGroup("PaginationSchema", () => {
  const defaults = validateInput(PaginationSchema, {});
  assert(defaults.success === true && defaults.data.page === 1, "defaults page to 1");
  assert(defaults.success === true && defaults.data.limit === 20, "defaults limit to 20");

  const custom = validateInput(PaginationSchema, { page: "3", limit: "50" });
  assert(custom.success === true && custom.data.page === 3, "coerces page string");
  assert(custom.success === true && custom.data.limit === 50, "coerces limit string");

  const overLimit = validateInput(PaginationSchema, { limit: 200 });
  assert(overLimit.success === false, "rejects limit over 100");
});

// --- Thread Validation ---
testGroup("CreateThreadSchema", () => {
  const valid = validateInput(CreateThreadSchema, {
    parent_signal_id: "sig_1", agent_id: "ag_1", content: "Reply",
  });
  assert(valid.success === true, "accepts valid thread reply");

  const long = validateInput(CreateThreadSchema, {
    parent_signal_id: "sig_1", agent_id: "ag_1", content: "A".repeat(501),
  });
  assert(long.success === false, "rejects content over 500 chars");
});

// --- Summary ---
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log("FAILED");
  process.exit(1);
} else {
  console.log("ALL PASSED");
}
