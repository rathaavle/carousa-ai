# Carousa-AI

AI-powered Instagram carousel production tool. Generate storylines, images, and captions for carousel posts using Google Gemini.

## What It Does

1. Create a **Project** with a name, theme, and slide count (3–20 slides).
2. Generate a **Storyline** — Gemini writes a narrative and splits it into slide segments.
3. Generate **Images** — Pollinations AI renders each slide using structured prompts, with slide text overlaid on the image.
4. **Edit** slides individually — text, emotion, scene — with auto-save and per-slide regeneration.
5. Generate an **Instagram Caption** with CTA and hashtags.
6. **Export** all slide images as a ZIP file.

## Tech Stack

- **Framework:** Next.js 16.2.4 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** Zustand v5
- **Backend:** Supabase (Auth + PostgreSQL + Storage)
- **Text AI:** Google Gemini 2.5 Flash (`@google/genai`)
- **Image AI:** Pollinations AI (free, no API key required)
- **Image Processing:** sharp (text overlay)
- **Testing:** Vitest + fast-check

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

Get Supabase keys from your project dashboard → Settings → API.
Get Gemini key from [Google AI Studio](https://aistudio.google.com).

### 3. Set up Supabase

Apply migrations via the Supabase SQL editor:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/seed.sql` (optional — seeds theme data)

Create a storage bucket named `slide-images` with **public** access, then add storage policies:

```sql
CREATE POLICY "Authenticated users can upload slide images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'slide-images');

CREATE POLICY "Authenticated users can update slide images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'slide-images');

CREATE POLICY "Public can read slide images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'slide-images');

CREATE POLICY "Authenticated users can delete slide images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'slide-images');
```

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

## Architecture

Modular Monolith. All AI operations go through `AI_Orchestrator`. Business logic lives in `modules/`. API routes only authenticate, parse, and delegate.

```
Browser (React + Zustand)
  ↕
Next.js API Routes
  ↕
Modules (carousel, project, brand, export, image)
  ↕
AI_Orchestrator → GeminiProvider (text) / Pollinations AI (image)
  ↕
Supabase (PostgreSQL + Auth + Storage)
```

## Security

- All routes protected by Next.js proxy (redirects to `/login` if unauthenticated).
- Row Level Security (RLS) on all Supabase tables — users can only access their own data.
- Gemini API key is server-side only and never exposed to the browser.
- Service role key is only used for storage operations in the export module.
