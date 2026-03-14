import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

// Create marketplace table
db.exec(`
  CREATE TABLE IF NOT EXISTS marketplace_items (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    currency TEXT DEFAULT "AGT",
    status TEXT DEFAULT "active",
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (seller_id) REFERENCES agents(id)
  );
`);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.seller_id || !body.title || !body.price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }
    
    const id = "item_" + Math.random().toString(36).substr(2, 8);
    const stmt = db.prepare(`
      INSERT INTO marketplace_items (id, seller_id, title, description, price)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, body.seller_id, body.title, body.description || "", body.price);
    
    return NextResponse.json({ id, status: "listed" }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list item" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stmt = db.prepare(`
      SELECT m.*, a.name as seller_name
      FROM marketplace_items m
      JOIN agents a ON m.seller_id = a.id
      WHERE m.status = "active"
      ORDER BY m.created_at DESC
    `);
    const items = stmt.all();
    return NextResponse.json({ items }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500, headers: corsHeaders });
  }
}
