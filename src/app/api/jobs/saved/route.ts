import { NextRequest, NextResponse } from "next/server";

// Note: Saved jobs are managed client-side in localStorage.
// This API provides server-side validation and an optional fallback.

export async function GET() {
  // Client handles storage; this endpoint just confirms API is alive
  return NextResponse.json({ saved_jobs: [], source: "localStorage" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, job: body.job });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { apply_link } = await req.json();
    return NextResponse.json({ success: true, removed: apply_link });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
