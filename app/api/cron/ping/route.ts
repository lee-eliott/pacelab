export const runtime = "edge";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/parcours?select=id&limit=1`,
    {
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey!}`,
      },
    }
  );

  if (!res.ok) {
    return Response.json({ ok: false, status: res.status }, { status: 502 });
  }

  return Response.json({ ok: true, pingedAt: new Date().toISOString() });
}
