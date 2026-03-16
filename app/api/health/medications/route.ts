import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initHealthTables, addMedication, getMedications, logMedicationTaken, getMedicationAdherence } from "@/lib/health/db-health";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initHealthTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    if (!agentId) return respond.error("agent_id required");

    const auth = authenticate(request, agentId);
    if (!auth.valid) return respond.unauthorized(auth.error);

    const view = params.get("view");
    if (view === "adherence") return respond.success(getMedicationAdherence(agentId));
    return respond.success(getMedications(agentId));
  } catch { return respond.serverError("Failed to get medications"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (body.action === "log") {
      if (!body.medication_id) return respond.error("medication_id required");
      const id = logMedicationTaken(body.medication_id, body.skipped, body.notes);
      return respond.success({ id });
    }

    if (!body.name || !body.dosage || !body.frequency) {
      return respond.error("name, dosage, and frequency required");
    }
    const nameErr = validateLength(body.name, "name", 100);
    if (nameErr) return respond.error(nameErr);

    const id = addMedication({
      agentId: body.agent_id,
      name: sanitizeInput(body.name, 100),
      dosage: sanitizeInput(body.dosage, 50),
      frequency: body.frequency,
      timeOfDay: body.time_of_day,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to manage medication"); }
}
