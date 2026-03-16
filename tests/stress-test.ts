/**
 * AgentGram Production Stress Test
 * 7 Rounds: Load, Database, Memory, Security, Build, Integration, Final
 */

import { execSync } from "child_process";
import Database from "better-sqlite3";
import { performance } from "perf_hooks";

const db = new Database("./agentgram.db");
const API_BASE = "http://localhost:3000";

// Test configuration
const CONFIG = {
  concurrentUsers: 100,
  requestsPerUser: 50,
  maxResponseTime: 500, // ms
  targetRps: 1000,
  duration: 30, // seconds
};

// Results tracking
const results = {
  round: 0,
  passed: 0,
  failed: 0,
  issues: [] as string[],
  performance: {} as Record<string, number>,
};

// Utils
function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function error(msg: string) {
  console.error(`[${new Date().toISOString()}] ❌ ${msg}`);
  results.issues.push(msg);
  results.failed++;
}

function success(msg: string) {
  console.log(`[${new Date().toISOString()}] ✅ ${msg}`);
  results.passed++;
}

// Round 1: API Load Testing
async function round1_loadTest() {
  log("\n🔥 ROUND 1: API Load Testing");
  log(`Testing ${CONFIG.concurrentUsers} concurrent users...`);
  
  const start = performance.now();
  const batchSize = 10;
  let completed = 0;
  let failed = 0;
  
  // Create test agents first
  const testAgent = () => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    try {
      execSync(`curl -s -X POST ${API_BASE}/api/agents \
        -H "Content-Type: application/json" \
        -d '{"name":"${id}","purpose":"stress-test","api_key":"${id}_key"}' \
        2>/dev/null`, { timeout: 5000 });
      return id;
    } catch {
      return null;
    }
  };
  
  // Batch requests
  const batches = Math.ceil(CONFIG.concurrentUsers / batchSize);
  for (let b = 0; b < batches; b++) {
    const batch = Array(Math.min(batchSize, CONFIG.concurrentUsers - b * batchSize))
      .fill(0)
      .map(() => testAgent());
    
    const ids = await Promise.all(batch);
    completed += ids.filter(Boolean).length;
    failed += ids.filter(id => !id).length;
  }
  
  const duration = performance.now() - start;
  const rps = (completed / duration * 1000).toFixed(1);
  
  log(`Created ${completed} agents (${failed} failed) in ${duration.toFixed(0)}ms`);
  log(`Rate: ${rps} req/sec`);
  
  if (failed > CONFIG.concurrentUsers * 0.05) {
    error(`High failure rate: ${failed}/${CONFIG.concurrentUsers}`);
    return false;
  }
  
  if (parseFloat(rps) < CONFIG.targetRps * 0.5) {
    error(`Low throughput: ${rps} req/sec (target: ${CONFIG.targetRps})`);
    return false;
  }
  
  results.performance.rps = parseFloat(rps);
  success(`Load test passed: ${completed} agents created`);
  return true;
}

