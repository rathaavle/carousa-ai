"use client";

// ============================================================
// Carousa-AI: SlideEditor Component
// ============================================================
// Edits the text, emotion, and scene of the active slide.
// Auto-saves with a 1-second debounce after the user stops
// typing by calling PATCH /api/slides/[id].
//
// Requirements: 5.2, 5.3, 8.6
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/stores/editor-store";
import SlideCard from "./SlideCard";

// ── Props ─────────────────────────────────────────────────────

interface SlideEditorProps {
  slideId: string;
  projectId: string;
}

// ── Component ─────────────────────────────────────────────────

export default function SlideEditor({ slideId, projectId }: SlideEditorProps) {
  const { slides, updateSlideText, updateSlideEmotion, updateSlideScene } =
    useEditorStore();

  const slide = slides.find((s) => s.id === slideId);

  // Debounce timer refs — one per field
  const textTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (textTimerRef.current) clearTimeout(textTimerRef.current);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    };
  }, []);

  // ── Auto-save helper ──────────────────────────────────────

  const saveField = useCallback(
    async (field: "text" | "emotion" | "scene", value: string) => {
      try {
        const res = await fetch(`/api/slides/${slideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          console.error(
            `[SlideEditor] Failed to save ${field}:`,
            body.error ?? res.status,
          );
        }
      } catch (err) {
        console.error(`[SlideEditor] Network error saving ${field}:`, err);
      }
    },
    [slideId],
  );

  // ── Change handlers with debounce ─────────────────────────

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    updateSlideText(slideId, value);
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    textTimerRef.current = setTimeout(() => saveField("text", value), 1000);
  }

  function handleEmotionChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    updateSlideEmotion(slideId, value);
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    emotionTimerRef.current = setTimeout(
      () => saveField("emotion", value),
      1000,
    );
  }

  function handleSceneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    updateSlideScene(slideId, value);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    sceneTimerRef.current = setTimeout(() => saveField("scene", value), 1000);
  }

  // ── Render ────────────────────────────────────────────────

  if (!slide) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Slide tidak ditemukan.</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 min-h-[44px]";

  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Slide card preview */}
      <SlideCard slide={slide} projectId={projectId} />

      {/* Edit fields */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">
          Edit Slide {slides.findIndex((s) => s.id === slideId) + 1}
        </h2>

        {/* Text */}
        <div>
          <label htmlFor={`slide-text-${slideId}`} className={labelClass}>
            Teks Slide
          </label>
          <textarea
            id={`slide-text-${slideId}`}
            rows={4}
            value={slide.text ?? ""}
            onChange={handleTextChange}
            placeholder="Masukkan teks untuk slide ini…"
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tersimpan otomatis setelah Anda berhenti mengetik.
          </p>
        </div>

        {/* Emotion */}
        <div>
          <label htmlFor={`slide-emotion-${slideId}`} className={labelClass}>
            Emosi
          </label>
          <input
            id={`slide-emotion-${slideId}`}
            type="text"
            value={slide.emotion ?? ""}
            onChange={handleEmotionChange}
            placeholder="Contoh: hopeful, calm, energetic…"
            className={inputClass}
          />
        </div>

        {/* Scene */}
        <div>
          <label htmlFor={`slide-scene-${slideId}`} className={labelClass}>
            Scene / Deskripsi Visual
          </label>
          <input
            id={`slide-scene-${slideId}`}
            type="text"
            value={slide.scene ?? ""}
            onChange={handleSceneChange}
            placeholder="Contoh: woman sitting by a window with morning light…"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
