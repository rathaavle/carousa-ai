"use client";

// ============================================================
// Carousa-AI: ProjectCard Component
// ============================================================
// Displays a summary card for a single project in the Dashboard
// grid. Shows: project name, theme, slide count, last updated
// time, and a delete button with confirmation.
//
// Requirements: 2.1, 2.5, 2.7
// ============================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/db/types";

// ── Helpers ───────────────────────────────────────────────────

/**
 * Formats a UTC ISO timestamp into a human-readable relative or
 * absolute date string in Indonesian locale.
 */
function formatUpdatedAt(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Props ─────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  /** Called when the user confirms deletion. */
  onDelete: (id: string) => void;
  /** Called when the card body is clicked (navigate to project). */
  onClick: (id: string) => void;
  /** Disables interactions while a delete is in flight. */
  isDeleting?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export default function ProjectCard({
  project,
  onDelete,
  onClick,
  isDeleting = false,
}: ProjectCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation(); // prevent card navigation
    setShowConfirm(true);
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setShowConfirm(false);
    onDelete(project.id);
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setShowConfirm(false);
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-dialog-${project.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-lg">
            <h2
              id={`delete-dialog-${project.id}`}
              className="text-base font-semibold text-foreground mb-2"
            >
              Hapus Project?
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              Project{" "}
              <span className="font-medium text-foreground">
                &ldquo;{project.name}&rdquo;
              </span>{" "}
              akan dihapus secara permanen beserta semua slide dan data
              terkaitnya.
            </p>
            <p className="text-sm text-destructive mb-5">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancelDelete}
                className="min-w-[80px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={handleConfirmDelete}
                className="min-w-[80px]"
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <article
        className={`
          group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5
          shadow-sm transition-all cursor-pointer
          hover:border-primary/40 hover:shadow-md
          focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
          ${isDeleting ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => onClick(project.id)}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1">
            {project.name}
          </h3>

          {/* Delete button */}
          <button
            type="button"
            aria-label={`Hapus project ${project.name}`}
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="
              shrink-0 flex h-8 w-8 items-center justify-center rounded-lg
              text-muted-foreground transition-colors
              hover:bg-destructive/10 hover:text-destructive
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              disabled:pointer-events-none disabled:opacity-50
              opacity-0 group-hover:opacity-100 focus-visible:opacity-100
            "
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l.8 9.2A.8.8 0 004.6 14h6.8a.8.8 0 00.8-.8L13 4"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Theme badge */}
        {project.theme ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {project.theme.name}
            </span>
            <span className="text-xs text-muted-foreground italic">
              {project.theme.mood}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Belum ada tema
          </span>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
          {/* Slide count */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
                d="M5 3V13M11 3V13"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
            {project.total_slides} slide
          </span>

          {/* Last updated */}
          <time
            dateTime={project.updated_at}
            className="text-xs text-muted-foreground"
            title={new Date(project.updated_at).toLocaleString("id-ID")}
          >
            {formatUpdatedAt(project.updated_at)}
          </time>
        </div>
      </article>
    </>
  );
}
