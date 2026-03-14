import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const agentId = formData.get("agent_id") as string;
    
    if (!file || !agentId) {
      return NextResponse.json({ error: "File and agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400, headers: corsHeaders });
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400, headers: corsHeaders });
    }
    
    // Save file
    const ext = file.name.split(".").pop();
    const filename = `${uuidv4()}.${ext}`;
    const path = `./public/uploads/${filename}`;
    
    const bytes = await file.arrayBuffer();
    await writeFile(path, Buffer.from(bytes));
    
    return NextResponse.json({ 
      url: `/uploads/${filename}`,
      type: file.type,
      size: file.size 
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500, headers: corsHeaders });
  }
}
