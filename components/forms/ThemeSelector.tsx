"use client";

// ============================================================
// Carousa-AI: ThemeSelector Component
// ============================================================
// Displays a list of available themes with their attributes
// (name, mood, color base, lighting). Emits the selected theme
// ID to the parent form. Shows a confirmation dialog when the
// user changes the theme on a project that already has slides.
//
// Requirements: 3.1, 3.2, 3.3
// ============================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/db/types";

// ── Props ─────────────────────────────────────────────────────

interface ThemeSelectorProps {
  /** All available themes fetched from the server. */
  themes: Theme[];
  /** Currently selected theme ID (controlled). */
  value: string | null;
  /** Called when the user confirms a theme selection. */
  onChange: (themeId: string | null) => void;
  /**
   * When true, changing the theme will show a confirmation dialog
   * warning the user that existing slides will be affected.
   * Set this to true when the project already has slides.
   */
  hasExistingSlides?: boolean;
  /** Disables all interactions (e.g. while a form is submitting). */
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export default function ThemeSelector({
  themes,
  value,
  onChange,
  hasExistingSlides = false,
  disabled = false,
}: ThemeSelectorProps) {
  // Pending theme change that needs confirmation
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);

  function handleSelect(themeId: string) {
    if (disabled) return;
    if (themeId === value) return; // no-op if already selected

    if (hasExistingSlides) {
      // Show confirmation before applying the change
      setPendingThemeId(themeId);
    } else {
      onChange(themeId);
    }
  }

  function confirmChange() {
    if (pendingThemeId !== null) {
      onChange(pendingThemeId);
    }
    setPendingThemeId(null);
  }

  function cancelChange() {
    setPendingThemeId(null);
  }

  return (
    <>
      {/* Confirmation dialog */}
      {pendingThemeId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-change-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-lg">
            <h2
              id="theme-change-dialog-title"
              className="text-base font-semibold text-foreground mb-2"
            >
              Ubah Tema?
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Mengubah tema akan mempengaruhi hasil regenerasi slide berikutnya.
              Slide yang sudah ada tidak akan berubah secara otomatis.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={cancelChange}
                className="min-w-[80px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={confirmChange}
                className="min-w-[80px]"
              >
                Ubah Tema
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Theme grid */}
      <div
        role="radiogroup"
        aria-label="Pilih tema"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {themes.map((theme) => {
          const isSelected = value === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => handleSelect(theme.id)}
              className={`
                group relative flex flex-col gap-2 rounded-xl border p-4 text-left
                transition-all outline-none min-h-[44px]
                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:pointer-events-none disabled:opacity-50
                ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    className="h-3 w-3"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

              {/* Theme name */}
              <span className="text-sm font-semibold text-foreground pr-6">
                {theme.name}
              </span>

              {/* Mood */}
              <span className="text-xs text-muted-foreground italic">
                {theme.mood}
              </span>

              {/* Attributes row */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {/* Color base */}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <span aria-hidden="true">🎨</span>
                  {theme.color_base}
                </span>
                {/* Lighting */}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <span aria-hidden="true">💡</span>
                  {theme.lighting}
                </span>
              </div>
            </button>
          );
        })}

        {themes.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-6">
            Belum ada tema tersedia.
          </p>
        )}
      </div>
    </>
  );
}
