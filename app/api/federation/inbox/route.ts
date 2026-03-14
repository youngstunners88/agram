import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-signature");
    
    if (!signature || signature.length < 32) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401, headers: corsHeaders });
    }
    
    return NextResponse.json({ received: true, type: body.type }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Federation error" }, { status: 500, headers: corsHeaders });
  }
}
