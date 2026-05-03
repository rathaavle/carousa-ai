// ============================================================
// Carousa-AI: Dashboard Page (/app/dashboard)
// ============================================================
// Server component. Verifies authentication, fetches the initial
// project list and available themes server-side, then renders
// the interactive DashboardClient component.
//
// Requirements: 2.1, 2.7, 14.3
// ============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { getProjects } from "@/modules/project";
import { getThemes } from "@/lib/db/queries";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard — Carousa-AI",
  description: "Kelola semua project carousel Anda",
};

export default async function DashboardPage() {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial data server-side for fast first paint
  const [initialProjects, themes] = await Promise.all([
    getProjects(user.id).catch(() => []),
    getThemes(supabase).catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DashboardClient initialProjects={initialProjects} themes={themes} />
      </div>
    </main>
  );
}
