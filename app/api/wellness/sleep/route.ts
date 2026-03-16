import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initWellnessTables, logSleep, getSleepHistory, getAvgSleepQuality } from "@/lib/wellness/db-wellness";
import { authenticate, respond } from "@/lib/api-middleware";

initDatabase();
initWellnessTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    const history = getSleepHistory(agentId);
    const quality = getAvgSleepQuality(agentId);
    return respond.success({ logs: history, averages: quality });
  } catch { return respond.serverError("Failed to get sleep data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (typeof body.sleep_start !== "number" || typeof body.sleep_end !== "number") {
      return respond.error("sleep_start and sleep_end (unix timestamps) required");
    }
    if (body.sleep_end <= body.sleep_start) {
      return respond.error("sleep_end must be after sleep_start");
    }
    if (body.quality !== undefined && (body.quality < 1 || body.quality > 10)) {
      return respond.error("quality must be 1-10");
    }

    const id = logSleep(body.agent_id, body.sleep_start, body.sleep_end, body.quality, body.notes);
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log sleep"); }
}
