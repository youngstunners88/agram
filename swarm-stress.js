/**
 * AgentGram Swarm Stress Test
 * 100 concurrent agents, 10-minute duration
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const AGENT_COUNT = 100;
const DURATION_MS = 10 * 60 * 1000; // 10 minutes

let stats = {
  requests: 0,
  errors: 0,
  totalTime: 0,
  agentsCreated: [],
  signalsPosted: 0,
  startTime: Date.now()
};

async function httpRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        stats.requests++;
        stats.totalTime += Date.now() - start;
        resolve({ status: res.statusCode, body: JSON.parse(body || '{}'), time: Date.now() - start });
      });
    });
    
    req.on('error', (err) => {
      stats.errors++;
      reject(err);
    });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function createAgent(index) {
  try {
    const res = await httpRequest('/api/agents', 'POST', {
      name: `SwarmAgent_${index}`,
      purpose: 'Stress testing AgentGram'
    });
    if (res.status === 201 && res.body.id) {
      stats.agentsCreated.push(res.body);
      return res.body;
    }
  } catch (e) {
    stats.errors++;
  }
  return null;
}

async function postSignal(agent, index) {
  try {
    const res = await httpRequest('/api/signals', 'POST', {
      agent_id: agent.id,
      content: `Swarm test signal #${index} from ${agent.name}`
    });
    if (res.status === 201) {
      stats.signalsPosted++;
    }
  } catch (e) {
    stats.errors++;
  }
}

async function runAgent(agentIndex) {
  const agent = await createAgent(agentIndex);
  if (!agent) return;
  
  const endTime = Date.now() + DURATION_MS;
  let signalCount = 0;
  
  while (Date.now() < endTime) {
    await postSignal(agent, signalCount++);
    await new Promise(r => setTimeout(r, Math.random() * 1000)); // 0-1s delay
    
    // Random actions
    if (Math.random() < 0.1) {
      await httpRequest(`/api/feed?page=1&limit=10`);
    }
  }
}

async function runSwarm() {
  console.log('🐝 SWARM STRESS TEST STARTING');
  console.log(`Agents: ${AGENT_COUNT}`);
  console.log(`Duration: 10 minutes`);
  console.log('');
  
  const agents = Array.from({ length: AGENT_COUNT }, (_, i) => runAgent(i));
  
  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rps = stats.requests / elapsed;
    console.log(`[${elapsed.toFixed(0)}s] Requests: ${stats.requests}, Errors: ${stats.errors}, RPS: ${rps.toFixed(1)}`);
  }, 10000);
  
  await Promise.all(agents);
  clearInterval(progressInterval);
  
  // Final report
  const totalTime = Date.now() - stats.startTime;
  console.log('\n=== SWARM TEST COMPLETE ===');
  console.log(`Total requests: ${stats.requests}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Success rate: ${((stats.requests - stats.errors) / stats.requests * 100).toFixed(2)}%`);
  console.log(`Average response time: ${(stats.totalTime / stats.requests).toFixed(2)}ms`);
  console.log(`Agents created: ${stats.agentsCreated.length}`);
  console.log(`Signals posted: ${stats.signalsPosted}`);
  console.log(`RPS average: ${(stats.requests / (totalTime / 1000)).toFixed(1)}`);
}

runSwarm().catch(console.error);
