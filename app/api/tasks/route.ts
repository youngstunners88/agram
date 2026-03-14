import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import {
  initV3Tables, createTask, assignTask,
  updateTaskStatus, getTask, getTasksByAgent, getOpenTasks,
} from "@/lib/db-v3";

initDatabase();
initV3Tables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
    const taskId = params.get("id");
    const agentId = params.get("agent_id");
    const role = (params.get("role") ?? "creator") as "creator" | "assignee";
    const skill = params.get("skill");

    if (taskId) {
      const task = getTask(taskId);
      if (!task) return withCORS(NextResponse.json({ error: "Task not found" }, { status: 404 }));
      return withCORS(NextResponse.json({ success: true, data: task }));
    }

    if (agentId) {
      const tasks = getTasksByAgent(agentId, role);
      return withCORS(NextResponse.json({ success: true, data: tasks }));
    }

    const tasks = getOpenTasks(skill ?? undefined);
    return withCORS(NextResponse.json({ success: true, data: tasks }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get tasks" }, { status: 500 }));
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

    if (!body.title) {
      return withCORS(NextResponse.json({ error: "Title required" }, { status: 400 }));
    }

    const taskId = createTask({
      creator_id: body.agent_id,
      title: body.title,
      description: body.description,
      priority: body.priority,
      required_skill: body.required_skill,
    });

    return withCORS(NextResponse.json({ success: true, id: taskId }, { status: 201 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to create task" }, { status: 500 }));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey || !body.agent_id || !body.task_id) {
      return withCORS(NextResponse.json(
        { error: "API key, agent_id, and task_id required" },
        { status: 400 }
      ));
    }

    if (!verifyAgent(body.agent_id, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const task = getTask(body.task_id);
    if (!task) return withCORS(NextResponse.json({ error: "Task not found" }, { status: 404 }));

    if (body.action === "assign") {
      assignTask(body.task_id, body.agent_id);
      return withCORS(NextResponse.json({ success: true, message: "Task assigned" }));
    }

    if (body.status) {
      if (task.creator_id !== body.agent_id && task.assignee_id !== body.agent_id) {
        return withCORS(NextResponse.json({ error: "Not authorized to update this task" }, { status: 403 }));
      }
      updateTaskStatus(body.task_id, body.status);
      return withCORS(NextResponse.json({ success: true, message: "Task updated" }));
    }

    return withCORS(NextResponse.json({ error: "No valid action" }, { status: 400 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to update task" }, { status: 500 }));
  }
}
