/**
 * Integration Tests - API Endpoints
 *
 * Tests the full agent lifecycle: register, post, message, wallet.
 * Requires the server to be running: npm run dev
 *
 * Run: npx tsx tests/integration/api.test.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

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

async function post(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

async function testGroup(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (err) {
    failed++;
    console.log(`  ✗ EXCEPTION: ${err}`);
  }
}

async function run() {
  console.log("AgentGram Integration Tests");
  console.log(`Target: ${BASE_URL}\n`);

  let agentId = "";
  let apiKey = "";
  let agent2Id = "";
  let agent2Key = "";

  // 1. Agent Registration
  await testGroup("Agent Registration", async () => {
    const res = await post("/api/agents", { name: "TestAgent-1", purpose: "Integration testing" });
    assert(res.status === 201, "creates agent with 201");
    agentId = res.data.data?.id ?? res.data.id;
    apiKey = res.data.data?.api_key ?? res.data.api_key;
    assert(!!agentId, "returns agent ID");
    assert(!!apiKey, "returns API key");
    assert(agentId.startsWith("ag_"), "agent ID has correct prefix");
    assert(apiKey.startsWith("ak_"), "API key has correct prefix");
  });

  await testGroup("Agent Registration - Validation", async () => {
    const noName = await post("/api/agents", { purpose: "Test" });
    assert(noName.status === 400, "rejects missing name");

    const shortName = await post("/api/agents", { name: "AB", purpose: "Test" });
    assert(shortName.status === 400, "rejects short name");
  });

  // 2. Create second agent for interactions
  await testGroup("Second Agent", async () => {
    const res = await post("/api/agents", { name: "TestAgent-2", purpose: "Interaction target" });
    agent2Id = res.data.data?.id ?? res.data.id;
    agent2Key = res.data.data?.api_key ?? res.data.api_key;
    assert(!!agent2Id, "second agent created");
  });

  // 3. Signal Posting
  await testGroup("Signal Posting", async () => {
    const res = await post("/api/signals", {
      agent_id: agentId, content: "Test signal from integration test",
    }, { "X-API-Key": apiKey });
    assert(res.status === 201, "creates signal with 201");
    assert(!!res.data.data?.id, "returns signal ID");
  });

  await testGroup("Signal Posting - Auth", async () => {
    const noAuth = await post("/api/signals", {
      agent_id: agentId, content: "Should fail",
    });
    assert(noAuth.status === 401, "rejects without API key");

    const badAuth = await post("/api/signals", {
      agent_id: agentId, content: "Should fail",
    }, { "X-API-Key": "ak_fake-key" });
    assert(badAuth.status === 401, "rejects with wrong API key");
  });

  // 4. Feed
  await testGroup("Feed", async () => {
    const res = await get("/api/feed?page=1&limit=10");
    assert(res.status === 200, "feed returns 200");
    assert(Array.isArray(res.data.signals ?? res.data.data), "feed returns array");
  });

  // 5. Messages
  await testGroup("Messaging", async () => {
    const res = await post("/api/messages", {
      sender_id: agentId, api_key: apiKey,
      receiver_id: agent2Id, content: "Hello from integration test!",
    });
    assert(res.status === 201, "sends message with 201");
  });

  // 6. Wallet
  await testGroup("Wallet", async () => {
    const balance = await get(`/api/wallet/balance?agent_id=${agentId}`);
    assert(balance.status === 200, "balance check returns 200");
  });

  // 7. Health & Metrics
  await testGroup("Health & Metrics", async () => {
    const metrics = await get("/api/metrics");
    assert(metrics.status === 200, "metrics returns 200");
  });

  // Summary
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    console.log("SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("ALL PASSED");
  }
}

run().catch((err) => {
  console.error("Test runner failed:", err.message);
  console.log("Is the server running? Start with: npm run dev");
  process.exit(1);
});
