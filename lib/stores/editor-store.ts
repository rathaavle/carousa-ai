// ============================================================
// Carousa-AI: EditorStore (Zustand)
// ============================================================
// Client-side state for the Editor page. Manages the active
// project, its slides, the currently selected slide, and the
// overall AI generation status.
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 8.1
// ============================================================

import { create } from "zustand";
import type { Project, Slide, GenerationStatus } from "@/lib/db/types";

// ── Types ─────────────────────────────────────────────────────────────────

/** Per-slide generation status used to show loading indicators. */
export type SlideGenerationStatus = "idle" | "processing" | "done" | "failed";

export interface EditorStore {
  // ── State ──────────────────────────────────────────────────────────────

  /** The project currently open in the editor. */
  project: Project | null;

  /** All slides for the current project, ordered by `index`. */
  slides: Slide[];

  /** ID of the slide currently selected/active in the editor panel. */
  activeSlideId: string | null;

  /**
   * Overall generation status for the project-level operations
   * (e.g. "Generate All Images", "Generate Storyline").
   */
  generationStatus: GenerationStatus;

  /**
   * Per-slide generation status map: slideId → status.
   * Used to show loading indicators on individual slides during
   * regeneration (Requirements 8.6).
   */
  slideGenerationStatus: Record<string, SlideGenerationStatus>;

  /** Last error message, if any. */
  error: string | null;

  // ── Actions ────────────────────────────────────────────────────────────

  /**
   * Load a project and its slides into the editor.
   * Resets all transient state (active slide, generation status, errors).
   */
  loadEditor: (projectId: string) => Promise<void>;

  /**
   * Set the active (selected) slide by ID.
   *
   * Requirements: 5.1
   */
  setActiveSlide: (id: string) => void;

  /**
   * Optimistically update the text of a slide in local state.
   * The caller is responsible for persisting the change to the API
   * (typically via a debounced save).
   *
   * Requirements: 5.2
   */
  updateSlideText: (id: string, text: string) => void;

  /**
   * Optimistically update the emotion of a slide in local state.
   *
   * Requirements: 5.3
   */
  updateSlideEmotion: (id: string, emotion: string) => void;

  /**
   * Optimistically update the scene of a slide in local state.
   *
   * Requirements: 5.3
   */
  updateSlideScene: (id: string, scene: string) => void;

  /**
   * Reorder slides by moving the slide at `fromIndex` to `toIndex`.
   * Updates the `index` field of all affected slides in local state and
   * persists the new order to the API.
   *
   * Requirements: 5.4
   */
  reorderSlides: (fromIndex: number, toIndex: number) => Promise<void>;

  /**
   * Trigger regeneration of a single slide's text or image.
   * Sets per-slide status to "processing" while the request is in flight,
   * then updates the slide with the new content on success.
   *
   * Requirements: 8.1
   */
  regenerateSlide: (id: string, type: "text" | "image") => Promise<void>;

  /** Update the overall generation status (used by toolbar actions). */
  setGenerationStatus: (status: GenerationStatus) => void;

  /** Replace the full slides array (used after server-side generation). */
  setSlides: (slides: Slide[]) => void;

  /** Update a single slide in the local state (e.g. after image generation). */
  updateSlide: (id: string, patch: Partial<Slide>) => void;

  /** Clear the current error state. */
  clearError: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Apply a reorder operation to a slides array.
 * Moves the element at `fromIndex` to `toIndex` and re-assigns sequential
 * `index` values so the result is always a permutation of {0, 1, …, N-1}.
 *
 * Property 10: Konsistensi Index Setelah Reorder
 */
export function applyReorder(
  slides: Slide[],
  fromIndex: number,
  toIndex: number,
): Slide[] {
  if (fromIndex === toIndex) return slides;
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slides.length ||
    toIndex >= slides.length
  ) {
    return slides;
  }

  // Work on a copy sorted by current index to ensure stable ordering.
  const sorted = [...slides].sort((a, b) => a.index - b.index);

