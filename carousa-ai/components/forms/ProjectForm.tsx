"use client";

// ============================================================
// Carousa-AI: ProjectForm Component
// ============================================================
// Modal form for creating a new project. Collects: project name,
// theme (via ThemeSelector), and slide count. Validates all
// fields before submitting to the ProjectStore.
//
// Requirements: 2.2, 2.3, 2.4, 3.1, 3.4, 3.5
// ============================================================

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import ThemeSelector from "@/components/forms/ThemeSelector";
import type { Theme } from "@/lib/db/types";

// ── Constants ─────────────────────────────────────────────────

const MIN_SLIDES = 3;
const MAX_SLIDES = 20;
const DEFAULT_SLIDES = 10;

// ── Props ─────────────────────────────────────────────────────

interface ProjectFormProps {
  /** Available themes to display in the ThemeSelector. */
  themes: Theme[];
  /** Called with the new project data when the form is submitted. */
  onSubmit: (data: {
    name: string;
    theme_id: string | null;
    total_slides: number;
  }) => Promise<void>;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function ProjectForm({
  themes,
  onSubmit,
  onClose,
}: ProjectFormProps) {
  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState<number>(DEFAULT_SLIDES);
  const [slideCountInput, setSlideCountInput] = useState(
    String(DEFAULT_SLIDES),
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [slideError, setSlideError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name input when the modal opens
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  // ── Validation ────────────────────────────────────────────

  function validateName(value: string): string | null {
    if (!value.trim()) {
      return "Nama project tidak boleh kosong.";
    }
    return null;
  }

  function validateSlideCount(value: number): string | null {
    if (!Number.isInteger(value) || value < MIN_SLIDES || value > MAX_SLIDES) {
      return `Jumlah slide harus antara ${MIN_SLIDES} dan ${MAX_SLIDES}.`;
    }
    return null;
  }

  function handleSlideCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setSlideCountInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setSlideCount(parsed);
      setSlideError(validateSlideCount(parsed));
    } else {
      setSlideError(
        `Jumlah slide harus antara ${MIN_SLIDES} dan ${MAX_SLIDES}.`,
      );
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    if (nameError) setNameError(validateName(e.target.value));
  }

  // ── Submit ────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const nErr = validateName(name);
    const sErr = validateSlideCount(slideCount);
    setNameError(nErr);
    setSlideError(sErr);
    if (nErr || sErr) return;

    startTransition(async () => {
      try {
        await onSubmit({
          name: name.trim(),
          theme_id: themeId,
          total_slides: slideCount,
        });
        // onSubmit is expected to close the modal on success
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal membuat project.";
        setSubmitError(message);
      }
    });
  }

  // ── Shared styles ─────────────────────────────────────────

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 min-h-[44px]";

  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2
            id="project-form-title"
            className="text-base font-semibold text-foreground"
          >
            Buat Project Baru
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            disabled={isPending}
            className="
              flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground
              hover:bg-muted hover:text-foreground transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              disabled:pointer-events-none disabled:opacity-50
            "
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <form
            id="project-form"
            onSubmit={handleSubmit}
            className="px-6 py-5 space-y-6"
          >
            {/* Project name */}
            <div>
              <label htmlFor="project-name" className={labelClass}>
                Nama Project{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </label>
              <input
                ref={nameInputRef}
                id="project-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setNameError(validateName(name))}
                placeholder="Contoh: Konten Mei 2025 — Mindset"
                className={`${inputClass} ${nameError ? "border-destructive focus:ring-destructive/30" : ""}`}
                disabled={isPending}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
                maxLength={120}
              />
              {nameError && (
                <p
                  id="name-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* Slide count */}
            <div>
              <label htmlFor="slide-count" className={labelClass}>
                Jumlah Slide{" "}
                <span className="text-muted-foreground font-normal">
                  ({MIN_SLIDES}–{MAX_SLIDES})
                </span>
              </label>
              <input
                id="slide-count"
                type="number"
                min={MIN_SLIDES}
                max={MAX_SLIDES}
                value={slideCountInput}
                onChange={handleSlideCountChange}
                onBlur={() => setSlideError(validateSlideCount(slideCount))}
                className={`${inputClass} ${slideError ? "border-destructive focus:ring-destructive/30" : ""}`}
                disabled={isPending}
                aria-invalid={!!slideError}
                aria-describedby={slideError ? "slide-error" : undefined}
              />
              {slideError && (
                <p
                  id="slide-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {slideError}
                </p>
              )}
            </div>

            {/* Theme selector */}
            <div>
              <p className={labelClass}>
                Tema{" "}
                <span className="text-muted-foreground font-normal">
                  (opsional)
                </span>
              </p>
              <ThemeSelector
                themes={themes}
                value={themeId}
                onChange={setThemeId}
                hasExistingSlides={false}
                disabled={isPending}
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
              >
                {submitError}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
            disabled={isPending}
            className="min-w-[80px]"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="project-form"
            size="lg"
            disabled={isPending}
            className="min-w-[140px]"
          >
            {isPending ? "Membuat…" : "Buat Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
