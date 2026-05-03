---
inclusion: always
---

# Carousa-AI — Project Overview

Carousa-AI is a SaaS web application that automates the production of AI-powered Instagram carousel posts. It targets faceless creators, aesthetic niche creators, and Instagram growth creators who need high-quality carousel content produced quickly and consistently.

## What the App Does

1. User creates a **Project** with a name, theme, and slide count (3–20).
2. AI generates a **Storyline** (via Google Gemini) and splits it into individual slide segments.
3. AI generates **Images** for each slide (via Stability AI SDXL) using structured prompts.
4. User edits slides in the **Editor** — text, emotion, scene — and can regenerate any individual slide.
5. AI generates an **Instagram Caption** with CTA and ≥10 hashtags.
6. User **Exports** all slide images as a ZIP file.

## Tech Stack

| Layer                | Technology                                        |
| -------------------- | ------------------------------------------------- |
| Framework            | Next.js 16.2.4 (App Router) + TypeScript          |
| Styling              | Tailwind CSS v4 + shadcn/ui                       |
| State Management     | Zustand v5                                        |
| Backend-as-a-Service | Supabase (Auth + PostgreSQL + Storage)            |
| Text AI              | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Image AI             | Stability AI SDXL 1.0 (REST API)                  |
| Testing              | Vitest + fast-check (property-based testing)      |
| ZIP Export           | jszip                                             |

## Architecture Pattern

**Modular Monolith** — business logic is organized into independent modules under `/modules`. Each module owns its domain and communicates through well-defined interfaces. This makes it easy to refactor into microservices later if needed.

## Key Design Decisions

- All AI operations are routed through `AI_Orchestrator` — never call providers directly from API routes.
- API keys (`GEMINI_API_KEY`, `STABILITY_API_KEY`) are server-side only — never exposed to the browser.
- Supabase Row Level Security (RLS) enforces data isolation at the database level.
- Every AI operation creates a `Generation_Record` for audit and debugging.
- Batch image generation is fail-graceful — one slide failure does not abort the rest.
- The app is designed for desktop and tablet (≥768px width).
