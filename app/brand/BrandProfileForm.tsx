"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { BrandProfile } from "@/lib/db/types";

// ── Lighting options ──────────────────────────────────────────

const LIGHTING_OPTIONS = [
  { value: "", label: "Pilih pencahayaan…" },
  { value: "soft natural light", label: "Soft Natural Light" },
  { value: "golden hour", label: "Golden Hour" },
  { value: "studio lighting", label: "Studio Lighting" },
  { value: "dramatic shadows", label: "Dramatic Shadows" },
  { value: "neon glow", label: "Neon Glow" },
  { value: "candlelight", label: "Candlelight" },
  { value: "overcast diffused", label: "Overcast Diffused" },
  { value: "backlit silhouette", label: "Backlit Silhouette" },
];

// ── Texture options ───────────────────────────────────────────

const TEXTURE_OPTIONS = [
  { value: "", label: "Pilih tekstur…" },
  { value: "smooth matte", label: "Smooth Matte" },
  { value: "glossy sheen", label: "Glossy Sheen" },
  { value: "grainy film", label: "Grainy Film" },
  { value: "watercolor wash", label: "Watercolor Wash" },
  { value: "linen fabric", label: "Linen Fabric" },
  { value: "marble stone", label: "Marble Stone" },
  { value: "bokeh blur", label: "Bokeh Blur" },
  { value: "paper texture", label: "Paper Texture" },
];

// ── Props ─────────────────────────────────────────────────────

interface BrandProfileFormProps {
  initialProfile: BrandProfile | null;
}

// ── Component ─────────────────────────────────────────────────

export default function BrandProfileForm({
  initialProfile,
}: BrandProfileFormProps) {
  const [colorPalette, setColorPalette] = useState(
    initialProfile?.color_palette ?? "",
  );
  const [lighting, setLighting] = useState(initialProfile?.lighting ?? "");
  const [texture, setTexture] = useState(initialProfile?.texture ?? "");
  const [characterStyle, setCharacterStyle] = useState(
    initialProfile?.character_style ?? "",
  );
  const [styleLock, setStyleLock] = useState(
    initialProfile?.style_lock ?? false,
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Confirmation dialog state for Style Lock activation
  const [pendingStyleLock, setPendingStyleLock] = useState<boolean | null>(
    null,
  );

  // ── Style Lock toggle handler ─────────────────────────────

  function handleStyleLockChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (next) {
      // Show confirmation before enabling
      setPendingStyleLock(true);
    } else {
      setStyleLock(false);
    }
  }

  function confirmStyleLock() {
    setStyleLock(true);
    setPendingStyleLock(null);
  }

  function cancelStyleLock() {
    setPendingStyleLock(null);
  }

  // ── Save handler ──────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            color_palette: colorPalette.trim() || null,
            lighting: lighting || null,
            texture: texture || null,
            character_style: characterStyle.trim() || null,
            style_lock: styleLock,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setSaveError(
            data.error ?? "Gagal menyimpan brand profile. Silakan coba lagi.",
          );
          return;
        }

        setSaveSuccess(true);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch {
        setSaveError("Terjadi kesalahan jaringan. Silakan coba lagi.");
      }
    });
  }

  // ── Shared input class ────────────────────────────────────

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 min-h-[44px]";

  const selectClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 min-h-[44px] cursor-pointer";

  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      {/* Style Lock Confirmation Dialog */}
      {pendingStyleLock !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="style-lock-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-lg">
            <h2
              id="style-lock-dialog-title"
              className="text-base font-semibold text-foreground mb-2"
            >
              Aktifkan Style Lock?
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Semua prompt gambar berikutnya akan menyertakan gaya brand Anda
              (palet warna, pencahayaan, tekstur, dan gaya karakter) secara
              otomatis.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={cancelStyleLock}
                className="min-w-[80px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={confirmStyleLock}
                className="min-w-[80px]"
              >
                Aktifkan
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Color Palette */}
        <div>
          <label htmlFor="color-palette" className={labelClass}>
            Palet Warna
          </label>
          <textarea
            id="color-palette"
            rows={3}
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value)}
            placeholder="Contoh: pastel pink, soft beige, warm ivory, dusty rose"
            className={`${inputClass} resize-none`}
            disabled={isPending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Deskripsikan palet warna brand Anda. Gunakan nama warna atau kode
            hex.
          </p>
        </div>

        {/* Lighting */}
        <div>
          <label htmlFor="lighting" className={labelClass}>
            Pencahayaan
          </label>
          <select
            id="lighting"
            value={lighting}
            onChange={(e) => setLighting(e.target.value)}
            className={selectClass}
            disabled={isPending}
          >
            {LIGHTING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Texture */}
        <div>
          <label htmlFor="texture" className={labelClass}>
            Tekstur
          </label>
          <select
            id="texture"
            value={texture}
            onChange={(e) => setTexture(e.target.value)}
            className={selectClass}
            disabled={isPending}
          >
            {TEXTURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Character Style */}
        <div>
          <label htmlFor="character-style" className={labelClass}>
            Gaya Karakter
          </label>
          <textarea
            id="character-style"
            rows={3}
            value={characterStyle}
            onChange={(e) => setCharacterStyle(e.target.value)}
            placeholder="Contoh: minimalist faceless figure, soft feminine silhouette, abstract geometric shapes"
            className={`${inputClass} resize-none`}
            disabled={isPending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Deskripsikan gaya karakter atau subjek visual yang konsisten di
            konten Anda.
          </p>
        </div>

        {/* Style Lock Toggle */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-4">
            {/* Toggle */}
            <div className="shrink-0 mt-0.5 flex items-center min-h-[44px] min-w-[44px] justify-center">
              <button
                type="button"
                role="switch"
                aria-checked={styleLock}
                aria-label="Style Lock"
                onClick={() => {
                  if (!styleLock) {
                    setPendingStyleLock(true);
                  } else {
                    setStyleLock(false);
                  }
                }}
                disabled={isPending}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${styleLock ? "bg-primary" : "bg-input"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                    ${styleLock ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>

            {/* Label + description */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Style Lock
                </span>
                {styleLock && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Aktif
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Saat aktif, semua prompt gambar akan menyertakan gaya brand Anda
                secara otomatis untuk menjaga konsistensi visual.
              </p>
            </div>
          </div>

          {/* Hidden checkbox for form accessibility */}
          <input
            type="checkbox"
            id="style-lock-checkbox"
            checked={styleLock}
            onChange={handleStyleLockChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* Error message */}
        {saveError && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
          >
            {saveError}
          </p>
        )}

        {/* Success message */}
        {saveSuccess && (
          <p
            role="status"
            className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900"
          >
            Brand profile berhasil disimpan.
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto min-w-[160px]"
          disabled={isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan Brand Profile"}
        </Button>
      </form>
    </>
  );
}
