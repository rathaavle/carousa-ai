---
inclusion: always
---

# Carousa-AI — Environment & Setup

## Required Environment Variables

All variables live in `carousa-ai/.env.local`. Never commit this file.

| Variable                        | Description                             | Where to get it                             |
| ------------------------------- | --------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                    | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server-only) | Supabase dashboard → Project Settings → API |
| `GEMINI_API_KEY`                | Google Gemini API key                   | Google AI Studio                            |
| `STABILITY_API_KEY`             | Stability AI API key                    | Stability AI platform                       |

`NEXT_PUBLIC_*` variables are safe to expose to the browser. All others are server-side only and must never appear in client-side code.

## Local Development Setup

```bash
# 1. Install dependencies
cd carousa-ai
npm install

# 2. Copy and fill in environment variables
cp .env.local.example .env.local   # or create .env.local manually

# 3. Run database migrations in Supabase
# Apply supabase/migrations/001_initial_schema.sql
# Apply supabase/migrations/002_rls_policies.sql
# Apply supabase/seed.sql (optional — seeds theme data)

# 4. Create the storage bucket in Supabase
# Bucket name: slide-images
# Access: Public (for public image URLs in the editor)

# 5. Start the development server
npm run dev
# App runs at http://localhost:3000
```

## Supabase Storage Setup

The app uses a single storage bucket: `slide-images`.

- **Bucket name:** `slide-images`
- **Access:** Public read (images are displayed directly in the editor via public URL)
- **Upload:** Server-side only, via service role key
- **Path pattern:** `{userId}/{projectId}/{slideId}.png`
- **Upsert:** Enabled — regenerating a slide replaces the existing image at the same path

## Available Scripts

```bash
npm run dev          # Start Next.js development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run all tests once (vitest --run)
npm run test:watch   # Run tests in watch mode
```

## AI Provider Configuration

### Google Gemini

- Model: `gemini-1.5-flash` (default, configurable via `GeminiProvider` constructor)
- Used for: storyline generation, slide text parsing, caption generation, slide text regeneration
- Temperature: 0.8 for story generation (creative), lower for structured parsing

### Stability AI

- Engine: `stable-diffusion-xl-1024-v1-0` (SDXL 1.0)
- Used for: image generation for all slides
- Default image size: 1024×1024px
- Default steps: 30, cfg_scale: 7
- All prompts must be in English

## Database Migrations

Migrations are in `supabase/migrations/` and must be applied in order:

1. `001_initial_schema.sql` — creates all tables, indexes, and constraints
2. `002_rls_policies.sql` — enables RLS and creates all security policies

Run them via the Supabase dashboard SQL editor or Supabase CLI:

```bash
supabase db push
```
