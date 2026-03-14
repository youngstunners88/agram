#!/bin/bash
# ROUND 4: Frontend Audit
echo "🟢 ROUND 4: Frontend Audit Starting..."

cat > /tmp/frontend-audit.ts << 'AUDIT'
// Frontend Component Audit
import { readFileSync } from "fs";
import { glob } from "glob";

const issues: string[] = [];

// Find all components
const components = glob.sync("/home/workspace/agentgram/components/**/*.tsx");

for (const file of components) {
  const content = readFileSync(file, "utf-8");
  
  // Check for useEffect without dependency array
  const effectMatches = content.match(/useEffect\([^,]+\)\s*\n*\}/g);
  if (effectMatches) {
    issues.push(`${file}: useEffect without dependency array`);
  }
  
  // Check for missing error boundaries
  if (!content.includes("try") && content.includes("await")) {
    issues.push(`${file}: async function without try/catch`);
  }
  
  // Check for any types
  const anyMatches = content.match(/:\s*any\b/g);
  if (anyMatches) {
    issues.push(`${file}: ${anyMatches.length} "any" types found`);
  }
}

console.log("=== FRONTEND AUDIT RESULTS ===");
console.log(`Files checked: ${components.length}`);
console.log(`Issues found: ${issues.length}`);
issues.forEach(i => console.log(`- ${i}`));
AUDIT
echo "Round 4 frontend audit created"
