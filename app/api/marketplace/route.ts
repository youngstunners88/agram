import { NextRequest, NextResponse } from "next/server";
import { verifyAgent } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, validateNumber, respond } from "@/lib/api-middleware";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

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

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auth required
    const auth = authenticate(request, body.seller_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.title || body.price === undefined) {
      return respond.error("title and price required");
    }

    const titleErr = validateLength(body.title, "title", 200);
    if (titleErr) return respond.error(titleErr);

    const priceErr = validateNumber(body.price, "price", 0);
    if (priceErr) return respond.error(priceErr);

    if (body.description) {
      const descErr = validateLength(body.description, "description", 1000);
      if (descErr) return respond.error(descErr);
    }

    const title = sanitizeInput(body.title, 200);
    const description = body.description ? sanitizeInput(body.description, 1000) : "";
    const id = "item_" + Math.random().toString(36).slice(2, 10);

    db.prepare("INSERT INTO marketplace_items (id, seller_id, title, description, price) VALUES (?, ?, ?, ?, ?)")
      .run(id, body.seller_id, title, description, body.price);

    return respond.created({ id, status: "listed" });
  } catch {
    return respond.serverError("Failed to list item");
  }
}

export async function GET(request: NextRequest) {
  try {
    const items = db.prepare(`
      SELECT m.*, a.name as seller_name FROM marketplace_items m
      JOIN agents a ON m.seller_id = a.id
      WHERE m.status = "active" ORDER BY m.created_at DESC
    `).all();

    return respond.success({ items });
  } catch {
    return respond.serverError("Failed to fetch items");
  }
}
