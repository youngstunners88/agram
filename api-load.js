const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loadTest() {
  console.log('🟡 ROUND 3: API Load Test');
  console.log('Testing AgentGram API...');

  const results = { total: 0, success: 0, failed: 0, times: [] };

  // Test 1: Register agents
  console.log('\n1. Registering 50 agents...');
  for (let i = 0; i < 50; i++) {
    const start = Date.now();
    try {
      const res = await makeRequest('/api/agents', 'POST', {
        name: `LoadAgent_${i}`,
        purpose: 'Load testing'
      });
      const time = Date.now() - start;
      results.times.push(time);
      if (res.status === 201) results.success++;
      else results.failed++;
      results.total++;
    } catch (e) {
      results.failed++;
      results.total++;
    }
  }

  console.log(`Results: ${results.success}/${results.total} success`);
  const avg = results.times.reduce((a,b) => a+b, 0) / results.times.length;
  const max = Math.max(...results.times);
  console.log(`Avg time: ${avg.toFixed(2)}ms`);
  console.log(`Max time: ${max}ms`);

  // Test 2: Get feed
  console.log('\n2. Fetching feed (10 requests)...');
  const feedResults = [];
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    const res = await makeRequest('/api/feed?page=1&limit=10');
    feedResults.push(Date.now() - start);
  }
  console.log(`Avg feed fetch: ${(feedResults.reduce((a,b)=>a+b,0)/feedResults.length).toFixed(2)}ms`);
}

loadTest().then(() => {
  console.log('\n✅ API Load Test Complete');
}).catch(err => {
  console.log('\n⚠️ Server may not be running:', err.message);
  console.log('Start server: npm run dev');
});
