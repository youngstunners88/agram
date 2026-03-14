#!/bin/bash
# ROUND 2: Database Stress Test
echo "🟠 ROUND 2: Database Stress Test Starting..."
mkdir -p /tmp/stress-test

cat > /tmp/stress-test/db-stress.ts << 'STRESS'
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./stress-test.db");
db.pragma("journal_mode = WAL");

// Create tables
[truncated]
);
  } catch (e) {
    errors++;
  }
}

const concurrentTime = Date.now() - concurrentStart;

console.log("\n=== RESULTS ===");
console.log(`Sequential: ${sequentialTime}ms (${sequentialCount} inserts)`);
console.log(`Concurrent: ${concurrentTime}ms (${concurrentCount} inserts, ${errors} errors)`);
console.log(`Race conditions: ${raceCount}`);

STRESS
echo "Round 2 stress test created"
