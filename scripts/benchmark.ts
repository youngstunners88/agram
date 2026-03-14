/**
 * Benchmark - Load test AgentGram endpoints
 *
 * Usage: npx tsx scripts/benchmark.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

type BenchResult = {
  endpoint: string;
  method: string;
  requests: number;
  successCount: number;
  failCount: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  rps: number;
};

async function timedFetch(url: string, options?: RequestInit): Promise<{
  ok: boolean; ms: number;
}> {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    return { ok: res.ok, ms: performance.now() - start };
  } catch {
    return { ok: false, ms: performance.now() - start };
  }
}

async function benchEndpoint(
  label: string, method: string, url: string,
  body?: unknown, headers?: Record<string, string>,
  count = 100, concurrency = 10
): Promise<BenchResult> {
  const times: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const batches = Math.ceil(count / concurrency);
  const totalStart = performance.now();

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, count - b * concurrency);
    const promises = Array.from({ length: batchSize }, () =>
      timedFetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      times.push(r.ms);
      if (r.ok) successCount++;
      else failCount++;
    }
  }

  const totalMs = performance.now() - totalStart;
  times.sort((a, b) => a - b);

  return {
    endpoint: label,
    method,
    requests: count,
    successCount,
    failCount,
    avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minMs: Math.round(times[0]),
    maxMs: Math.round(times[times.length - 1]),
    p95Ms: Math.round(times[Math.floor(times.length * 0.95)]),
    rps: Math.round((count / totalMs) * 1000),
  };
}

function printResult(r: BenchResult) {
  const status = r.failCount === 0 ? "PASS" : "WARN";
  console.log(`  [${status}] ${r.method} ${r.endpoint}`);
  console.log(`    ${r.requests} reqs | ${r.successCount} ok / ${r.failCount} fail`);
  console.log(`    avg: ${r.avgMs}ms | min: ${r.minMs}ms | max: ${r.maxMs}ms | p95: ${r.p95Ms}ms`);
  console.log(`    throughput: ${r.rps} req/s\n`);
}

async function run() {
  console.log("AgentGram Benchmark\n");
  console.log(`Target: ${BASE_URL}`);
  console.log("---\n");

  // 1. Create a test agent
  const agentRes = await fetch(`${BASE_URL}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "BenchBot", purpose: "Load testing" }),
  });
  const agentData = await agentRes.json();
  const agentId = agentData.data?.id ?? agentData.id;
  const apiKey = agentData.data?.api_key ?? agentData.api_key;

  if (!agentId) {
    console.log("Failed to create test agent. Is the server running?");
    return;
  }
  console.log(`Test agent: ${agentId}\n`);

  // 2. Benchmark GET endpoints
  const feedResult = await benchEndpoint(
    "/api/feed", "GET", `${BASE_URL}/api/feed?page=1&limit=10`
  );
  printResult(feedResult);

  const metricsResult = await benchEndpoint(
    "/api/metrics", "GET", `${BASE_URL}/api/metrics`
  );
  printResult(metricsResult);

  // 3. Benchmark POST signals (rate limited)
  const signalResult = await benchEndpoint(
    "/api/signals", "POST", `${BASE_URL}/api/signals`,
    { agent_id: agentId, content: "Benchmark signal" },
    { "X-API-Key": apiKey },
    50, 5
  );
  printResult(signalResult);

  // 4. Benchmark wallet balance check
  const balanceResult = await benchEndpoint(
    "/api/wallet/balance", "GET",
    `${BASE_URL}/api/wallet/balance?agent_id=${agentId}`
  );
  printResult(balanceResult);

  // Summary
  console.log("--- Summary ---");
  const results = [feedResult, metricsResult, signalResult, balanceResult];
  const avgRps = Math.round(results.reduce((a, r) => a + r.rps, 0) / results.length);
  const maxP95 = Math.max(...results.map((r) => r.p95Ms));
  const totalFails = results.reduce((a, r) => a + r.failCount, 0);

  console.log(`  Average throughput: ${avgRps} req/s`);
  console.log(`  Worst p95 latency: ${maxP95}ms`);
  console.log(`  Total failures: ${totalFails}`);
  console.log(`  Status: ${totalFails === 0 && maxP95 < 100 ? "HEALTHY" : "NEEDS ATTENTION"}`);
}

run().catch(console.error);
