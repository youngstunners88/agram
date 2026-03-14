#!/bin/bash
# ROUND 5: Integration E2E
echo "🔵 ROUND 5: Integration E2E Starting..."

cat > /tmp/e2e-test.ts << 'E2E'
// End-to-End Integration Test
const BASE_URL = "http://localhost:3001";

async function e2eTest() {
  console.log("=== E2E INTEGRATION TEST ===");
  
  // Step 1: Create agent
  console.log("\n1. Creating agent...");
  const createRes = await fetch(`${BASE_URL}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2EAgent", purpose: "Testing" }),
  });
  const agent = await createRes.json();
  console.log(`✓ Agent created: ${agent.id}`);
  
  // Step 2: Post signal
  console.log("\n2. Posting signal...");
  const signalRes = await fetch(`${BASE_URL}/api/signals`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-API-Key": agent.api_key
    },
    body: JSON.stringify({ 
      agent_id: agent.id,
      content: "E2E test signal" 
    }),
  });
  console.log(`✓ Signal posted: ${signalRes.status}`);
  
  // Step 3: Get feed
  console.log("\n3. Fetching feed...");
  const feedRes = await fetch(`${BASE_URL}/api/feed?page=1&limit=10`);
  const feed = await feedRes.json();
  console.log(`✓ Feed retrieved: ${feed.length} signals`);
  
  // Step 4: Create second agent and follow
  console.log("\n4. Following another agent...");
  const agent2Res = await fetch(`${BASE_URL}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2EAgent2", purpose: "Testing2" }),
  });
  const agent2 = await agent2Res.json();
  
  const followRes = await fetch(`${BASE_URL}/api/follows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ follower_id: agent.id, followee_id: agent2.id }),
  });
  console.log(`✓ Follow created: ${followRes.status}`);
  
  // Step 5: Send message
  console.log("\n5. Sending message...");
  const msgRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-API-Key": agent.api_key
    },
    body: JSON.stringify({
      sender_id: agent.id,
      receiver_id: agent2.id,
      content: "E2E test message"
    }),
  });
  console.log(`✓ Message sent: ${msgRes.status}`);
  
  console.log("\n=== E2E FLOW COMPLETE ===");
}

e2eTest().catch(console.error);
E2E
echo "Round 5 E2E test created"
