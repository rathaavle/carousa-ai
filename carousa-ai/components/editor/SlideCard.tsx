"use client";

// ============================================================
// Carousa-AI: SlideCard Component
// ============================================================
// Displays the text, emotion, scene, image (or placeholder),
// and regeneration buttons for a single slide.
//
// Requirements: 5.2, 5.3, 8.6
// ============================================================

import { useEditorStore } from "@/lib/stores/editor-store";
import ImagePreview from "./ImagePreview";
import { Button } from "@/components/ui/button";
import type { Slide } from "@/lib/db/types";

// ── Props ─────────────────────────────────────────────────────

interface SlideCardProps {
  slide: Slide;
  projectId: string;
}

// ── Component ─────────────────────────────────────────────────

export default function SlideCard({
  slide,
  projectId: _projectId,
}: SlideCardProps) {
  const { regenerateSlide, slideGenerationStatus, slides } = useEditorStore();

  const genStatus = slideGenerationStatus[slide.id] ?? "idle";
  const isProcessing = genStatus === "processing";
  const slideIndex = slides.findIndex((s) => s.id === slide.id);

  async function handleRegenerate(type: "text" | "image") {
    try {
      await regenerateSlide(slide.id, type);
    } catch {
      // Error is stored in EditorStore and shown via error banner
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Image area */}
      <div className="relative w-full aspect-square bg-muted">
        <ImagePreview
          imageUrl={slide.image_url}
          alt={`Gambar slide ${slideIndex + 1}`}
          isProcessing={isProcessing}
        />
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Slide number badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            Slide {slideIndex + 1}
          </span>
          {genStatus === "failed" && (
            <span className="text-xs text-destructive">Regenerasi gagal</span>
          )}
          {genStatus === "done" && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Berhasil diregenerasi
            </span>
          )}
        </div>

        {/* Text */}
        {slide.text && (
          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
            {slide.text}
          </p>
        )}

        {/* Emotion + Scene metadata */}
        <div className="flex flex-wrap gap-2">
          {slide.emotion && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
                <path
                  d="M5.5 9.5s.8 1.5 2.5 1.5 2.5-1.5 2.5-1.5M6 6.5h.01M10 6.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
              {slide.emotion}
            </span>
          )}
          {slide.scene && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
                <path
                  d="M1 10l4-4 3 3 2-2 5 5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="truncate max-w-[200px]">{slide.scene}</span>
            </span>
          )}
        </div>

        {/* Regeneration buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => handleRegenerate("text")}
            aria-label={`Regenerasi teks slide ${slideIndex + 1}`}
            className="flex-1 min-h-[44px] gap-1.5"
          >
            {isProcessing ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
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
            ) : (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="M2 8a6 6 0 1110.5-4M14 4v4h-4"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            Teks
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => handleRegenerate("image")}
            aria-label={`Regenerasi gambar slide ${slideIndex + 1}`}
            className="flex-1 min-h-[44px] gap-1.5"
          >
            {isProcessing ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
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
            ) : (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
                <path
                  d="M1 10l4-4 3 3 2-2 5 5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="5"
                  cy="6.5"
                  r="1"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
              </svg>
            )}
            Gambar
          </Button>
        </div>
      </div>
    </div>
  );
}
