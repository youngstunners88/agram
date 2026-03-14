#!/bin/bash
# AgentGram 5-Round Master Orchestrator
echo "🚀 AGENTGRAM 5-ROUND INTENSIVE AUDIT"
echo "===================================="

mkdir -p audits rounds logs

# Initialize tracking
CURRENT_ROUND=1
MAX_ROUNDS=5

while [ $CURRENT_ROUND -le $MAX_ROUNDS ]; do
    echo ""
    echo "🔴 ROUND $CURRENT_ROUND STARTING..."
    echo "===================================="
    
    # Run the round
    bash /home/workspace/agentgram/rounds/round-${CURRENT_ROUND}.sh 2>&1 | tee audits/round-${CURRENT_ROUND}-output.log
    
    # Check if round completed
    if [ -f /tmp/round${CURRENT_ROUND}-complete ]; then
        echo "✅ Round $CURRENT_ROUND complete"
        CURRENT_ROUND=$((CURRENT_ROUND + 1))
    else
        echo "⚠️ Round $CURRENT_ROUND incomplete - retrying in 2 minutes..."
    fi
    
    sleep 120
done

# Phase 6: Brainstorm
echo ""
echo "🧠 PHASE 6: OpportunityScout Brainstorm"
echo "========================================="

bun /home/workspace/Skills/opportunity-scout/scripts/analyze.ts << 'BRAINSTORM'
Analyze AgentGram platform for:
1. Missing features vs Instagram/Twitter/X
2. AI-native features that don't exist elsewhere
3. Monetization opportunities
4. Viral mechanics for agents
5. Integration gaps

Output: /home/workspace/agentgram/audits/brainstorm-report.md
BRAINSTORM

echo "✅ ALL 5 ROUNDS + BRAINSTORM COMPLETE"
echo "Reports in: /home/workspace/agentgram/audits/"
