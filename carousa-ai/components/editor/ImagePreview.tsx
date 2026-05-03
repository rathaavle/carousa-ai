"use client";

// ============================================================
// Carousa-AI: ImagePreview Component
// ============================================================
// Displays a slide image with a loading indicator when
// processing. Click opens a full-size modal overlay.
//
// Requirements: 5.6, 7.4
// ============================================================

import { useState } from "react";
import Image from "next/image";

// ── Props ─────────────────────────────────────────────────────

interface ImagePreviewProps {
  imageUrl: string | null;
  alt: string;
  isProcessing?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export default function ImagePreview({
  imageUrl,
  alt,
  isProcessing = false,
}: ImagePreviewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // ── Render: processing state ──────────────────────────────

  if (isProcessing) {
    return (
      <div
        role="status"
        aria-label="Gambar sedang diproses"
        className="flex flex-col items-center justify-center w-full h-full gap-3 bg-muted"
      >
        <svg
          className="h-8 w-8 animate-spin text-primary"
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
        <span className="text-xs text-muted-foreground">Sedang diproses…</span>
      </div>
    );
  }

  // ── Render: no image placeholder ─────────────────────────

  if (!imageUrl) {
    return (
      <div
        aria-label="Gambar belum dibuat"
        className="flex flex-col items-center justify-center w-full h-full gap-2 bg-muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-10 w-10 text-muted-foreground/30"
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
        <span className="text-xs text-muted-foreground">
          Gambar belum dibuat
        </span>
      </div>
    );
  }

  // ── Render: image with click-to-expand ───────────────────

  return (
    <>
      {/* Thumbnail — clickable */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label={`Lihat ${alt} dalam ukuran penuh`}
        className="
          relative w-full h-full group
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          min-h-[44px] min-w-[44px]
        "
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity group-hover:opacity-90"
          unoptimized
        />
        {/* Expand icon overlay */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0 flex items-center justify-center
            bg-black/0 group-hover:bg-black/20 transition-colors
          "
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 text-white"
              aria-hidden="true"
            >
              <path
                d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Full-size modal overlay */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="Tutup preview gambar"
            className="
              absolute top-4 right-4 z-10
              flex h-11 w-11 items-center justify-center rounded-full
              bg-black/60 text-white
              hover:bg-black/80 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
            "
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-5 w-5"
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

          {/* Image container — stop propagation so clicking image doesn't close */}
          <div
            className="relative max-w-3xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imageUrl}
              alt={alt}
              fill
              sizes="(max-width: 1024px) 100vw, 768px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}
