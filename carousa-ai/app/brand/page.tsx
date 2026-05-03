// ============================================================
// Carousa-AI: Brand Profile Page (/app/brand)
// ============================================================
// Server component that fetches the current user's Brand Profile
// and renders the interactive BrandProfileForm client component.
//
// Requirements: 9.1, 9.3, 9.4
// ============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { getBrandProfile } from "@/modules/brand";
import BrandProfileForm from "./BrandProfileForm";

export const metadata = {
  title: "Brand Profile — Carousa-AI",
  description: "Atur identitas visual brand Anda untuk konten carousel",
};

export default async function BrandProfilePage() {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch existing brand profile (may be null for new users)
  let initialProfile = null;
  try {
    initialProfile = await getBrandProfile(user.id);
  } catch {
    // Non-fatal: form will render with empty defaults
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Brand Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur identitas visual brand Anda. Profil ini digunakan AI untuk
            menghasilkan gambar yang konsisten di semua project.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <BrandProfileForm initialProfile={initialProfile} />
        </div>

        {/* Info note */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Perubahan pada Brand Profile akan diterapkan pada operasi pembuatan
          dan regenerasi gambar berikutnya.
        </p>
      </div>
    </main>
  );
}
