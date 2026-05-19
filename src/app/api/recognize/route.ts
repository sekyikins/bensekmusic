import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Use AudD API with the test token to perform real audio content analysis
    const auddData = new FormData();
    auddData.append('file', file);
    auddData.append('api_token', 'test');

    const auddResponse = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: auddData
    });

    const result = await auddResponse.json();

    if (result.status === 'success' && result.result) {
      const song = result.result;
      const query = `${song.artist} - ${song.title}`;
      return NextResponse.json({ identifiedQuery: query });
    }

    // Fallback if recognition fails (e.g., if the free test limit is hit, or silent audio)
    const query = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    
    // If the name is generic and recognition failed, inform the user
    if (/^record|^audio|^video|^untitled|^Voice|^WhatsApp/i.test(query)) {
       return NextResponse.json({ error: "Audio analysis failed (could not identify the song)." }, { status: 400 });
    }

    // If all else fails but the file has a recognizable name, try using it
    return NextResponse.json({ identifiedQuery: query });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Recognition error:", errorMessage);
    return NextResponse.json({ error: "Failed to process media file for recognition" }, { status: 500 });
  }
}
