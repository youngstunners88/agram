/**
 * AgentGram Load Test
 * Tests: Concurrent agents, signal throughput, wallet transfers, swarm operations
 */

const BASE_URL = process.env.AGENTGRAM_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  total: number;
  success: number;
  failed: number;
  avgMs: number;
  p95Ms: number;
  errors: string[];
}

async function request(endpoint: string, method: string, body?: object): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ms = performance.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      return { ok: false, ms, error: `${res.status}: ${text}` };
    }
    return { ok: true, ms };
  } catch (e) {
    return { ok: false, ms: performance.now() - start, error: String(e) };
  }
}

async function testConcurrentAgents(count: number): Promise<TestResult> {
  console.log(`\n🧪 Testing ${count} concurrent agents...`);
  const results: { ok: boolean; ms: number; error?: string }[] = [];
  
  const promises = Array.from({ length: count }, async (_, i) => {
    const res = await request("/api/agents", "POST", {
      name: `LoadTestAgent${i}`,
      purpose: "Load testing",
    });
    results.push(res);
  });
  
  await Promise.all(promises);
  
  const times = results.filter(r => r.ok).map(r => r.ms);
  return {
    name: `Create ${count} agents`,
    total: count,
    success: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p95Ms: times.length ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0,
    errors: results.filter(r => !r.ok).map(r => r.error!).slice(0, 5),
  };
}

async function testSignalThroughput(rate: number, duration: number): Promise<TestResult> {
  console.log(`\n📡 Testing ${rate} signals/minute for ${duration}s...`);
  const results: { ok: boolean; ms: number }[] = [];
  const start = Date.now();
  
  // Create a test agent first
  const agentRes = await request("/api/agents", "POST", {
    name: "SignalTestAgent",
    purpose: "Testing",
  });
  if (!agentRes.ok) {
    return { name: "Signal throughput", total: 0, success: 0, failed: 0, avgMs: 0, p95Ms: 0, errors: ["Failed to create test agent"] };
  }
  
  const interval = 60000 / rate; // ms between requests
  
  while (Date.now() - start < duration * 1000) {
    const res = await request("/api/signals", "POST", {
      agent_id: "test",
      api_key: "test",
      content: `Test signal ${Date.now()}`,
    });
    results.push(res);
    await new Promise(r => setTimeout(r, interval));
  }
  
  const times = results.filter(r => r.ok).map(r => r.ms);
  return {
    name: `Signal throughput (${rate}/min)`,
    total: results.length,
    success: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p95Ms: times.length ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0,
    errors: [],
  };
}

async function testWalletTransfers(count: number): Promise<TestResult> {
  console.log(`\n💰 Testing ${count} wallet transfers...`);
  const results: { ok: boolean; ms: number }[] = [];
  
  // Create wallets
  await request("/api/wallet", "POST", { agent_id: "sender" });
  await request("/api/wallet", "POST", { agent_id: "receiver" });
  
  for (let i = 0; i < count; i++) {
    const res = await request("/api/wallet", "PUT", {
      from: "sender",
      to: "receiver",
      amount: 1,
    });
    results.push(res);
  }
  
  const times = results.filter(r => r.ok).map(r => r.ms);
  return {
    name: `${count} wallet transfers`,
    total: count,
    success: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p95Ms: times.length ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0,
    errors: [],
  };
}

function printResult(r: TestResult) {
  const status = r.failed === 0 ? "✅" : "⚠️";
  console.log(`\n${status} ${r.name}`);
  console.log(`   Total: ${r.total} | Success: ${r.success} | Failed: ${r.failed}`);
  console.log(`   Avg: ${r.avgMs.toFixed(2)}ms | P95: ${r.p95Ms.toFixed(2)}ms`);
  if (r.errors.length) {
    console.log(`   Errors: ${r.errors.join(", ")}`);
  }
}

async function main() {
  console.log("🚀 AgentGram Load Test Starting...");
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  
  // Health check
  const health = await request("/api/agents", "GET");
  if (!health.ok) {
    console.error("❌ Server not responding. Start with: npm run dev");
    process.exit(1);
  }
  console.log("✅ Server healthy\n");
  
  const results: TestResult[] = [];
  
  // Test 1: Concurrent agents
  results.push(await testConcurrentAgents(50));
  results.push(await testConcurrentAgents(100));
  
  // Test 2: Signal throughput
  results.push(await testSignalThroughput(100, 30)); // 100/min for 30s
  
  // Test 3: Wallet transfers
  results.push(await testWalletTransfers(50));
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 LOAD TEST SUMMARY");
  console.log("=".repeat(60));
  results.forEach(printResult);
  
  const allPassed = results.every(r => r.failed === 0 && r.p95Ms < 500);
  console.log("\n" + (allPassed ? "✅ ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED"));
  
  // Exit code for CI
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
