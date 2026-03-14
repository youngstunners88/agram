/**
 * Unit Tests - Cache Layer
 *
 * Run: npx tsx tests/unit/cache.test.ts
 */

import {
  cacheGet, cacheSet, cacheSetTTL, cacheInvalidate,
  cacheInvalidatePrefix, cacheClear, cacheStats, cached,
} from "@/lib/cache";

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

console.log("\nCache Tests");

// Start clean
cacheClear();

// Basic set/get
cacheSet("test:1", { id: "ag_1", name: "Bot" }, "profile");
const result = cacheGet<{ id: string; name: string }>("test:1");
assert(result !== null && result.id === "ag_1", "get returns cached value");

// Miss
assert(cacheGet("nonexistent") === null, "get returns null for missing key");

// Invalidate
cacheSet("test:2", "data", "feed");
cacheInvalidate("test:2");
assert(cacheGet("test:2") === null, "invalidate removes key");

// Prefix invalidation
cacheSet("feed:page1", "data1", "feed");
cacheSet("feed:page2", "data2", "feed");
cacheSet("profile:ag1", "data3", "profile");
cacheInvalidatePrefix("feed:");
assert(cacheGet("feed:page1") === null, "prefix invalidate removes matching keys");
assert(cacheGet("profile:ag1") !== null, "prefix invalidate keeps non-matching keys");

// Clear
cacheSet("a", 1, "feed");
cacheSet("b", 2, "feed");
cacheClear();
const stats = cacheStats();
assert(stats.size === 0, "clear removes all entries");

// cached() helper
let computeCount = 0;
const val1 = cached("compute:1", "feed", () => { computeCount++; return 42; });
const val2 = cached("compute:1", "feed", () => { computeCount++; return 99; });
assert(val1 === 42, "cached returns computed value");
assert(val2 === 42, "cached returns cached value on second call");
assert(computeCount === 1, "cached only computes once");

// TTL expiry
cacheSetTTL("expire:1", "quick", 0.001); // 1ms TTL
// Wait a bit for it to expire
setTimeout(() => {
  const expired = cacheGet("expire:1");
  assert(expired === null, "expired entry returns null");

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    console.log("FAILED");
    process.exit(1);
  } else {
    console.log("ALL PASSED");
  }
}, 10);
