-- ============================================================
-- Carousa-AI: Seed Data — Initial Themes
-- ============================================================

INSERT INTO themes (name, mood, color_base, lighting) VALUES
  (
    'Minimalist Monochrome',
    'calm, focused, professional',
    '#1a1a1a, #f5f5f5, #e0e0e0',
    'soft diffused light, high contrast shadows'
  ),
  (
    'Warm Sunset',
    'energetic, passionate, inspiring',
    '#ff6b35, #f7c59f, #efefd0',
    'golden hour warm light, long shadows'
  ),
  (
    'Ocean Breeze',
    'serene, refreshing, trustworthy',
    '#0077b6, #00b4d8, #90e0ef',
    'bright natural daylight, soft reflections'
  ),
  (
    'Forest Mystique',
    'mysterious, organic, grounded',
    '#2d6a4f, #40916c, #d8f3dc',
    'dappled forest light, deep shadows'
  ),
  (
    'Urban Neon',
    'bold, modern, edgy',
    '#7209b7, #f72585, #4cc9f0',
    'neon glow, night city lights, high contrast'
  ),
  (
    'Pastel Dream',
    'soft, romantic, whimsical',
    '#ffd6ff, #e7c6ff, #c8b6ff',
    'soft diffused light, dreamy bokeh'
  ),
  (
    'Earth Tones',
    'authentic, warm, natural',
    '#8b4513, #d2691e, #f4a460',
    'warm afternoon light, natural textures'
  )
ON CONFLICT DO NOTHING;
