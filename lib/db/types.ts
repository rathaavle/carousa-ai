// ============================================================
// Carousa-AI: Database Entity Types
// ============================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Theme {
  id: string;
  name: string;
  mood: string;
  color_base: string;
  lighting: string;
  created_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  theme_id: string | null;
  theme?: Theme;
  total_slides: number;
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  project_id: string;
  index: number;
  text: string | null;
  emotion: string | null;
  scene: string | null;
  prompt: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  user_id: string;
  color_palette: string | null;
  lighting: string | null;
  texture: string | null;
  character_style: string | null;
  style_lock: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Generation {
  id: string;
  project_id: string;
  slide_id: string | null;
  type: "story" | "image" | "caption" | "prompt";
  provider: "gemini";
  status: "processing" | "success" | "failed";
  error_msg: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Input / Helper Types
// ============================================================

export type CreateProjectInput = Pick<
  Project,
  "name" | "theme_id" | "total_slides"
>;

export type BrandProfileInput = Omit<
  BrandProfile,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type UpdateSlideInput = Partial<
  Pick<Slide, "text" | "emotion" | "scene" | "prompt" | "image_url">
>;

export type GenerationStatus = "idle" | "processing" | "success" | "failed";