  // Move the element.
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);

  // Re-assign sequential indices.
  return sorted.map((slide, i) => ({ ...slide, index: i }));
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────
  project: null,
  slides: [],
  activeSlideId: null,
  generationStatus: "idle",
  slideGenerationStatus: {},
  error: null,

  // ── Actions ─────────────────────────────────────────────────────────────

  loadEditor: async (projectId: string) => {
    set({
      generationStatus: "processing",
      error: null,
      activeSlideId: null,
      slideGenerationStatus: {},
    });

    try {
      // Fetch project and slides in parallel.
      const [projectRes, slidesRes] = await Promise.all([
        fetch(`/api/project/${projectId}`),
        fetch(`/api/slides/project/${projectId}`),
      ]);

      if (!projectRes.ok) {
        const body = (await projectRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${projectRes.status}`);
      }

      if (!slidesRes.ok) {
        const body = (await slidesRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${slidesRes.status}`);
      }

      const { project } = (await projectRes.json()) as { project: Project };
      const { slides } = (await slidesRes.json()) as { slides: Slide[] };

      // Sort slides by index to guarantee display order.
      const sorted = [...slides].sort((a, b) => a.index - b.index);

      set({
        project,
        slides: sorted,
        activeSlideId: sorted[0]?.id ?? null,
        generationStatus: "idle",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat editor.";
      set({ generationStatus: "failed", error: message });
    }
  },

  setActiveSlide: (id: string) => {
    set({ activeSlideId: id });
  },

  updateSlideText: (id: string, text: string) => {
    set((state) => ({
      slides: state.slides.map((s) =>
        s.id === id ? { ...s, text, updated_at: new Date().toISOString() } : s,
      ),
    }));
  },

  updateSlideEmotion: (id: string, emotion: string) => {
    set((state) => ({
      slides: state.slides.map((s) =>
        s.id === id
          ? { ...s, emotion, updated_at: new Date().toISOString() }
          : s,
      ),
    }));
  },

  updateSlideScene: (id: string, scene: string) => {
    set((state) => ({
      slides: state.slides.map((s) =>
        s.id === id ? { ...s, scene, updated_at: new Date().toISOString() } : s,
      ),
    }));
  },

  reorderSlides: async (fromIndex: number, toIndex: number) => {
    const { slides } = get();
    const reordered = applyReorder(slides, fromIndex, toIndex);

    // Optimistic update.
    set({ slides: reordered });

    try {
      const { project } = get();
      const updates = reordered.map((s) => ({ id: s.id, index: s.index }));

      const response = await fetch("/api/slides/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project?.id, slides: updates }),
      });

      if (!response.ok) {
        // Roll back on failure.
        set({ slides });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
    } catch (err) {
      // Ensure rollback even if JSON parsing fails.
      set({ slides });
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan urutan slide.";
      set({ error: message });
      throw err;
    }
  },

  regenerateSlide: async (id: string, type: "text" | "image") => {
    // Mark this slide as processing (Requirements 8.6).
    set((state) => ({
      slideGenerationStatus: {
        ...state.slideGenerationStatus,
        [id]: "processing",
      },
      error: null,
    }));

    try {
      const response = await fetch("/api/ai/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideId: id, type }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const updatedSlide = (await response.json()) as Slide;

      // Update the slide in local state with the regenerated content.
      set((state) => ({
        slides: state.slides.map((s) =>
          s.id === id ? { ...s, ...updatedSlide } : s,
        ),
        slideGenerationStatus: {
          ...state.slideGenerationStatus,
          [id]: "done",
        },
      }));
    } catch (err) {
      // On failure, preserve existing slide content (Requirements 8.5).
      const message =
        err instanceof Error ? err.message : "Gagal meregenerasi slide.";
      set((state) => ({
        slideGenerationStatus: {
          ...state.slideGenerationStatus,
          [id]: "failed",
        },
        error: message,
      }));
      throw err;
    }
  },

  setGenerationStatus: (status: GenerationStatus) => {
    set({ generationStatus: status });
  },

  setSlides: (slides: Slide[]) => {
    const sorted = [...slides].sort((a, b) => a.index - b.index);
    set({ slides: sorted });
  },

  updateSlide: (id: string, patch: Partial<Slide>) => {
    set((state) => ({
      slides: state.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  },

  clearError: () => set({ error: null }),
}));
