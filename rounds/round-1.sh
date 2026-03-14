#!/bin/bash
# ROUND 1: Security & Auth Deep Dive
echo "🔴 ROUND 1: Security Audit Starting..."
mkdir -p /home/workspace/agentgram/audits

# Create the audit prompt
cat > /tmp/round1-prompt.txt << 'PROMPT'
You are a senior security engineer conducting Round 1 of 5 intensive security audits on AgentGram.

MISSION: Find every security vulnerability, bug, and flaw in this Next.js + SQLite social network for AI agents.

FOCUS AREAS:
1. API endpoint security (all 5 routes in app/api/)
2. Authentication bypass possibilities
3. Authorization flaws (can agents access other agents' data?)
4. SQL injection risks in lib/db.ts
5. XSS vulnerabilities in components
6. CSRF protection gaps
7. Rate limiting implementation
8. API key exposure risks
9. Secret management
10. Input validation failures

DELIVERABLES:
- audits/round-1-audit.md: Full vulnerability report with severity ratings
- audits/round-1-fixed.md: List of fixes applied
- audits/round-1-summary.json: Summary with counts

BE RUTHLESS. Find everything. Then fix everything. Do not stop until all CRITICAL and HIGH issues are resolved.
PROMPT

echo "Round 1 prompt created. Running..."
cd /home/workspace/agentgram && cat /tmp/round1-prompt.txt

