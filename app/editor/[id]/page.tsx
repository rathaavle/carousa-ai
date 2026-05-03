// ============================================================
// Carousa-AI: Editor Page (/app/editor/[id])
// ============================================================
// Server component. Verifies authentication, fetches the project
// and its slides server-side, then renders the interactive
// EditorClient component.
//
// Requirements: 5.1, 14.2
// ============================================================

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { getProjectById, getSlidesByProject } from "@/lib/db/queries";
import EditorClient from "./EditorClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: "Editor — Carousa-AI" };

  const project = await getProjectById(supabase, id, user.id).catch(() => null);
  return {
    title: project
      ? `${project.name} — Editor — Carousa-AI`
      : "Editor — Carousa-AI",
    description: "Edit dan kelola slide carousel Anda",
  };
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch project (validates ownership via user_id filter)
  const project = await getProjectById(supabase, id, user.id).catch(() => null);

  if (!project) {
    notFound();
  }

  // Fetch slides for the project
  const initialSlides = await getSlidesByProject(supabase, id).catch(() => []);

  return (
    <main className="min-h-screen bg-background">
      <EditorClient initialProject={project} initialSlides={initialSlides} />
    </main>
  );
}
