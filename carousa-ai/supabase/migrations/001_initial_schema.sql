-- ============================================================
-- Carousa-AI: Initial Database Schema
-- ============================================================

-- Table: themes
CREATE TABLE IF NOT EXISTS themes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  mood        TEXT NOT NULL,
  color_base  TEXT NOT NULL,
  lighting    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  theme_id     UUID REFERENCES themes(id),
  total_slides INTEGER NOT NULL CHECK (total_slides BETWEEN 3 AND 20),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Table: slides
CREATE TABLE IF NOT EXISTS slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  index       INTEGER NOT NULL,
  text        TEXT,
  emotion     TEXT,
  scene       TEXT,
  prompt      TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, index)
);

CREATE INDEX IF NOT EXISTS idx_slides_project_id ON slides(project_id);

-- Table: brand_profiles
CREATE TABLE IF NOT EXISTS brand_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  color_palette    TEXT,
  lighting         TEXT,
  texture          TEXT,
  character_style  TEXT,
  style_lock       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Table: generations
CREATE TABLE IF NOT EXISTS generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slide_id    UUID REFERENCES slides(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('story', 'image', 'caption', 'prompt')),
  provider    TEXT NOT NULL CHECK (provider IN ('gemini', 'stability')),
  status      TEXT NOT NULL CHECK (status IN ('processing', 'success', 'failed')),
  error_msg   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
