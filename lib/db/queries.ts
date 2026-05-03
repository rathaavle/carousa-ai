import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  Slide,
  BrandProfile,
  Generation,
  Theme,
  CreateProjectInput,
  BrandProfileInput,
  UpdateSlideInput,
} from "./types";

// ============================================================
// Theme Queries
// ============================================================

export async function getThemes(supabase: SupabaseClient): Promise<Theme[]> {
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getThemeById(
  supabase: SupabaseClient,
  id: string,
): Promise<Theme | null> {
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

// ============================================================
// Project Queries
// ============================================================

export async function getProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, theme:themes(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProjectById(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, theme:themes(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: userId })
    .select("*, theme:themes(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateProjectTimestamp(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================
// Slide Queries
// ============================================================

export async function getSlidesByProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("slides")
    .select("*")
    .eq("project_id", projectId)
    .order("index");

  if (error) throw error;
  return data ?? [];
}

export async function upsertSlides(
  supabase: SupabaseClient,
  slides: Omit<Slide, "created_at" | "updated_at">[],
): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("slides")
    .upsert(slides, { onConflict: "project_id,index" })
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function updateSlide(
  supabase: SupabaseClient,
  id: string,
  input: UpdateSlideInput,
): Promise<Slide> {
  const { data, error } = await supabase
    .from("slides")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSlideOrder(
  supabase: SupabaseClient,
  updates: { id: string; index: number }[],
): Promise<void> {
  // Update each slide's index individually
  const promises = updates.map(({ id, index }) =>
    supabase
      .from("slides")
      .update({ index, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  const results = await Promise.all(promises);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw firstError;
}

// ============================================================
// Brand Profile Queries
// ============================================================

export async function getBrandProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function upsertBrandProfile(
  supabase: SupabaseClient,
  userId: string,
  input: BrandProfileInput,
): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .upsert(
      { ...input, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// Generation Record Queries
// ============================================================

export async function createGenerationRecord(
  supabase: SupabaseClient,
  record: Omit<Generation, "id" | "created_at" | "updated_at">,
): Promise<Generation> {
  const { data, error } = await supabase
    .from("generations")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGenerationRecord(
  supabase: SupabaseClient,
  id: string,
  update: Partial<Pick<Generation, "status" | "error_msg" | "metadata">>,
): Promise<void> {
  const { error } = await supabase
    .from("generations")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
