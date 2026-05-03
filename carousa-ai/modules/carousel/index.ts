// ============================================================
// Carousa-AI: Carousel Module
// ============================================================
// Orchestrates the end-to-end carousel production workflow:
//   1. generateStoryline  — fetch project + theme, call AI_Orchestrator,
//                           parse into N slide segments, persist to DB.
//   2. generateAllImages  — build prompts, generate images, upload to
//                           Supabase Storage, update slide image_url.
//   3. generateCaption    — collect slide texts, generate Instagram caption.
//
// SERVER-SIDE ONLY — never import this module in client components.
// ============================================================

import { createClient } from "@/lib/db/server";
import {
  getProjectById,
  getSlidesByProject,
  upsertSlides,
  getBrandProfile,
} from "@/lib/db/queries";
import { AI_Orchestrator } from "@/modules/ai/orchestrator";
import { uploadSlideImage } from "@/modules/image";
import { AuthorizationError, AIGenerationError } from "@/lib/utils/errors";
import type { Slide, Theme } from "@/lib/db/types";

// ── Public types ──────────────────────────────────────────────────────────

/** Summary result for a batch image-generation run. */
export interface GenerationResult {
  completed: number;
  failed: number;
  total: number;
  slides: Slide[];
}

// ── CarouselModule ────────────────────────────────────────────────────────

/**
 * Coordinates all carousel production operations for a single project.
 *
 * Requirements: 4.1, 4.2, 4.3, 7.1–7.5, 10.1, 10.2
 */
export class CarouselModule {
  // ── Storyline generation ────────────────────────────────────────────────

