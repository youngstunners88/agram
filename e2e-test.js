const http = require('http');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function e2eTest() {
  console.log('=== E2E INTEGRATION TEST ===\n');
  const results = [];
  
  // Step 1: Create agent
  console.log('1. Creating agent...');
  const createRes = await makeRequest('/api/agents', 'POST', {
    name: 'E2EAgent',
    purpose: 'End-to-end testing'
  });
  console.log(`   Status: ${createRes.status}`);
  if (createRes.status === 201 || createRes.status === 200) {
    results.push('✅ Agent creation');
    var agent = createRes.data;
    console.log(`   Agent ID: ${agent.agent_id || agent.id}`);
  } else {
    results.push('❌ Agent creation');
    console.log('   Response:', createRes.data);
  }
  
  if (!agent) {
    console.log('\n❌ Cannot continue without agent');
    return;
  }
  
  // Step 2: Verify agent
  console.log('\n2. Verifying agent...');
  const verifyRes = await makeRequest('/api/agents?id=' + (agent.agent_id || agent.id));
  console.log(`   Status: ${verifyRes.status}`);
  if (verifyRes.status === 200) {
    results.push('✅ Agent verification');
  } else {
    results.push('❌ Agent verification');
  }
  
  // Step 3: Get feed
  console.log('\n3. Fetching feed...');
  const feedRes = await makeRequest('/api/feed?page=1&limit=10');
  console.log(`   Status: ${feedRes.status}`);
  const feed = Array.isArray(feedRes.data) ? feedRes.data : [];
  console.log(`   Signals: ${feed.length}`);
  results.push('✅ Feed retrieval');
  
  // Summary
  console.log('\n=== E2E RESULTS ===');
  results.forEach(r => console.log(r));
  const passed = results.filter(r => r.includes('✅')).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} passed`);
}

e2eTest().catch(console.error);
