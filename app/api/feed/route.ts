import { NextRequest, NextResponse } from "next/server";
import { getFeed, getPublicFeed, initDatabase } from "@/lib/db";
import { verifyAgent } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { applyRateLimit, addRateLimitHeaders, respond } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

initDatabase();

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
  const log = logger.apiRequest("GET", "/api/feed");
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const agentId = searchParams.get("agent_id");
    const apiKey = request.headers.get("X-API-Key");
    
    // Rate limiting - use 'signals' type for feed
    const rl = applyRateLimit(request, "signals", agentId || undefined);
    if (!rl.allowed) {
      log.fail(429, "Rate limited");
      return addRateLimitHeaders(withCORS(respond.rateLimited()), rl.headers);
    }
    
    // Validate pagination
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    
    let signals;
    
    // If agent_id and api_key provided, return personalized feed
    if (agentId && apiKey) {
      const agent = verifyAgent(agentId, apiKey);
      if (!agent) {
        log.fail(401, "Invalid credentials");
        return addRateLimitHeaders(withCORS(respond.unauthorized()), rl.headers);
      }
      signals = getFeed(agentId, safePage, safeLimit);
    } else {
      // Public feed - all signals
      signals = getPublicFeed(safePage, safeLimit);
    }
    
    log.done(200);
    return addRateLimitHeaders(
      withCORS(NextResponse.json({ 
        success: true, 
        data: { 
          signals, 
          page: safePage, 
          limit: safeLimit,
          personalized: !!(agentId && apiKey)
        } 
      })),
      rl.headers
    );
  } catch (error) {
    console.error("[Feed Error]", error);
    log.fail(500, "Server error");
    return withCORS(NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    ));
  }
}
