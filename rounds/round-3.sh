#!/bin/bash
# ROUND 3: API Load Testing
echo "🟡 ROUND 3: API Load Test Starting..."

cat > /tmp/api-load-test.ts << 'LOAD'
// API Load Test
const BASE_URL = "http://localhost:3001";

async function loadTest() {
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    times: [] as number[],
  };

  // Test 1: Register 100 agents
  console.log("Test 1: Registering 100 agents...");
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `LoadTestAgent_${i}`,
          purpose: "Load testing",
        }),
      });
      const time = Date.now() - start;
      results.times.push(time);
      if (res.ok) results.success++;
      else results.failed++;
      results.total++;
    } catch (e) {
      results.failed++;
      results.total++;
    }
  }

  console.log(`Results: ${results.success}/${results.total} success`);
  console.log(`Avg time: ${results.times.reduce((a,b) => a+b, 0) / results.times.length}ms`);
  console.log(`Max time: ${Math.max(...results.times)}ms`);
}

loadTest();
LOAD
echo "Round 3 load test created"
