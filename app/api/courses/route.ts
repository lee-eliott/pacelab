import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      date_course: body.date_course,
      duree_secondes: body.duree_secondes,
      parcours_id: body.parcours_id || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Liaison compagnons (many-to-many)
  if (body.compagnon_ids && body.compagnon_ids.length > 0) {
    const liaisons = body.compagnon_ids.map((cid: string) => ({
      course_id: course.id,
      compagnon_id: cid,
    }));
    await supabase.from("courses_compagnons").insert(liaisons);
  }

  return NextResponse.json(course);
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, date_course, duree_secondes, parcours_id, notes, compagnon_ids } = body;

  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  // Vérifier que la course appartient à l'utilisateur
  const { data: existing } = await supabase
    .from("courses")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { error } = await supabase
    .from("courses")
    .update({
      date_course,
      duree_secondes,
      parcours_id: parcours_id || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Remplace les compagnons : supprime puis réinsère
  await supabase.from("courses_compagnons").delete().eq("course_id", id);
  if (compagnon_ids && compagnon_ids.length > 0) {
    const liaisons = compagnon_ids.map((cid: string) => ({
      course_id: id,
      compagnon_id: cid,
    }));
    await supabase.from("courses_compagnons").insert(liaisons);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const { data: existing } = await supabase
    .from("courses")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  await supabase.from("courses_compagnons").delete().eq("course_id", id);
  await supabase.from("courses").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}