  /**
   * Generate a full storyline for `projectId` and persist the resulting
   * slides to the database.
   *
   * Steps:
   *  1. Fetch the project (validates ownership via `userId`).
   *  2. Resolve the associated theme.
   *  3. Call `AI_Orchestrator.generateStory()` with theme context.
   *  4. Call `AI_Orchestrator.generateSlides()` to parse the story into
   *     exactly `total_slides` segments (Property 7).
   *  5. Upsert the segments as slide rows in the database.
   *
   * @param projectId  UUID of the project to generate a storyline for.
   * @param userId     UUID of the authenticated user (ownership check).
   * @returns          Array of exactly `project.total_slides` saved slides.
   *
   * Requirements: 4.1, 4.2, 4.3
   */
  async generateStoryline(projectId: string, userId: string): Promise<Slide[]> {
    const supabase = await createClient();

    // 1. Fetch project and verify ownership
    const project = await getProjectById(supabase, projectId, userId);
    if (!project) {
      throw new AuthorizationError(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    // 2. Resolve theme — use the joined theme from the project query,
    //    or fall back to a sensible default so generation can still proceed.
    const theme = project.theme ?? {
      id: project.theme_id ?? "",
      name: "Default",
      mood: "aesthetic",
      color_base: "neutral tones",
      lighting: "soft natural light",
    };

    const orchestrator = new AI_Orchestrator(supabase);

    // 3. Generate the raw storyline text via Gemini
    const storyResult = await orchestrator.generateStory({
      projectId,
      theme,
      slideCount: project.total_slides,
    });

    // 4. Parse the storyline into exactly `total_slides` segments.
    //    AI_Orchestrator.generateSlides() guarantees exactly N segments
    //    (Property 7) via its normalizeSlideCount() helper.
    const slideData = await orchestrator.generateSlides(
      storyResult.storyText,
      project.total_slides,
    );

    // 5. Map parsed segments to Slide upsert payloads and persist.
    //    We use `project_id + index` as the conflict key (see DB schema).
    const slidePayloads: Omit<Slide, "created_at" | "updated_at">[] =
      slideData.map((segment) => ({
        // Let the database generate the id on insert; on conflict (upsert)
        // the existing id is preserved.  We pass a placeholder that will be
        // replaced by the DB-generated value on the first insert.
        id: generatePlaceholderId(projectId, segment.index),
        project_id: projectId,
        index: segment.index,
        text: segment.text,
        emotion: segment.emotion,
        scene: segment.scene,
        prompt: null,
        image_url: null,
      }));

    const savedSlides = await upsertSlides(supabase, slidePayloads);

    // Return slides sorted by index for a predictable caller experience.
    return savedSlides.sort((a, b) => a.index - b.index);
  }

  // ── Batch image generation ──────────────────────────────────────────────

  /**
   * Generate images for all slides in `projectId` sequentially.
   *
   * For each slide:
   *  1. Build a structured prompt via `AI_Orchestrator.generatePrompt()`.
   *  2. Generate the image via `AI_Orchestrator.generateImage()` — this
   *     creates a Generation_Record and logs success/failure automatically.
   *  3. Upload the image buffer to Supabase Storage via `uploadSlideImage()`.
   *  4. Update `slide.prompt` and `slide.image_url` in the database.
   *
   * Failures on individual slides are recorded but do not abort the batch
   * (fail-gracefully per Requirements 7.3).
   *
   * @param projectId  UUID of the project.
   * @param userId     UUID of the authenticated user (ownership check).
   * @returns          Summary of completed / failed counts and updated slides.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async generateAllImages(
    projectId: string,
    userId: string,
  ): Promise<GenerationResult> {
    const supabase = await createClient();

    // Verify ownership
    const project = await getProjectById(supabase, projectId, userId);
    if (!project) {
      throw new AuthorizationError(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    // Fetch current slides and brand profile in parallel
    const [slides, brandProfile] = await Promise.all([
      getSlidesByProject(supabase, projectId),
      getBrandProfile(supabase, userId),
    ]);

    const orchestrator = new AI_Orchestrator(supabase);

    // Resolve theme — fall back to sensible defaults if not joined
    const theme: Theme = project.theme ?? {
      id: project.theme_id ?? "",
      name: "Default",
      mood: "aesthetic",
      color_base: "neutral tones",
      lighting: "soft natural light",
    };

    let completed = 0;
    let failed = 0;
    const updatedSlides: Slide[] = [];

    // Process slides sequentially (Requirements 7.1)
    for (const slide of slides) {
      try {
        // 1. Attach theme so generatePrompt() can access it
        const slideWithTheme = { ...slide, theme } as Slide & {
          theme: Theme;
        };

        // 2. Build structured prompt (Requirements 6.1–6.5)
        const prompt = await orchestrator.generatePrompt(
          slideWithTheme,
          brandProfile,
        );

        // 3. Generate image — AI_Orchestrator creates + updates Generation_Record
        //    automatically (Requirements 7.5, 13.1–13.4)
        const imageResult = await orchestrator.generateImage(
          prompt,
          projectId,
          slide.id,
        );

        // 4. Upload to Supabase Storage (Requirements 7.2)
        const { publicUrl: imageUrl } = await uploadSlideImage(supabase, {
          userId,
          projectId,
          slideId: slide.id,
          imageBuffer: imageResult.imageBuffer,
          mimeType: imageResult.mimeType,
        });

        // 5. Persist prompt + image_url back to the slide
        const { data: updatedSlide, error: updateError } = await supabase
          .from("slides")
          .update({
            prompt,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", slide.id)
          .select()
          .single();

        if (updateError) throw updateError;

        updatedSlides.push(updatedSlide as Slide);
        completed++;
      } catch (err) {
        // Fail gracefully: log and continue with next slide (Requirements 7.3)
        console.error(
          `[carousel] Failed to generate image for slide ${slide.id}:`,
          err instanceof Error ? err.message : err,
        );
        failed++;
        updatedSlides.push(slide); // keep original slide data
      }
    }

    return { completed, failed, total: slides.length, slides: updatedSlides };
  }

  // ── Caption generation ──────────────────────────────────────────────────

  /**
   * Generate an Instagram caption for `projectId` based on all slide texts.
   *
   * @param projectId  UUID of the project.
   * @param userId     UUID of the authenticated user (ownership check).
   * @returns          The generated caption string (narrative + CTA + hashtags).
   *
   * Requirements: 10.1, 10.2
   */
  async generateCaption(projectId: string, userId: string): Promise<string> {
    const supabase = await createClient();

    // Verify ownership
    const project = await getProjectById(supabase, projectId, userId);
    if (!project) {
      throw new AuthorizationError(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    // Collect all slide texts in order
    const slides = await getSlidesByProject(supabase, projectId);
    const slideTexts = slides
      .sort((a, b) => a.index - b.index)
      .map((s) => s.text ?? "")
      .filter(Boolean);

    if (slideTexts.length === 0) {
      throw new AIGenerationError(
        "Tidak ada teks slide yang tersedia untuk membuat caption.",
        "",
      );
    }

    const orchestrator = new AI_Orchestrator(supabase);
    return orchestrator.generateCaption(projectId, slideTexts);
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  // (Image upload is handled by modules/image/index.ts)
}

// ── Utilities ─────────────────────────────────────────────────────────────

/**
 * Generate a deterministic placeholder UUID for a slide based on its
 * project ID and index. This is used as the `id` field in upsert payloads
 * so that the database can match on `(project_id, index)` and either insert
 * a new row (using the DB-generated UUID) or update the existing one.
 *
 * NOTE: Supabase upsert with `onConflict: "project_id,index"` will ignore
 * the provided `id` on conflict and keep the existing row's id. On insert,
 * the database DEFAULT (`gen_random_uuid()`) takes precedence when the
 * provided id is a placeholder that doesn't already exist.
 *
 * In practice we pass a stable placeholder so the upsert payload is valid
 * TypeScript (the `id` field is required by the Slide type), but the real
 * UUID is always assigned by the database.
 */
function generatePlaceholderId(projectId: string, index: number): string {
  // Use a namespace-like prefix to make it obvious this is a placeholder.
  // The actual UUID will be assigned by the database on first insert.
  const paddedIndex = String(index).padStart(4, "0");
  // Construct a valid UUID-shaped string using parts of the projectId
  const base = projectId.replace(/-/g, "").slice(0, 24).padEnd(24, "0");
  return `${base.slice(0, 8)}-${base.slice(8, 12)}-4${base.slice(13, 16)}-a${base.slice(17, 20)}-${paddedIndex}00000000`;
}
