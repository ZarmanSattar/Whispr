import { NextRequest, NextResponse } from "next/server";

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&language=en-US&encoding=opus&container=webm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const audioBuffer = await req.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data received" },
        { status: 400, headers: corsHeaders }
      );
    }

    const deepgramRes = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm;codecs=opus",
      },
      body: audioBuffer,
    });

    if (!deepgramRes.ok) {
      const error = await deepgramRes.text();
      return NextResponse.json(
        { error: `Deepgram error: ${error}` },
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await deepgramRes.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    return NextResponse.json(
      { transcript },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
