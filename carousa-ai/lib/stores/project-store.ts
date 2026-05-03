// ============================================================
// Carousa-AI: ProjectStore (Zustand)
// ============================================================
// Client-side state for the Dashboard. Manages the list of
// projects owned by the current user and exposes actions to
// fetch, create, and delete projects via the API layer.
//
// Requirements: 2.1, 2.3, 2.6
// ============================================================

import { create } from "zustand";
import type { Project, CreateProjectInput } from "@/lib/db/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ProjectStore {
  // ── State ──────────────────────────────────────────────────────────────
  /** All projects owned by the current user, sorted by updated_at DESC. */
  projects: Project[];
  /** True while any async operation is in flight. */
  isLoading: boolean;
  /** Last error message, if any. Cleared on the next successful operation. */
  error: string | null;

  // ── Actions ────────────────────────────────────────────────────────────
  /**
   * Fetch all projects for the current user from the API and update the
   * store. Projects are returned sorted by `updated_at` descending.
   *
   * Requirements: 2.1
   */
  fetchProjects: () => Promise<void>;

  /**
   * Create a new project and prepend it to the local list.
   * Returns the newly created project so callers can navigate to it.
   *
   * Requirements: 2.3
   */
  createProject: (data: CreateProjectInput) => Promise<Project>;

  /**
   * Delete a project by ID and remove it from the local list.
   * The API handles cascade deletion of slides and generation records.
   *
   * Requirements: 2.6
   */
  deleteProject: (id: string) => Promise<void>;

  /** Clear the current error state. */
  clearError: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────
  projects: [],
  isLoading: false,
  error: null,

  // ── Actions ─────────────────────────────────────────────────────────────

  fetchProjects: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/project");

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const projects = (await response.json()) as Project[];
      set({ projects, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat daftar project.";
      set({ isLoading: false, error: message });
    }
  },

  createProject: async (data: CreateProjectInput) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const newProject = (await response.json()) as Project;

      // Prepend the new project so it appears first (most recently updated).
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));

      return newProject;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal membuat project baru.";
      set({ isLoading: false, error: message });
      throw err; // Re-throw so the UI can handle it (e.g. show a form error).
    }
  },

  deleteProject: async (id: string) => {
    // Optimistic update: remove from list immediately.
    const previous = get().projects;
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));

    try {
      const response = await fetch(`/api/project/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Roll back optimistic update on failure.
        set({ projects: previous });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
    } catch (err) {
      // Ensure rollback even if JSON parsing fails.
      set({ projects: previous });
      const message =
        err instanceof Error ? err.message : "Gagal menghapus project.";
      set({ error: message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
