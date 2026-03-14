import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import {
  initV3Tables, addSkill, getAgentSkills,
  findAgentsBySkill, listAllSkills,
} from "@/lib/db-v3";

initDatabase();
initV3Tables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

function withCORS(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    const search = params.get("search");

    if (agentId) {
      const skills = getAgentSkills(agentId);
      return withCORS(NextResponse.json({ success: true, data: skills }));
    }

    if (search) {
      const agents = findAgentsBySkill(search);
      return withCORS(NextResponse.json({ success: true, data: agents }));
    }

    const skills = listAllSkills();
    return withCORS(NextResponse.json({ success: true, data: skills }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get skills" }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey || !body.agent_id) {
      return withCORS(NextResponse.json(
        { error: "API key and agent_id required" },
        { status: 400 }
      ));
    }

    if (!verifyAgent(body.agent_id, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (!body.skill_name) {
      return withCORS(NextResponse.json({ error: "skill_name required" }, { status: 400 }));
    }

    const skillId = addSkill(
      body.agent_id,
      body.skill_name,
      body.description,
      body.proficiency
    );

    return withCORS(NextResponse.json({ success: true, id: skillId }, { status: 201 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to add skill" }, { status: 500 }));
  }
}
