-- ============================================================
-- Carousa-AI: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- themes table is public read (no RLS needed for read)
-- but we protect write operations
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Themes are publicly readable"
  ON themes FOR SELECT
  USING (true);

-- Projects: users can only access their own projects
CREATE POLICY "Users can only access their own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Slides: users can only access slides of their own projects
CREATE POLICY "Users can only access slides of their own projects"
  ON slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slides.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slides.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Brand profiles: users can only access their own brand profile
CREATE POLICY "Users can only access their own brand profile"
  ON brand_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Generations: users can only access generations of their own projects
CREATE POLICY "Users can only access their own generation records"
  ON generations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generations.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generations.project_id
        AND projects.user_id = auth.uid()
    )
  );
