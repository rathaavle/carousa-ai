---
inclusion: always
---

# Carousa-AI — Architecture & Code Organization

## Directory Structure

```
carousa-ai/
├── app/                        # Next.js App Router pages & API routes
│   ├── login/                  # Login & registration page
│   ├── dashboard/              # Project list page
│   ├── editor/[id]/            # Slide editor page
│   ├── brand/                  # Brand profile settings page
│   └── api/
│       ├── project/            # GET list, POST create, [id] GET/DELETE
│       ├── slides/             # [projectId] GET, [id] PATCH, reorder POST
│       ├── ai/
│       │   ├── generate-story/ # POST — generate storyline
│       │   ├── generate-images/# POST — batch image generation
│       │   ├── regenerate/     # POST — regenerate single slide
│       │   └── caption/        # POST — generate Instagram caption
│       ├── brand/              # GET/POST/PATCH brand profile
│       ├── export/[projectId]/ # GET — download ZIP
│       └── themes/             # GET — list themes
│
├── modules/                    # Business logic (server-side only)
│   ├── ai/orchestrator.ts      # AI_Orchestrator — central AI coordinator
│   ├── auth/actions.ts         # signIn, signUp, signOut server actions
│   ├── brand/index.ts          # BrandModule — brand profile CRUD
│   ├── carousel/index.ts       # CarouselModule — end-to-end workflow
│   ├── export/index.ts         # exportProjectAsZip
│   ├── image/index.ts          # uploadSlideImage, deleteSlideImage
│   └── project/index.ts        # getProjects, createProject, deleteProject
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts         # AIProvider interface + result types
│   │   ├── gemini-provider.ts  # GeminiProvider (text only)
│   │   └── stability-provider.ts # StabilityProvider (image only)
│   ├── db/
│   │   ├── client.ts           # Supabase browser client
│   │   ├── server.ts           # Supabase server client + service client
│   │   ├── queries.ts          # All database query helpers
│   │   └── types.ts            # TypeScript entity interfaces
│   ├── prompt/builder.ts       # PromptBuilder — 7-component prompt assembly
│   ├── stores/
│   │   ├── editor-store.ts     # Zustand store for editor page
│   │   └── project-store.ts    # Zustand store for dashboard
│   └── utils/
│       ├── errors.ts           # Custom error classes
│       ├── slide-utils.ts      # reorderSlides (pure) + applyReorderToDatabase
│       └── validation.ts       # validateProjectName, validateSlideCount
│
├── components/
│   ├── ui/                     # shadcn/ui base components + ProjectCard
│   ├── editor/                 # SlideCard, SlideEditor, ImagePreview, EditorToolbar
│   ├── carousel/               # SlideStrip
│   └── forms/                  # ProjectForm, ThemeSelector
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   └── seed.sql
│
└── tests/
    ├── unit/lib/               # Unit + property-based tests
    └── integration/            # Integration tests
```

## Layer Responsibilities

### API Routes (`app/api/`)

- Authenticate the user (get userId from Supabase session).
- Parse and validate the request body.
- Delegate all business logic to a module.
- Return structured JSON responses: `{ data }` on success, `{ error, code }` on failure.
- Never contain business logic directly.

### Modules (`modules/`)

- Own all business logic for their domain.
- Are server-side only — never import in client components.
- Validate ownership before every mutation.
- Throw typed errors (`AuthorizationError`, `ValidationError`, `AIGenerationError`).

### AI Layer (`lib/ai/`, `modules/ai/`)

- `AIProvider` interface defines the contract for all providers.
- `GeminiProvider` handles text only; throws `UnsupportedOperationError` for images.
- `StabilityProvider` handles images only; throws `UnsupportedOperationError` for text.
- `AI_Orchestrator` is the only entry point for AI operations — it creates/updates `Generation_Record` for every call.
- `PromptBuilder` assembles structured English prompts for SDXL.

### Database Layer (`lib/db/`)

- `client.ts` — browser-side Supabase client (uses anon key).
- `server.ts` — server-side Supabase client (uses anon key + cookie session) and service client (uses service role key, for storage operations in export).
- `queries.ts` — all raw Supabase queries. No business logic here.
- `types.ts` — TypeScript interfaces mirroring the database schema.

### Client State (`lib/stores/`)

- `useProjectStore` — manages the project list on the dashboard.
- `useEditorStore` — manages the active project, slides, and per-slide generation status in the editor.
- Stores use optimistic updates with rollback on failure.

## Request Flow (Generate Storyline Example)

```
Browser → POST /api/ai/generate-story
  → API Route: authenticate, parse body
  → CarouselModule.generateStoryline(projectId, userId)
    → getProjectById (verify ownership)
    → AI_Orchestrator.generateStory(context)
      → createGenerationRecord (status: processing)
      → GeminiProvider.generateText(prompt)
      → updateGenerationRecord (status: success/failed)
    → AI_Orchestrator.generateSlides(storyText, slideCount)
    → upsertSlides (persist to DB)
  → API Route: return { slides, status: "success" }
→ Browser: EditorStore.loadEditor() → redirect to /editor/[id]
```

## Security Rules

- Every API endpoint calls `supabase.auth.getUser()` before touching any data.
- Ownership is validated in the module layer (not just via RLS) to return meaningful errors.
- RLS policies on all tables provide a second layer of enforcement at the database level.
- `GEMINI_API_KEY` and `STABILITY_API_KEY` are only read in server-side modules — never in client components or `lib/ai/` files that could be bundled client-side.
- The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is only used in `lib/db/server.ts` via `createServiceClient()`, which is only called from the export module.