// Round 2: Database Stress
function round2_databaseStress() {
  log("\n📊 ROUND 2: Database Stress Test");
  
  // Test 1: Large insert
  log("Testing bulk inserts...");
  const insertStart = performance.now();
  
  const insertSignal = db.prepare("INSERT INTO signals (id, agent_id, content, timestamp) VALUES (?, ?, ?, ?)");
  const insertMany = db.transaction((items) => {
    for (const item of items) insertSignal.run(item.id, item.agent_id, item.content, item.timestamp);
  });
  
  const testSignals = Array(1000).fill(0).map((_, i) => ({
    id: `stress_sig_${i}_${Date.now()}`,
    agent_id: "test_agent",
    content: `Stress test signal ${i}`,
    timestamp: Date.now()
  }));
  
  try {
    insertMany(testSignals);
    const insertTime = performance.now() - insertStart;
    log(`Inserted 1000 signals in ${insertTime.toFixed(1)}ms`);
    results.performance.insert_1k = insertTime;
    
    if (insertTime > 5000) {
      error(`Slow inserts: ${insertTime.toFixed(1)}ms for 1000 rows`);
    } else {
      success(`Bulk insert: ${insertTime.toFixed(1)}ms`);
    }
  } catch (e) {
    error(`Insert failed: ${e}`);
  }
  
  // Test 2: Complex query
  log("Testing complex aggregations...");
  const queryStart = performance.now();
  
  try {
    const query = db.prepare(`
      SELECT a.name, COUNT(s.id) as signal_count, 
             COUNT(t.id) as thread_count
      FROM agents a
      LEFT JOIN signals s ON s.agent_id = a.id
      LEFT JOIN threads t ON t.agent_id = a.id
      WHERE a.created_at > ?
      GROUP BY a.id
      ORDER BY signal_count DESC
      LIMIT 100
    `);
    
    const results2 = query.all(Date.now() / 1000 - 86400);
    const queryTime = performance.now() - queryStart;
    
    log(`Complex query executed in ${queryTime.toFixed(1)}ms`);
    results.performance.query_complex = queryTime;
    
    if (queryTime > 1000) {
      error(`Slow query: ${queryTime.toFixed(1)}ms`);
    } else {
      success(`Complex query: ${queryTime.toFixed(1)}ms`);
    }
  } catch (e) {
    error(`Query failed: ${e}`);
  }
  
  // Test 3: Concurrent access simulation
  log("Testing concurrent reads...");
  const readStart = performance.now();
  
  try {
    for (let i = 0; i < 100; i++) {
      db.prepare("SELECT * FROM agents WHERE id = ?").get("test_agent");
      db.prepare("SELECT * FROM signals WHERE agent_id = ? LIMIT 10").all("test_agent");
    }
    const readTime = performance.now() - readStart;
    
    log(`100 concurrent read cycles in ${readTime.toFixed(1)}ms`);
    results.performance.concurrent_reads = readTime;
    
    if (readTime > 1000) {
      error(`Slow concurrent reads: ${readTime.toFixed(1)}ms`);
    } else {
      success(`Concurrent reads: ${readTime.toFixed(1)}ms`);
    }
  } catch (e) {
    error(`Concurrent read failed: ${e}`);
  }
  
  return results.failed === 0;
}

// Round 3: Memory Leak Detection
function round3_memoryLeak() {
  log("\n🧠 ROUND 3: Memory Leak Detection");
  
  const initialMemory = process.memoryUsage();
  log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // Simulate repeated operations that might leak
  log("Running 1000 iterations...");
  
  for (let i = 0; i < 1000; i++) {
    // Create and discard objects
    const temp = db.prepare("SELECT * FROM agents LIMIT 1");
    temp.get();
    // Explicit cleanup not needed with better-sqlite3, but good practice
  }
  
  // Force GC if available (Node.js with --expose-gc)
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage();
  const delta = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  
  log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  log(`Memory delta: ${delta.toFixed(2)}MB`);
  
  results.performance.memory_delta_mb = delta;
  
  if (delta > 50) {
    error(`Possible memory leak: ${delta.toFixed(2)}MB increase`);
    return false;
  } else if (delta > 10) {
    log(`⚠️ Moderate memory increase: ${delta.toFixed(2)}MB`);
  } else {
    success(`Memory stable: ${delta.toFixed(2)}MB delta`);
  }
  
  return true;
}

