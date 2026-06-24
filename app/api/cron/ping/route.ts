import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/heartbeat`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: 1, pinged_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "Supabase unreachable", status: res.status, detail }, { status: 502 });
    }

    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Fetch failed", detail: String(err) }, { status: 502 });
  }
}
