"use client";

// ============================================================
// Carousa-AI: EditorToolbar Component
// ============================================================
// Toolbar for the Editor page with:
//   - Generate Storyline button
//   - Generate Semua Gambar button with progress bar
//   - Generate Caption button + editable caption textarea
//   - Salin Caption button with toast confirmation
//   - Ekspor ZIP button
//
// Requirements: 4.5, 7.4, 10.3, 10.4, 11.4
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { Slide } from "@/lib/db/types";

// ── Props ─────────────────────────────────────────────────────

interface EditorToolbarProps {
  projectId: string;
}

// ── Toast helper ──────────────────────────────────────────────

interface ToastState {
  message: string;
  type: "success" | "error";
}

// ── Component ─────────────────────────────────────────────────

export default function EditorToolbar({ projectId }: EditorToolbarProps) {
  const {
    slides,
    setSlides,
    setGenerationStatus,
    generationStatus,
    updateSlide,
  } = useEditorStore();

  // ── Local state ───────────────────────────────────────────

  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [caption, setCaption] = useState("");
  const [isCaptionPanelOpen, setIsCaptionPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfirm, setExportConfirm] = useState<{
    slidesWithoutImages: number;
    totalSlides: number;
  } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Toast helper ──────────────────────────────────────────

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  // ── Generate Storyline ────────────────────────────────────

  async function handleGenerateStory() {
    if (isGeneratingStory) return;
    setIsGeneratingStory(true);
    setGenerationStatus("processing");

    try {
      const res = await fetch("/api/ai/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const body = (await res.json()) as {
        slides?: Slide[];
        error?: string;
      };

      if (!res.ok) {
        showToast(body.error ?? "Gagal menghasilkan storyline.", "error");
        setGenerationStatus("failed");
        return;
      }

      if (body.slides) {
        setSlides(body.slides);
      }
      setGenerationStatus("success");
      showToast("Storyline berhasil dibuat!");
    } catch {
      showToast("Terjadi kesalahan jaringan. Silakan coba lagi.", "error");
      setGenerationStatus("failed");
    } finally {
      setIsGeneratingStory(false);
    }
  }

  // ── Generate All Images ───────────────────────────────────

  async function handleGenerateImages() {
    if (isGeneratingImages) return;
    setIsGeneratingImages(true);
    setImageProgress({ completed: 0, total: slides.length });

    try {
      const res = await fetch("/api/ai/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const body = (await res.json()) as {
        completed?: number;
        failed?: number;
        total?: number;
        slides?: Slide[];
        error?: string;
      };

      if (!res.ok) {
        showToast(body.error ?? "Gagal menghasilkan gambar.", "error");
        return;
      }

      // Update slides with new image URLs
      if (body.slides) {
        body.slides.forEach((s) => updateSlide(s.id, s));
      }

      setImageProgress({
        completed: body.completed ?? 0,
        total: body.total ?? slides.length,
      });

      const failed = body.failed ?? 0;
      if (failed > 0) {
        showToast(
          `${body.completed} dari ${body.total} gambar berhasil dibuat. ${failed} gagal.`,
          "error",
        );
      } else {
        showToast(`Semua ${body.total} gambar berhasil dibuat!`);
      }
    } catch {
      showToast("Terjadi kesalahan jaringan. Silakan coba lagi.", "error");
    } finally {
      setIsGeneratingImages(false);
      // Keep progress visible briefly then clear
      setTimeout(() => setImageProgress(null), 4000);
    }
  }

  // ── Generate Caption ──────────────────────────────────────

  async function handleGenerateCaption() {
    if (isGeneratingCaption) return;
    setIsGeneratingCaption(true);
    setIsCaptionPanelOpen(true);

    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const body = (await res.json()) as {
        caption?: string;
        error?: string;
      };

      if (!res.ok) {
        showToast(body.error ?? "Gagal menghasilkan caption.", "error");
        return;
      }

      setCaption(body.caption ?? "");
    } catch {
      showToast("Terjadi kesalahan jaringan. Silakan coba lagi.", "error");
    } finally {
      setIsGeneratingCaption(false);
    }
  }

  // ── Copy Caption ──────────────────────────────────────────

  async function handleCopyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      showToast("Caption berhasil disalin ke clipboard!");
    } catch {
      showToast("Gagal menyalin caption. Coba salin secara manual.", "error");
    }
  }

  // ── Export ZIP ────────────────────────────────────────────

  async function handleExport(confirm = false) {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const url = `/api/export/${projectId}${confirm ? "?confirm=true" : ""}`;
      const res = await fetch(url);

      // Check if confirmation is required
      if (res.headers.get("content-type")?.includes("application/json")) {
        const body = (await res.json()) as {
          requiresConfirmation?: boolean;
          slidesWithoutImages?: number;
          totalSlides?: number;
          error?: string;
        };

        if (body.requiresConfirmation) {
          setExportConfirm({
            slidesWithoutImages: body.slidesWithoutImages ?? 0,
            totalSlides: body.totalSlides ?? slides.length,
          });
          setIsExporting(false);
          return;
        }

        if (!res.ok) {
          showToast(body.error ?? "Gagal mengekspor project.", "error");
          setIsExporting(false);
          return;
        }
      }

      if (!res.ok) {
        showToast("Gagal mengekspor project.", "error");
        setIsExporting(false);
        return;
      }

      // Trigger file download
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      // Extract filename from Content-Disposition header if available
      const disposition = res.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      a.download = filenameMatch?.[1] ?? `carousa-export-${projectId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      showToast("File ZIP berhasil diunduh!");
    } catch {
      showToast("Terjadi kesalahan jaringan. Silakan coba lagi.", "error");
    } finally {
      setIsExporting(false);
      setExportConfirm(null);
    }
  }

  const isGlobalProcessing = generationStatus === "processing";

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`
            fixed bottom-4 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg
            transition-all animate-in fade-in slide-in-from-bottom-2
            ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-destructive text-destructive-foreground"
            }
          `}
        >
          {toast.type === "success" ? (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M3 8l3.5 3.5L13 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 5v3.5M8 10.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Export confirmation dialog */}
      {exportConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-lg">
            <h2
              id="export-confirm-title"
              className="text-base font-semibold text-foreground mb-2"
            >
              Ekspor dengan slide kosong?
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {exportConfirm.slidesWithoutImages} dari{" "}
              {exportConfirm.totalSlides} slide tidak memiliki gambar dan akan
              dilewati. Lanjutkan ekspor?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setExportConfirm(null)}
                className="min-w-[80px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => handleExport(true)}
                className="min-w-[80px]"
              >
                Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Caption panel */}
      {isCaptionPanelOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Caption Instagram
              </h2>
              <button
                type="button"
                onClick={() => setIsCaptionPanelOpen(false)}
                aria-label="Tutup panel caption"
                className="
                  flex h-8 w-8 items-center justify-center rounded-lg
                  text-muted-foreground hover:bg-muted hover:text-foreground
                  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                "
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

            {isGeneratingCaption ? (
              <div className="flex items-center justify-center py-8 gap-3">
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
                <span className="text-sm text-muted-foreground">
                  Menghasilkan caption…
                </span>
              </div>
            ) : (
              <>
                <textarea
                  id="caption-textarea"
                  rows={8}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption akan muncul di sini setelah di-generate…"
                  aria-label="Caption Instagram"
                  className="
                    w-full rounded-lg border border-input bg-background px-3 py-2
                    text-sm text-foreground placeholder:text-muted-foreground
                    outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30
                    resize-none
                  "
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCaption}
                    disabled={isGeneratingCaption}
                    className="flex-1 min-h-[44px] gap-1.5"
                  >
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
                    Regenerasi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCopyCaption}
                    disabled={!caption}
                    className="flex-1 min-h-[44px] gap-1.5"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <rect
                        x="5"
                        y="5"
                        width="9"
                        height="9"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.25"
                      />
                      <path
                        d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                    </svg>
                    Salin Caption
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toolbar buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Generate Storyline */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateStory}
          disabled={isGeneratingStory || isGlobalProcessing}
          aria-label="Generate Storyline"
          className="min-h-[44px] gap-1.5 whitespace-nowrap"
        >
          {isGeneratingStory ? (
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
                d="M2 4h12M2 8h8M2 12h5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isGeneratingStory ? "Generating…" : "Generate Storyline"}
          </span>
        </Button>

        {/* Generate All Images */}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateImages}
            disabled={isGeneratingImages || isGlobalProcessing}
            aria-label="Generate Semua Gambar"
            className="min-h-[44px] gap-1.5 whitespace-nowrap"
          >
            {isGeneratingImages ? (
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
              </svg>
            )}
            <span className="hidden sm:inline">
              {isGeneratingImages ? "Generating…" : "Generate Gambar"}
            </span>
          </Button>

          {/* Progress bar */}
          {imageProgress && (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div
                role="progressbar"
                aria-valuenow={imageProgress.completed}
                aria-valuemin={0}
                aria-valuemax={imageProgress.total}
                aria-label={`${imageProgress.completed} dari ${imageProgress.total} slide selesai`}
                className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width:
                      imageProgress.total > 0
                        ? `${(imageProgress.completed / imageProgress.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {imageProgress.completed}/{imageProgress.total}
              </span>
            </div>
          )}
        </div>

        {/* Generate Caption */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateCaption}
          disabled={isGeneratingCaption || isGlobalProcessing}
          aria-label="Generate Caption"
          className="min-h-[44px] gap-1.5 whitespace-nowrap"
        >
          {isGeneratingCaption ? (
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
                d="M2 3h12v8H9l-3 2v-2H2V3z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isGeneratingCaption ? "Generating…" : "Caption"}
          </span>
        </Button>

        {/* Export ZIP */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleExport(false)}
          disabled={isExporting || isGlobalProcessing}
          aria-label="Ekspor ZIP"
          className="min-h-[44px] gap-1.5 whitespace-nowrap"
        >
          {isExporting ? (
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
                d="M8 2v8M5 7l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 11v1.5A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5V11"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isExporting ? "Mengekspor…" : "Ekspor ZIP"}
          </span>
        </Button>
      </div>
    </>
  );
}
