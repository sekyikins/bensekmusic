import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// All yt-dlp work now happens on the media server (Render), never on Vercel.
const MEDIA_SERVER_URL = process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || "http://localhost:3001";

// Generous timeout so a cold-started media server (Render free tier) can wake up.
const MEDIA_SERVER_TIMEOUT_MS = 50_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${MEDIA_SERVER_URL}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MEDIA_SERVER_TIMEOUT_MS),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Process (proxy) error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
