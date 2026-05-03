"use client";

// ============================================================
// Carousa-AI: EditorClient Component
// ============================================================
// Client-side interactive layer for the Editor page.
// Two-panel layout: left = SlideStrip, right = SlideEditor.
// Responsive: stacked on tablet (< lg), side-by-side on desktop.
//
// Requirements: 5.1, 14.2
// ============================================================

import { useEffect } from "react";
import { useEditorStore } from "@/lib/stores/editor-store";
import SlideStrip from "@/components/carousel/SlideStrip";
import SlideEditor from "@/components/editor/SlideEditor";
import EditorToolbar from "@/components/editor/EditorToolbar";
import type { Project, Slide } from "@/lib/db/types";

// ── Props ─────────────────────────────────────────────────────

interface EditorClientProps {
  initialProject: Project;
  initialSlides: Slide[];
}

// ── Component ─────────────────────────────────────────────────

export default function EditorClient({
  initialProject,
  initialSlides,
}: EditorClientProps) {
  const { project, slides, activeSlideId, error, clearError } =
    useEditorStore();

  // Hydrate the store with SSR data on first render
  useEffect(() => {
    const sorted = [...initialSlides].sort((a, b) => a.index - b.index);
    useEditorStore.setState({
      project: initialProject,
      slides: sorted,
      activeSlideId: sorted[0]?.id ?? null,
      generationStatus: "idle",
      slideGenerationStatus: {},
      error: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayProject = project ?? initialProject;
  const displaySlides =
    slides.length > 0
      ? slides
      : [...initialSlides].sort((a, b) => a.index - b.index);
  const displayActiveId = activeSlideId ?? displaySlides[0]?.id ?? null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar: project name + toolbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          {/* Back to dashboard */}
          <a
            href="/dashboard"
            aria-label="Kembali ke Dashboard"
            className="
              flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
              text-muted-foreground transition-colors
              hover:bg-muted hover:text-foreground
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            "
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          {/* Project name */}
          <h1 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
            {displayProject.name}
          </h1>

          {/* Toolbar */}
          <EditorToolbar projectId={displayProject.id} />
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Tutup pesan error"
            className="shrink-0 text-destructive/70 hover:text-destructive transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Two-panel layout */}
      {/* Responsive: stacked on tablet (flex-col), side-by-side on desktop (flex-row) */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left panel: SlideStrip */}
        {/* On mobile/tablet: horizontal scrollable strip at top */}
        {/* On desktop: fixed-width vertical strip on the left */}
        <aside
          aria-label="Daftar slide"
          className="
            lg:w-56 xl:w-64 shrink-0
            border-b lg:border-b-0 lg:border-r border-border
            bg-muted/20
            overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto
            lg:h-[calc(100vh-57px)]
          "
        >
          <SlideStrip slides={displaySlides} activeSlideId={displayActiveId} />
        </aside>

        {/* Right panel: SlideEditor */}
        <section
          aria-label="Editor slide"
          className="flex-1 overflow-y-auto lg:h-[calc(100vh-57px)] p-4 sm:p-6"
        >
          {displayActiveId ? (
            <SlideEditor
              slideId={displayActiveId}
              projectId={displayProject.id}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <p className="text-sm text-muted-foreground">
                Pilih slide dari panel kiri untuk mulai mengedit.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
