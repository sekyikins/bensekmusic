import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const MEDIA_SERVER_URL = process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || "http://localhost:3001";

function normalizeType(type: string | null): "audio" | "video" {
  return type === "video" ? "video" : "audio";
}

export async function POST(req: NextRequest) {
  try {
    const { url, type } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const mediaType = normalizeType(type);
    const res = await fetch(
      `${MEDIA_SERVER_URL}/api/download?url=${encodeURIComponent(url)}&type=${mediaType}`,
      { signal: AbortSignal.timeout(55_000) }
    );

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Prepare (start) error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Poll the current preparation status without starting a new download.
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    const type = normalizeType(req.nextUrl.searchParams.get("type"));

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDIA_SERVER_URL}/api/status?url=${encodeURIComponent(url)}&type=${type}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Prepare (status) error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
