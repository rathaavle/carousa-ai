// ============================================================
// Carousa-AI: Project Module
// ============================================================
// Handles all project management operations: listing, fetching,
// creating, and deleting projects. Cascade delete is handled by
// the database ON DELETE CASCADE constraints, but this module
// also validates ownership before every mutation.
// ============================================================

import { createClient } from "@/lib/db/server";
import {
  getProjects as dbGetProjects,
  getProjectById,
  createProject as dbCreateProject,
  deleteProject as dbDeleteProject,
} from "@/lib/db/queries";
import {
  validateProjectName,
  validateSlideCount,
} from "@/lib/utils/validation";
import { AuthorizationError, ValidationError } from "@/lib/utils/errors";
import type { Project, CreateProjectInput } from "@/lib/db/types";

// ============================================================
// Pure Utilities (exported for testing)
// ============================================================

/**
 * Sorts an array of projects by `updated_at` in descending order
 * (most recently updated first). Returns a new array — does not mutate input.
 *
 * Requirements: 2.1
 */
export function sortProjectsByUpdatedAt(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

// ============================================================
// Public API
// ============================================================

/**
 * Returns all projects owned by `userId`, sorted by `updated_at` descending
 * (most recently updated first).
 *
 * Requirements: 2.1
 */
export async function getProjects(userId: string): Promise<Project[]> {
  const supabase = await createClient();
  // The query helper already orders by updated_at DESC
  return dbGetProjects(supabase, userId);
}

/**
 * Returns a single project by `id` that belongs to `userId`.
 * Throws `AuthorizationError` if the project does not exist or is owned by
 * a different user (prevents resource enumeration).
 *
 * Requirements: 2.3, 1.7
 */
export async function getProject(id: string, userId: string): Promise<Project> {
  const supabase = await createClient();
  const project = await getProjectById(supabase, id, userId);

  if (!project) {
    throw new AuthorizationError(
      "Project tidak ditemukan atau Anda tidak memiliki akses.",
    );
  }

  return project;
}

/**
 * Creates a new project for `userId` after validating the input.
 * Throws `ValidationError` for invalid name or slide count.
 *
 * Requirements: 2.3, 2.4, 3.4, 3.5
 */
export async function createProject(
  userId: string,
  data: CreateProjectInput,
): Promise<Project> {
  // Validate name
  const nameResult = validateProjectName(data.name);
  if (!nameResult.valid) {
    throw new ValidationError(nameResult.error!, "name");
  }

  // Validate slide count
  const slideResult = validateSlideCount(data.total_slides);
  if (!slideResult.valid) {
    throw new ValidationError(slideResult.error!, "total_slides");
  }

  const supabase = await createClient();
  return dbCreateProject(supabase, userId, data);
}

/**
 * Deletes a project (and all its slides / generation records via CASCADE)
 * after verifying that `userId` owns the project.
 * Throws `AuthorizationError` if the project does not exist or is not owned
 * by `userId`.
 *
 * Requirements: 2.6, 1.7
 */
export async function deleteProject(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Verify ownership before deleting
  const project = await getProjectById(supabase, id, userId);
  if (!project) {
    throw new AuthorizationError(
      "Project tidak ditemukan atau Anda tidak memiliki akses.",
    );
  }

  // Cascade delete is handled by the database (ON DELETE CASCADE on slides
  // and generations tables), so a single delete on projects is sufficient.
  await dbDeleteProject(supabase, id, userId);
}
