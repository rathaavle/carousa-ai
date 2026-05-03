"use client";

// ============================================================
// Carousa-AI: SlideStrip Component
// ============================================================
// Displays the ordered list of slides with thumbnail, slide
// number, and image status. Supports drag-and-drop reorder
// via the HTML5 Drag and Drop API.
//
// Requirements: 5.1, 5.4, 5.5
// ============================================================

import { useRef, useState } from "react";
import Image from "next/image";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { Slide } from "@/lib/db/types";

// ── Helpers ───────────────────────────────────────────────────

function getImageStatusLabel(
  slide: Slide,
  processingStatus: string,
): { label: string; color: string } {
  if (processingStatus === "processing") {
    return {
      label: "Sedang diproses",
      color: "text-amber-600 dark:text-amber-400",
    };
  }
  if (processingStatus === "failed") {
    return { label: "Gagal", color: "text-destructive" };
  }
  if (slide.image_url) {
    return {
      label: "Sudah selesai",
      color: "text-green-600 dark:text-green-400",
    };
  }
  return { label: "Belum dibuat", color: "text-muted-foreground" };
}

// ── Props ─────────────────────────────────────────────────────

interface SlideStripProps {
  slides: Slide[];
  activeSlideId: string | null;
}

// ── Component ─────────────────────────────────────────────────

export default function SlideStrip({ slides, activeSlideId }: SlideStripProps) {
  const { setActiveSlide, reorderSlides, slideGenerationStatus } =
    useEditorStore();

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Drag handlers ─────────────────────────────────────────

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent drag image to avoid the default ghost
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, toIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === toIndex) return;
    reorderSlides(fromIndex, toIndex).catch(() => {
      // Error is stored in EditorStore; UI will show it via error banner
    });
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  // ── Render ────────────────────────────────────────────────

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Belum ada slide. Generate storyline terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    /* On mobile/tablet: horizontal flex row; on desktop: vertical flex column */
    <ol
      aria-label="Daftar slide"
      className="flex flex-row lg:flex-col gap-2 p-2 lg:p-3"
    >
      {slides.map((slide, index) => {
        const isActive = slide.id === activeSlideId;
        const genStatus = slideGenerationStatus[slide.id] ?? "idle";
        const { label: statusLabel, color: statusColor } = getImageStatusLabel(
          slide,
          genStatus,
        );
        const isDragOver = dragOverIndex === index;

        return (
          <li key={slide.id} className="shrink-0 lg:shrink">
            <div
              role="button"
              tabIndex={0}
              aria-label={`Slide ${index + 1}${isActive ? " (aktif)" : ""}`}
              aria-pressed={isActive}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveSlide(slide.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSlide(slide.id);
                }
              }}
              className={`
                relative flex flex-col gap-1.5 rounded-lg border p-1.5 cursor-pointer
                transition-all select-none
                min-w-[80px] lg:min-w-0 w-20 lg:w-full min-h-[44px]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                }
                ${isDragOver ? "border-primary border-dashed bg-primary/10 scale-[1.02]" : ""}
              `}
            >
              {/* Drag handle indicator */}
              <div
                aria-hidden="true"
                className="absolute top-1 right-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing"
              >
                <svg viewBox="0 0 10 16" fill="none" className="h-3 w-2.5">
                  <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                  <circle cx="7" cy="3" r="1.2" fill="currentColor" />
                  <circle cx="3" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="7" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="3" cy="13" r="1.2" fill="currentColor" />
                  <circle cx="7" cy="13" r="1.2" fill="currentColor" />
                </svg>
              </div>

              {/* Thumbnail */}
              <div className="relative w-full aspect-square rounded overflow-hidden bg-muted flex items-center justify-center">
                {genStatus === "processing" ? (
                  /* Loading spinner */
                  <div
                    aria-label="Sedang memproses gambar"
                    className="flex items-center justify-center w-full h-full"
                  >
                    <svg
                      className="h-5 w-5 animate-spin text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                ) : slide.image_url ? (
                  <Image
                    src={slide.image_url}
                    alt={`Thumbnail slide ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  /* Placeholder */
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6 text-muted-foreground/40"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3 15l5-5 4 4 3-3 6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </div>

              {/* Slide number */}
              <span className="text-[10px] font-semibold text-foreground leading-none text-center">
                {index + 1}
              </span>

              {/* Status label — hidden on mobile to save space, shown on desktop */}
              <span
                className={`hidden lg:block text-[9px] leading-none text-center truncate ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
