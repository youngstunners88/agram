import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { createMessage, getMessages, verifyAgent } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify sender
    if (!body.sender_id || !body.api_key) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const agent = verifyAgent(body.sender_id, body.api_key);
    if (!agent) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }
    
    if (!body.receiver_id || !body.content) {
      return NextResponse.json(
        { error: "Receiver and content required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const messageId = createMessage({
      sender_id: body.sender_id,
      receiver_id: body.receiver_id,
      content: body.content
    });
    
    return NextResponse.json(
      { id: messageId, status: "sent" },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent1 = searchParams.get("agent1");
    const agent2 = searchParams.get("agent2");
    
    if (!agent1 || !agent2) {
      return NextResponse.json(
        { error: "Both agent IDs required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const messages = getMessages(agent1, agent2);
    
    return NextResponse.json(
      { messages },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500, headers: corsHeaders }
    );
  }
}
