---
inclusion: manual
---

# Carousa-AI — Data Models & Database Schema

## Entity Overview

```
auth.users (Supabase managed)
    │
    ├── projects (user_id FK)
    │       └── slides (project_id FK)
    │               └── generations (project_id FK, slide_id FK nullable)
    │
    └── brand_profiles (user_id FK, UNIQUE — one per user)

themes (global, no user ownership)
```

## Tables

### `themes`

Global lookup table. Publicly readable, no user ownership.

| Column       | Type        | Notes                                       |
| ------------ | ----------- | ------------------------------------------- |
| `id`         | UUID PK     |                                             |
| `name`       | TEXT        | Display name                                |
| `mood`       | TEXT        | e.g. "melancholic", "uplifting"             |
| `color_base` | TEXT        | Hex or description, e.g. "warm earth tones" |
| `lighting`   | TEXT        | e.g. "soft golden hour", "dramatic shadows" |
| `created_at` | TIMESTAMPTZ |                                             |

### `projects`

One project = one carousel production session.

| Column         | Type                 | Notes                   |
| -------------- | -------------------- | ----------------------- |
| `id`           | UUID PK              |                         |
| `user_id`      | UUID FK → auth.users | CASCADE delete          |
| `name`         | TEXT NOT NULL        | Validated: non-empty    |
| `theme_id`     | UUID FK → themes     | Nullable                |
| `total_slides` | INTEGER              | CHECK: 3–20             |
| `created_at`   | TIMESTAMPTZ          |                         |
| `updated_at`   | TIMESTAMPTZ          | Updated on any mutation |

Index: `idx_projects_user_id`

### `slides`

One row per slide in a project.

| Column       | Type               | Notes                                           |
| ------------ | ------------------ | ----------------------------------------------- |
| `id`         | UUID PK            |                                                 |
| `project_id` | UUID FK → projects | CASCADE delete                                  |
| `index`      | INTEGER            | 0-based position in carousel                    |
| `text`       | TEXT               | Slide narrative text (nullable until generated) |
| `emotion`    | TEXT               | Emotional tone, e.g. "hopeful" (nullable)       |
| `scene`      | TEXT               | Scene description for image prompt (nullable)   |
| `prompt`     | TEXT               | Final assembled SDXL prompt (nullable)          |
| `image_url`  | TEXT               | Public Supabase Storage URL (nullable)          |
| `created_at` | TIMESTAMPTZ        |                                                 |
| `updated_at` | TIMESTAMPTZ        |                                                 |

Constraints: `UNIQUE (project_id, index)` — used as upsert conflict key.
Index: `idx_slides_project_id`

### `brand_profiles`

One per user. Upserted on save (never duplicated).

| Column            | Type                 | Notes                                                           |
| ----------------- | -------------------- | --------------------------------------------------------------- |
| `id`              | UUID PK              |                                                                 |
| `user_id`         | UUID FK → auth.users | UNIQUE, CASCADE delete                                          |
| `color_palette`   | TEXT                 | e.g. "muted pastels, dusty rose, sage green"                    |
| `lighting`        | TEXT                 | e.g. "soft diffused light"                                      |
| `texture`         | TEXT                 | e.g. "linen, paper grain"                                       |
| `character_style` | TEXT                 | e.g. "illustrated, faceless silhouette"                         |
| `style_lock`      | BOOLEAN              | Default FALSE. When TRUE, brand attrs injected into all prompts |
| `created_at`      | TIMESTAMPTZ          |                                                                 |
| `updated_at`      | TIMESTAMPTZ          |                                                                 |

### `generations`

Audit log for every AI operation. Never deleted manually — cascade from project.

| Column       | Type               | Notes                                                |
| ------------ | ------------------ | ---------------------------------------------------- |
| `id`         | UUID PK            |                                                      |
| `project_id` | UUID FK → projects | CASCADE delete                                       |
| `slide_id`   | UUID FK → slides   | SET NULL on slide delete                             |
| `type`       | TEXT               | `'story'` \| `'image'` \| `'caption'` \| `'prompt'`  |
| `provider`   | TEXT               | `'gemini'` \| `'stability'`                          |
| `status`     | TEXT               | `'processing'` \| `'success'` \| `'failed'`          |
| `error_msg`  | TEXT               | Populated on failure                                 |
| `metadata`   | JSONB              | Provider response metadata (tokens used, seed, etc.) |
| `created_at` | TIMESTAMPTZ        |                                                      |
| `updated_at` | TIMESTAMPTZ        |                                                      |

Index: `idx_generations_project_id`

## Row Level Security (RLS)

All tables have RLS enabled. Policies enforce that users can only access their own data:

- **projects**: `auth.uid() = user_id`
- **slides**: EXISTS check via projects table
- **brand_profiles**: `auth.uid() = user_id`
- **generations**: EXISTS check via projects table
- **themes**: Public SELECT, no write policy for users

## TypeScript Types (`lib/db/types.ts`)

```typescript
interface Theme {
  id;
  name;
  mood;
  color_base;
  lighting;
  created_at?;
}
interface Project {
  id;
  user_id;
  name;
  theme_id;
  theme?;
  total_slides;
  created_at;
  updated_at;
}
interface Slide {
  id;
  project_id;
  index;
  text;
  emotion;
  scene;
  prompt;
  image_url;
  created_at;
  updated_at;
}
interface BrandProfile {
  id;
  user_id;
  color_palette;
  lighting;
  texture;
  character_style;
  style_lock;
  created_at?;
  updated_at?;
}
interface Generation {
  id;
  project_id;
  slide_id;
  type;
  provider;
  status;
  error_msg;
  metadata;
  created_at;
  updated_at;
}

// Input types
type CreateProjectInput = Pick<Project, "name" | "theme_id" | "total_slides">;
type BrandProfileInput = Omit<
  BrandProfile,
  "id" | "user_id" | "created_at" | "updated_at"
>;
type UpdateSlideInput = Partial<
  Pick<Slide, "text" | "emotion" | "scene" | "prompt" | "image_url">
>;
type GenerationStatus = "idle" | "processing" | "success" | "failed";
```

## Supabase Storage

- **Bucket:** `slide-images` (public read)
- **Path:** `{userId}/{projectId}/{slideId}.png`
- **Upload:** Server-side only via service role key (`createServiceClient()`)
- **Upsert:** `true` — regeneration replaces the file at the same path
- **Export path derivation:** `${userId}/${projectId}/${slide.id}.png`
