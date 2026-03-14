import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { initSwarmTables, createSwarm, joinSwarm, vote, tallyVotes } from "@/lib/db-swarms";

initSwarmTables();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'create') {
      const id = createSwarm(body.name, body.purpose, body.agent_id, body.voting_mode);
      joinSwarm(id, body.agent_id, 'creator');
      return NextResponse.json({ id, success: true }, { status: 201, headers: corsHeaders });
    }
    
    if (body.action === 'join') {
      joinSwarm(body.swarm_id, body.agent_id, body.role || 'member');
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }
    
    if (body.action === 'vote') {
      vote(body.proposal_id, body.agent_id, body.vote);
      const passed = tallyVotes(body.proposal_id, body.voting_mode || 'majority');
      return NextResponse.json({ success: true, passed }, { headers: corsHeaders });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Swarm operation failed" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Swarm API - use POST with action parameter" }, { headers: corsHeaders });
}