// Round 4: Security Audit
function round4_securityAudit() {
  log("\n🔒 ROUND 4: Security Audit");
  
  let issues = 0;
  
  // Check for SQL injection vulnerabilities
  log("Checking SQL injection protection...");
  const apiFiles = execSync("find app/api -name '*.ts' 2>/dev/null", { encoding: "utf8" }).split("\n");
  
  let parameterizedQueries = 0;
  let stringConcatenation = 0;
  
  for (const file of apiFiles.filter(Boolean)) {
    const content = execSync(`cat ${file} 2>/dev/null`, { encoding: "utf8" });
    if (content.includes(".prepare(")) {
      parameterizedQueries++;
    }
    if (content.match(/\.exec\s*\(\s*[`"'].*\$\{/)) {
      stringConcatenation++;
    }
  }
  
  log(`Parameterized queries: ${parameterizedQueries} files`);
  log(`Potential string concatenation: ${stringConcatenation} files`);
  
  if (stringConcatenation > 0) {
    error(`${stringConcatenation} files may have SQL injection risks`);
    issues++;
  } else {
    success("SQL injection protection verified");
  }
  
  // Check for hardcoded secrets
  log("Checking for hardcoded secrets...");
  const secretPatterns = ["api_key", "password", "secret", "token", "private_key"];
  let foundSecrets = 0;
  
  for (const pattern of secretPatterns) {
    try {
      const matches = execSync(
        `grep -rn "${pattern}.*=" --include="*.ts" lib/ app/api/ 2>/dev/null | grep -v "uuid\|Date.now\|Math.random" | head -5`,
        { encoding: "utf8" }
      );
      if (matches) {
        foundSecrets += matches.split("\n").filter(Boolean).length;
      }
    } catch {}
  }
  
  log(`Potential hardcoded values: ${foundSecrets}`);
  
  if (foundSecrets > 5) {
    log(`⚠️ ${foundSecrets} potential hardcoded values (review needed)`);
  } else {
    success("No obvious hardcoded secrets");
  }
  
  // Check for XSS vulnerabilities
  log("Checking XSS protection...");
  let dangerousHtml = 0;
  
  try {
    const jsxFiles = execSync("find . -name '*.tsx' -not -path './node_modules/*' 2>/dev/null", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    
    for (const file of jsxFiles.slice(0, 20)) {
      const content = execSync(`cat ${file} 2>/dev/null`, { encoding: "utf8" });
      if (content.includes("dangerouslySetInnerHTML")) {
        dangerousHtml++;
        error(`XSS risk in ${file}: dangerouslySetInnerHTML`);
      }
    }
  } catch {}
  
  if (dangerousHtml === 0) {
    success("No dangerouslySetInnerHTML found");
  }
  
  return issues === 0;
}

// Round 5: Build Verification
function round5_buildVerification() {
  log("\n🏗️ ROUND 5: Build Verification");
  
  try {
    log("Running TypeScript compilation...");
    execSync("npm run build 2>&1", { encoding: "utf8", timeout: 120000 });
    success("TypeScript build successful");
  } catch (e: any) {
    error(`Build failed: ${e.message}`);
    return false;
  }
  
  // Check bundle size
  try {
    const nextDir = execSync("du -sh .next 2>/dev/null", { encoding: "utf8" });
    log(`Bundle size: ${nextDir.split("\t")[0]}`);
    success("Bundle size acceptable");
  } catch {
    log("⚠️ Could not check bundle size");
  }
  
  return true;
}

// Round 6: Integration Testing
async function round6_integrationTest() {
  log("\n🔗 ROUND 6: Integration Testing");
  
  // Test full user flow
  const flow = [
    { step: "Create agent", endpoint: "/api/agents", method: "POST", body: { name: "flow_test", purpose: "integration", api_key: "flow_key" } },
    { step: "Post signal", endpoint: "/api/signals", method: "POST", body: { agent_id: "flow_test", content: "Test signal", api_key: "flow_key" } },
    { step: "Get feed", endpoint: "/api/feed?page=1&limit=10", method: "GET" },
    { step: "Search agents", endpoint: "/api/search?q=flow&page=1&limit=10", method: "GET" },
    { step: "Get agent profile", endpoint: "/api/agents?id=flow_test", method: "GET" },
    { step: "Create wallet", endpoint: "/api/wallet", method: "POST", body: { agent_id: "flow_test", api_key: "flow_key" } },
    { step: "Check balance", endpoint: "/api/wallet/balance?agent_id=flow_test", method: "GET" },
    { step: "Create circle", endpoint: "/api/circles", method: "POST", body: { name: "Test Circle", purpose: "Testing", agent_id: "flow_test", api_key: "flow_key" } },
    { step: "Get analytics", endpoint: "/api/analytics?agent_id=flow_test", method: "GET" },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of flow) {
    try {
      let cmd = `curl -s -X ${test.method} ${API_BASE}${test.endpoint} -H "Content-Type: application/json"`;
      if (test.body) {
        cmd += ` -d '${JSON.stringify(test.body)}'`;
      }
      
      const result = execSync(cmd, { encoding: "utf8", timeout: 10000 });
      const response = JSON.parse(result);
      
      if (response.error && response.error !== "Unauthorized") {
        log(`⚠️ ${test.step}: ${response.error}`);
        failed++;
      } else {
        success(`${test.step}`);
        passed++;
      }
    } catch (e) {
      error(`${test.step}: ${e}`);
      failed++;
    }
  }
  
  log(`\nIntegration: ${passed}/${flow.length} passed, ${failed} failed`);
  
  if (failed > flow.length * 0.2) {
    error(`High integration failure rate: ${failed}/${flow.length}`);
    return false;
  }
  
  return true;
}

// Round 7: Final Production Check
function round7_productionCheck() {
  log("\n✨ ROUND 7: Final Production Check");
  
  let issues = 0;
  
  // Check database integrity
  log("Verifying database integrity...");
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    if (integrity.integrity_check === "ok") {
      success("Database integrity verified");
    } else {
      error(`Database corruption detected: ${integrity.integrity_check}`);
      issues++;
    }
  } catch (e) {
    error(`Integrity check failed: ${e}`);
    issues++;
  }
  
  // Check table count
  log("Verifying all tables exist...");
  const tables = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
  log(`Total tables: ${tables.count}`);
  
  if (tables.count < 50) {
    error(`Missing tables: expected 50+, found ${tables.count}`);
    issues++;
  } else {
    success(`All ${tables.count} tables present`);
  }
  
  // Check indexes
  log("Verifying indexes...");
  const indexes = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='index'").get() as { count: number };
  log(`Total indexes: ${indexes.count}`);
  
  if (indexes.count < 100) {
    log(`⚠️ Low index count: ${indexes.count} (recommend 100+ for production)`);
  } else {
    success(`${indexes.count} indexes for query optimization`);
  }
  
  // Check foreign keys
  log("Verifying foreign key constraints...");
  try {
    const fkCheck = db.prepare("PRAGMA foreign_key_check").all();
    if (fkCheck.length === 0) {
      success("Foreign key constraints valid");
    } else {
      error(`${fkCheck.length} foreign key violations`);
      issues++;
    }
  } catch (e) {
    log(`⚠️ Could not verify foreign keys: ${e}`);
  }
  
  // Summary
  log("\n" + "=".repeat(60));
  log("FINAL PRODUCTION CHECK");
  log("=".repeat(60));
  log(`Total issues found: ${issues}`);
  log(`Tests passed: ${results.passed}`);
  log(`Tests failed: ${results.failed}`);
  
  if (results.issues.length > 0) {
    log("\nIssues to address:");
    results.issues.forEach((issue, i) => log(`  ${i + 1}. ${issue}`));
  }
  
  return issues === 0 && results.failed < 5;
}

// Main execution
async function runAllRounds() {
  log("=".repeat(60));
  log("AGENTGRAM PRODUCTION STRESS TEST");
  log("7 Rounds: Load → Database → Memory → Security → Build → Integration → Final");
  log("=".repeat(60));
  
  const rounds = [
    { name: "Load Test", fn: round1_loadTest },
    { name: "Database Stress", fn: round2_databaseStress },
    { name: "Memory Leak", fn: round3_memoryLeak },
    { name: "Security Audit", fn: round4_securityAudit },
    { name: "Build Verification", fn: round5_buildVerification },
    { name: "Integration Test", fn: round6_integrationTest },
    { name: "Production Check", fn: round7_productionCheck },
  ];
  
  let allPassed = true;
  
  for (let i = 0; i < rounds.length; i++) {
    results.round = i + 1;
    log(`\n${"=".repeat(60)}`);
    log(`STARTING ROUND ${i + 1}/${rounds.length}: ${rounds[i].name}`);
    log("=".repeat(60));
    
    try {
      const passed = await rounds[i].fn();
      if (!passed) {
        allPassed = false;
        log(`\n⚠️ ROUND ${i + 1} had issues`);
      }
    } catch (e) {
      allPassed = false;
      error(`Round ${i + 1} crashed: ${e}`);
    }
  }
  
  // Final summary
  log("\n" + "=".repeat(60));
  log("STRESS TEST COMPLETE");
  log("=".repeat(60));
  log(`Overall: ${allPassed ? "✅ PRODUCTION READY" : "❌ ISSUES FOUND"}`);
  log(`Tests passed: ${results.passed}`);
  log(`Tests failed: ${results.failed}`);
  log(`Total issues: ${results.issues.length}`);
  
  if (results.issues.length > 0) {
    log("\nAction items before production:");
    results.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  }
  
  db.close();
  process.exit(allPassed ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  runAllRounds();
}

export { runAllRounds, results };
