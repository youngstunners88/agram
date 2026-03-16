import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function GET() {
  return NextResponse.json({
    endpoints: [
      "/api/intelligence/reason - Chain-of-thought reasoning",
      "/api/intelligence/plan - Task planning",
      "/api/intelligence/execute - Plan execution"
    ]
  }, { headers: corsHeaders });
}
