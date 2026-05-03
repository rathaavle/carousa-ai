# Carousa-AI

AI-powered Instagram carousel production tool. Generate storylines, images, and captions for carousel posts using Google Gemini and Stability AI.

## What It Does

1. Create a **Project** with a name, theme, and slide count (3–20 slides).
2. Generate a **Storyline** — Gemini writes a narrative and splits it into slide segments.
3. Generate **Images** — Stability AI (SDXL) renders each slide using structured prompts.
4. **Edit** slides individually — text, emotion, scene — with auto-save and per-slide regeneration.
5. Generate an **Instagram Caption** with CTA and hashtags.
6. **Export** all slide images as a ZIP file.

## Tech Stack

- **Framework:** Next.js 16.2.4 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** Zustand v5
- **Backend:** Supabase (Auth + PostgreSQL + Storage)
- **Text AI:** Google Gemini 1.5 Flash
- **Image AI:** Stability AI SDXL 1.0
- **Testing:** Vitest + fast-check

## Getting Started

### 1. Install dependencies

```bash
cd carousa-ai
npm install
```

### 2. Configure environment variables

Create `carousa-ai/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
STABILITY_API_KEY=your_stability_api_key
```

Get Supabase keys from your project dashboard → Settings → API.
Get Gemini key from [Google AI Studio](https://aistudio.google.com).
Get Stability key from [Stability AI](https://platform.stability.ai).

### 3. Set up Supabase

Apply migrations in order via the Supabase SQL editor or CLI:

```bash
# Via Supabase CLI
supabase db push
```

Or manually run:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/seed.sql` (optional — seeds theme data)

Create a storage bucket named `slide-images` with **public** access.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm test             # Run all tests (single pass)
npm run test:watch   # Run tests in watch mode
```

## Project Structure

```
app/              # Next.js pages and API routes
modules/          # Server-side business logic
lib/              # Shared utilities, DB clients, AI providers, Zustand stores
components/       # React UI components
supabase/         # Database migrations and seed data
tests/            # Unit and integration tests
```

See `.kiro/steering/` for detailed documentation:

- `architecture.md` — full directory structure and layer responsibilities
- `data-models.md` — database schema and TypeScript types
- `ai-system.md` — AI providers, orchestrator, and prompt builder
- `api-reference.md` — all API endpoints with request/response shapes
- `coding-conventions.md` — TypeScript, error handling, and naming rules
- `environment-and-setup.md` — environment variables and setup guide

## Architecture

Modular Monolith with a Multi-LLM layer. All AI operations go through `AI_Orchestrator`. Business logic lives in `modules/`. API routes only authenticate, parse, and delegate.

```
Browser (React + Zustand)
  ↕
Next.js API Routes
  ↕
Modules (carousel, project, brand, export, image)
  ↕
AI_Orchestrator → GeminiProvider / StabilityProvider
  ↕
Supabase (PostgreSQL + Auth + Storage)
```

## Security

- All routes protected by Next.js middleware (redirects to `/login` if unauthenticated).
- Row Level Security (RLS) on all Supabase tables — users can only access their own data.
- AI API keys are server-side only and never exposed to the browser.
- Service role key is only used for storage operations in the export module.
