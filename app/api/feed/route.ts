import { NextRequest, NextResponse } from "next/server";
import { getFeed, initDatabase } from "@/lib/db";

initDatabase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    // Rate limiting: max 50 per request
    const safeLimit = Math.min(limit, 50);
    
    const signals = getFeed(page, safeLimit);
    return withCORS(NextResponse.json({ signals, page, limit: safeLimit }));
  } catch (error) {
    return withCORS(NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    ));
  }
}
