"use client";

// ============================================================
// Carousa-AI: DashboardClient Component
// ============================================================
// Client-side interactive layer for the Dashboard. Manages the
// project list via ProjectStore, handles project creation via
// ProjectForm modal, and navigates to individual projects.
//
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 14.3
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ui/ProjectCard";
import ProjectForm from "@/components/forms/ProjectForm";
import { useProjectStore } from "@/lib/stores/project-store";
import type { Theme, Project } from "@/lib/db/types";

// ── Props ─────────────────────────────────────────────────────

interface DashboardClientProps {
  /** Initial project list from the server (SSR). */
  initialProjects: Project[];
  /** Available themes for the ProjectForm. */
  themes: Theme[];
}

// ── Component ─────────────────────────────────────────────────

export default function DashboardClient({
  initialProjects,
  themes,
}: DashboardClientProps) {
  const router = useRouter();
  const {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    deleteProject,
  } = useProjectStore();

  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Hydrate the store with SSR data on first render, then keep it fresh
  useEffect(() => {
    // Seed the store with server-rendered data to avoid a loading flash
    useProjectStore.setState({ projects: initialProjects });
    // Then fetch fresh data in the background
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────

  const handleCreate = useCallback(
    async (data: {
      name: string;
      theme_id: string | null;
      total_slides: number;
    }) => {
      const newProject = await createProject(data);
      setShowForm(false);
      // Navigate to the new project's editor
      router.push(`/editor/${newProject.id}`);
    },
    [createProject, router],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteProject(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteProject],
  );

  const handleCardClick = useCallback(
    (id: string) => {
      router.push(`/editor/${id}`);
    },
    [router],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      {/* Project creation modal */}
      {showForm && (
        <ProjectForm
          themes={themes}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola semua project carousel Anda.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => setShowForm(true)}
          className="shrink-0 min-h-[44px] min-w-[44px]"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M8 2v12M2 8h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden sm:inline">Buat Project Baru</span>
          <span className="sm:hidden">Baru</span>
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && projects.length === 0 && (
        <div
          aria-label="Memuat daftar project…"
          className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl border border-border bg-muted/40 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-20 px-6 text-center">
          <div
            aria-hidden="true"
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7 text-muted-foreground"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 5V3M16 5V3M3 9h18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Belum ada project
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Buat project pertama Anda untuk mulai memproduksi konten carousel
            dengan AI.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => setShowForm(true)}
            className="min-h-[44px]"
          >
            Buat Project Pertama
          </Button>
        </div>
      )}

      {/* Project grid — responsive: 1 col on mobile/tablet (≤1024px), 2 on desktop, 3 on wide desktop */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
              onClick={handleCardClick}
              isDeleting={deletingId === project.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
