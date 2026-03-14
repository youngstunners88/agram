import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import {
  initSwarmTables, createSwarm, getSwarm, listSwarms,
  joinSwarm, leaveSwarm, getSwarmMembers,
  createSwarmTask, assignSwarmTask, completeSwarmTask, getSwarmTasks,
  createProposal, castVote, getProposalResult, getProposals,
} from "@/lib/db-swarms";

initDatabase();
initSwarmTables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

function withCORS(res: NextResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const swarmId = params.get("id");
    const include = params.get("include");

    if (swarmId) {
      const swarm = getSwarm(swarmId);
      if (!swarm) return withCORS(NextResponse.json({ error: "Swarm not found" }, { status: 404 }));

      const data: Record<string, unknown> = { ...swarm };
      if (include === "members") data.members = getSwarmMembers(swarmId);
      if (include === "tasks") data.tasks = getSwarmTasks(swarmId);
      if (include === "proposals") data.proposals = getProposals(swarmId);
      if (include === "all") {
        data.members = getSwarmMembers(swarmId);
        data.tasks = getSwarmTasks(swarmId);
        data.proposals = getProposals(swarmId);
      }

      return withCORS(NextResponse.json({ success: true, data }));
    }

    const swarms = listSwarms();
    return withCORS(NextResponse.json({ success: true, data: swarms }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get swarms" }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey || !body.agent_id) {
      return withCORS(NextResponse.json({ error: "API key and agent_id required" }, { status: 400 }));
    }
    if (!verifyAgent(body.agent_id, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const action = body.action ?? "create";

    if (action === "create") {
      if (!body.name) return withCORS(NextResponse.json({ error: "name required" }, { status: 400 }));
      const id = createSwarm({ name: body.name, purpose: body.purpose, creatorId: body.agent_id, maxAgents: body.max_agents });
      return withCORS(NextResponse.json({ success: true, id }, { status: 201 }));
    }

    if (action === "join") {
      if (!body.swarm_id) return withCORS(NextResponse.json({ error: "swarm_id required" }, { status: 400 }));
      const result = joinSwarm(body.swarm_id, body.agent_id);
      if (!result.success) return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      return withCORS(NextResponse.json({ success: true }));
    }

    if (action === "leave") {
      if (!body.swarm_id) return withCORS(NextResponse.json({ error: "swarm_id required" }, { status: 400 }));
      leaveSwarm(body.swarm_id, body.agent_id);
      return withCORS(NextResponse.json({ success: true }));
    }

    if (action === "create_task") {
      if (!body.swarm_id || !body.description) {
        return withCORS(NextResponse.json({ error: "swarm_id and description required" }, { status: 400 }));
      }
      const taskId = createSwarmTask({ swarmId: body.swarm_id, description: body.description, reward: body.reward });
      return withCORS(NextResponse.json({ success: true, id: taskId }, { status: 201 }));
    }

    if (action === "assign_task") {
      if (!body.task_id || !body.assignee_id) {
        return withCORS(NextResponse.json({ error: "task_id and assignee_id required" }, { status: 400 }));
      }
      assignSwarmTask(body.task_id, body.assignee_id);
      return withCORS(NextResponse.json({ success: true }));
    }

    if (action === "complete_task") {
      if (!body.task_id || !body.result) {
        return withCORS(NextResponse.json({ error: "task_id and result required" }, { status: 400 }));
      }
      completeSwarmTask(body.task_id, body.result);
      return withCORS(NextResponse.json({ success: true }));
    }

    if (action === "propose") {
      if (!body.swarm_id || !body.title) {
        return withCORS(NextResponse.json({ error: "swarm_id and title required" }, { status: 400 }));
      }
      const propId = createProposal({
        swarmId: body.swarm_id, proposerId: body.agent_id,
        title: body.title, description: body.description,
        voteType: body.vote_type, durationHours: body.duration_hours,
      });
      return withCORS(NextResponse.json({ success: true, id: propId }, { status: 201 }));
    }

    if (action === "vote") {
      if (!body.proposal_id || !body.vote) {
        return withCORS(NextResponse.json({ error: "proposal_id and vote required" }, { status: 400 }));
      }
      castVote(body.proposal_id, body.agent_id, body.vote, body.weight);
      const result = getProposalResult(body.proposal_id);
      return withCORS(NextResponse.json({ success: true, data: result }));
    }

    return withCORS(NextResponse.json({ error: "Invalid action" }, { status: 400 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Swarm operation failed" }, { status: 500 }));
  }
}
