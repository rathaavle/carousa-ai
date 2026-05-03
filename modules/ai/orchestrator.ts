// ============================================================
// Carousa-AI: AI_Orchestrator
// ============================================================
// Central coordinator for all AI operations. Wraps GeminiProvider
// (text) and StabilityProvider (image) behind a unified interface,
// and ensures every operation is tracked via a Generation_Record.
//
// SERVER-SIDE ONLY — never import this module in client components.

import type { SupabaseClient } from "@supabase/supabase-js";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import { StabilityProvider } from "@/lib/ai/stability-provider";
import { PromptBuilder } from "@/lib/prompt/builder";
import { AIGenerationError } from "@/lib/utils/errors";
import {
  createGenerationRecord,
  updateGenerationRecord,
} from "@/lib/db/queries";
import type { Slide, BrandProfile, Theme, Generation } from "@/lib/db/types";

// ── Public types ──────────────────────────────────────────────────────────

/** Context passed to `generateStory()`. */
export interface StoryContext {
  projectId: string;
  theme: Theme;
  slideCount: number;
  /** Optional extra instructions / brand voice hints. */
  additionalContext?: string;
}

/** Raw story text returned by `generateStory()`. */
export interface StoryResult {
  /** The full storyline text as returned by Gemini. */
  storyText: string;
  /** Generation record ID for audit purposes. */
  generationId: string;
}

/** Parsed data for a single slide, returned by `generateSlides()`. */
export interface SlideData {
  index: number;
  text: string;
  emotion: string;
  scene: string;
}

/** Result of `generateImage()`. */
export interface ImageResult {
  imageBuffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
  /** Generation record ID for audit purposes. */
  generationId: string;
}

// ── AI_Orchestrator ───────────────────────────────────────────────────────

/**
 * Coordinates all AI operations for Carousa-AI.
 *
 * Responsibilities:
 * - Route text requests to `GeminiProvider`.
 * - Route image requests to `StabilityProvider`.
 * - Create a `Generation_Record` before every operation.
 * - Update the record to `success` or `failed` after completion.
 * - Throw `AIGenerationError` (with the record ID) on failure so callers
 *   can surface a meaningful error to the user.
 */
export class AI_Orchestrator {
  private readonly gemini: GeminiProvider;
  private readonly stability: StabilityProvider;
  private readonly promptBuilder: PromptBuilder;
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.gemini = new GeminiProvider();
    this.stability = new StabilityProvider();
    this.promptBuilder = new PromptBuilder();
  }

  // ── Story generation ────────────────────────────────────────────────────

  /**
   * Generate a full carousel storyline using Gemini.
   *
   * @param context  Project theme, slide count, and optional extra context.
   * @returns        The raw storyline text and the generation record ID.
   */
  async generateStory(context: StoryContext): Promise<StoryResult> {
    const genRecord = await this.createRecord({
      projectId: context.projectId,
      type: "story",
      provider: "gemini",
    });

    try {
      const prompt = this.buildStoryPrompt(context);
      const result = await this.gemini.generateText(prompt, {
        temperature: 0.8,
      });

      await this.succeedRecord(genRecord.id, {
        slideCount: context.slideCount,
        tokensUsed: result.tokensUsed,
      });

      return { storyText: result.content, generationId: genRecord.id };
    } catch (error) {
      await this.failRecord(genRecord.id, error);
      throw new AIGenerationError(
        `Story generation failed: ${errorMessage(error)}`,
        genRecord.id,
      );
    }
  }

  // ── Slide parsing ───────────────────────────────────────────────────────

  /**
   * Parse a raw storyline text into exactly `slideCount` slide segments.
   *
   * Each segment contains `text`, `emotion`, and `scene` fields.
   * If Gemini returns fewer segments than expected, the remaining slots
   * are filled with placeholder content.
   *
   * @param story      Raw storyline text from `generateStory()`.
   * @param slideCount Target number of slides (3–20).
   * @returns          Array of exactly `slideCount` `SlideData` objects.
   */
  async generateSlides(
    story: string,
    slideCount: number,
  ): Promise<SlideData[]> {
    // Ask Gemini to structure the story into JSON segments.
    const prompt = this.buildSlideParsingPrompt(story, slideCount);

    let parsed: SlideData[] = [];

    try {
      const result = await this.gemini.generateText(prompt, {
        temperature: 0.3,
      });
      parsed = this.parseSlideJson(result.content, slideCount);
    } catch {
      // Fallback: split story text evenly if Gemini/JSON parsing fails.
      parsed = this.splitStoryEvenly(story, slideCount);
    }

    // Guarantee exactly slideCount segments (Property 7).
    return this.normalizeSlideCount(parsed, slideCount);
  }

  // ── Prompt building ─────────────────────────────────────────────────────

  /**
   * Build a structured image-generation prompt for a single slide.
   *
   * @param slide        The slide to generate a prompt for.
   * @param brandProfile The user's brand profile (may be null).
   * @returns            The assembled prompt string.
   */
  async generatePrompt(
    slide: Slide,
    brandProfile: BrandProfile | null,
  ): Promise<string> {
    const styleLockEnabled = brandProfile?.style_lock ?? false;

    // We need the theme — callers should pass a slide with theme data
    // available via the project. Here we build a minimal theme from
    // whatever is available on the slide's project context.
    // The actual theme is injected by the CarouselModule before calling this.
    const theme = (slide as Slide & { theme?: Theme }).theme ?? {
      id: "",
      name: "default",
      mood: "aesthetic",
      color_base: "neutral tones",
      lighting: "soft natural light",
    };

    return this.promptBuilder.build({
      theme,
      slide,
      brandProfile,
      styleLockEnabled,
    });
  }

  // ── Image generation ────────────────────────────────────────────────────

  /**
   * Generate an image for a slide using Stability AI.
   *
   * @param prompt     The assembled prompt string.
   * @param projectId  Used to create the Generation_Record.
   * @param slideId    Optional slide ID for the record.
   * @returns          Image buffer, MIME type, and generation record ID.
   */
  async generateImage(
    prompt: string,
    projectId: string,
    slideId?: string,
  ): Promise<ImageResult> {
    const genRecord = await this.createRecord({
      projectId,
      slideId,
      type: "image",
      provider: "stability",
    });

    try {
      const result = await this.stability.generateImage(prompt, {
        width: 1024,
        height: 1024,
        steps: 30,
        cfgScale: 7,
      });

      await this.succeedRecord(genRecord.id, { slideId });

      return {
        imageBuffer: result.imageBuffer,
        mimeType: result.mimeType,
        generationId: genRecord.id,
      };
    } catch (error) {
      await this.failRecord(genRecord.id, error);
      throw new AIGenerationError(
        `Image generation failed: ${errorMessage(error)}`,
        genRecord.id,
      );
    }
  }

  // ── Single-slide text regeneration ─────────────────────────────────────

  /**
   * Regenerate the text, emotion, and scene for a single slide using Gemini,
   * with the project theme and the slide's position in the storyline as context.
   *
   * @param projectId   Used to create the Generation_Record.
   * @param slide       The slide to regenerate text for.
   * @param theme       The project's theme for context.
   * @param totalSlides Total number of slides in the project (for position context).
   * @returns           New text, emotion, scene, and the generation record ID.
   *
   * Requirements: 8.4
   */
  async regenerateSlideText(
    projectId: string,
    slide: Slide,
    theme: Theme,
    totalSlides: number,
  ): Promise<{
    text: string;
    emotion: string;
    scene: string;
    generationId: string;
  }> {
    const genRecord = await this.createRecord({
      projectId,
      slideId: slide.id,
      type: "story",
      provider: "gemini",
    });

    try {
      const prompt = this.buildSlideTextRegenerationPrompt(
        slide,
        theme,
        totalSlides,
      );
      const result = await this.gemini.generateText(prompt, {
        temperature: 0.7,
      });

      // Parse the JSON response from Gemini
      const parsed = this.parseRegeneratedSlideText(result.content, slide);

      await this.succeedRecord(genRecord.id, {
        slideId: slide.id,
        slideIndex: slide.index,
        tokensUsed: result.tokensUsed,
      });

      return { ...parsed, generationId: genRecord.id };
    } catch (error) {
      await this.failRecord(genRecord.id, error);
      throw new AIGenerationError(
        `Slide text regeneration failed: ${errorMessage(error)}`,
        genRecord.id,
      );
    }
  }

  // ── Caption generation ──────────────────────────────────────────────────

  /**
   * Generate an Instagram caption from all slide texts in a project.
   *
   * @param projectId  Used to create the Generation_Record.
   * @param slideTexts Array of slide text strings (in order).
   * @returns          The generated caption string.
   */
  async generateCaption(
    projectId: string,
    slideTexts: string[],
  ): Promise<string> {
    const genRecord = await this.createRecord({
      projectId,
      type: "caption",
      provider: "gemini",
    });

    try {
      const prompt = this.buildCaptionPrompt(slideTexts);
      const result = await this.gemini.generateText(prompt, {
        temperature: 0.7,
      });

      await this.succeedRecord(genRecord.id, {
        tokensUsed: result.tokensUsed,
      });

      return result.content;
    } catch (error) {
      await this.failRecord(genRecord.id, error);
      throw new AIGenerationError(
        `Caption generation failed: ${errorMessage(error)}`,
        genRecord.id,
      );
    }
  }

  // ── Private: Generation_Record helpers ──────────────────────────────────

  private async createRecord(params: {
    projectId: string;
    slideId?: string;
    type: Generation["type"];
    provider: Generation["provider"];
  }): Promise<Generation> {
    return createGenerationRecord(this.supabase, {
      project_id: params.projectId,
      slide_id: params.slideId ?? null,
      type: params.type,
      provider: params.provider,
      status: "processing",
      error_msg: null,
      metadata: null,
    });
  }

  private async succeedRecord(
    id: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await updateGenerationRecord(this.supabase, id, {
      status: "success",
      metadata: metadata ?? null,
    });
  }

  private async failRecord(id: string, error: unknown): Promise<void> {
    await updateGenerationRecord(this.supabase, id, {
      status: "failed",
      error_msg: errorMessage(error),
    });
  }

  // ── Private: Prompt builders ─────────────────────────────────────────────

  private buildStoryPrompt(context: StoryContext): string {
    return (
      `You are a creative content strategist for Instagram carousel posts.\n\n` +
      `Create an emotional storyline for an Instagram carousel with the following details:\n` +
      `- Theme: ${context.theme.name}\n` +
      `- Mood: ${context.theme.mood}\n` +
      `- Color palette: ${context.theme.color_base}\n` +
      `- Lighting style: ${context.theme.lighting}\n` +
      `- Number of slides: ${context.slideCount}\n` +
      (context.additionalContext
        ? `- Additional context: ${context.additionalContext}\n`
        : "") +
      `\nWrite a cohesive narrative that flows naturally across ${context.slideCount} slides. ` +
      `The story should evoke emotion, build curiosity, and end with a clear message or call to action. ` +
      `Write in a style suitable for a faceless aesthetic Instagram account.\n\n` +
      `Return ONLY the storyline text, no additional commentary.`
    );
  }

  private buildSlideParsingPrompt(story: string, slideCount: number): string {
    return (
      `You are a content editor. Split the following storyline into exactly ${slideCount} slide segments.\n\n` +
      `STORYLINE:\n${story}\n\n` +
      `Return a JSON array with exactly ${slideCount} objects. Each object must have:\n` +
      `- "text": the slide caption text (concise, 1-3 sentences)\n` +
      `- "emotion": the dominant emotion for this slide (e.g. "hopeful", "melancholic", "excited")\n` +
      `- "scene": a brief visual scene description for image generation (e.g. "sunset over mountains")\n\n` +
      `Return ONLY valid JSON, no markdown code blocks, no commentary.\n` +
      `Example: [{"text":"...","emotion":"...","scene":"..."}]`
    );
  }

  private buildSlideTextRegenerationPrompt(
    slide: Slide,
    theme: Theme,
    totalSlides: number,
  ): string {
    const position = slide.index + 1; // 1-based for human-readable context
    const isFirst = slide.index === 0;
    const isLast = slide.index === totalSlides - 1;

    const positionHint = isFirst
      ? "This is the OPENING slide — it should hook the reader."
      : isLast
        ? "This is the CLOSING slide — it should deliver the final message or CTA."
        : `This is slide ${position} of ${totalSlides} — it should continue the narrative flow.`;

    return (
      `You are a creative Instagram content writer. Regenerate the content for a single carousel slide.\n\n` +
      `PROJECT THEME:\n` +
      `- Theme: ${theme.name}\n` +
      `- Mood: ${theme.mood}\n` +
      `- Color palette: ${theme.color_base}\n` +
      `- Lighting: ${theme.lighting}\n\n` +
      `SLIDE CONTEXT:\n` +
      `- Position: ${positionHint}\n` +
      (slide.text ? `- Current text: "${slide.text}"\n` : "") +
      (slide.emotion ? `- Current emotion: ${slide.emotion}\n` : "") +
      (slide.scene ? `- Current scene: ${slide.scene}\n` : "") +
      `\nGenerate a fresh version of this slide. Return ONLY valid JSON with this exact shape:\n` +
      `{"text":"...","emotion":"...","scene":"..."}\n\n` +
      `- "text": concise slide caption (1–3 sentences, evocative and on-brand)\n` +
      `- "emotion": dominant emotion (e.g. "hopeful", "melancholic", "excited")\n` +
      `- "scene": brief visual scene description for image generation (e.g. "golden hour forest path")\n\n` +
      `Return ONLY valid JSON, no markdown, no commentary.`
    );
  }

  private parseRegeneratedSlideText(
    content: string,
    slide: Slide,
  ): { text: string; emotion: string; scene: string } {
    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      const parsed = JSON.parse(cleaned) as {
        text?: string;
        emotion?: string;
        scene?: string;
      };

      return {
        text: parsed.text?.trim() || slide.text || `Slide ${slide.index + 1}`,
        emotion: parsed.emotion?.trim() || slide.emotion || "neutral",
        scene: parsed.scene?.trim() || slide.scene || "abstract background",
      };
    } catch {
      // Fallback: return the raw content as text, preserve existing emotion/scene
      return {
        text: content.trim() || slide.text || `Slide ${slide.index + 1}`,
        emotion: slide.emotion || "neutral",
        scene: slide.scene || "abstract background",
      };
    }
  }

  private buildCaptionPrompt(slideTexts: string[]): string {
    const slideSummary = slideTexts
      .map((t, i) => `Slide ${i + 1}: ${t}`)
      .join("\n");

    return (
      `You are an Instagram content creator. Write a compelling caption for a carousel post.\n\n` +
      `CAROUSEL CONTENT:\n${slideSummary}\n\n` +
      `The caption must include:\n` +
      `1. A compelling opening line (hook)\n` +
      `2. A brief narrative summary of the carousel\n` +
      `3. A clear call-to-action (CTA)\n` +
      `4. At least 10 relevant hashtags\n\n` +
      `Write in an engaging, authentic tone suitable for Instagram. ` +
      `Return ONLY the caption text, ready to copy-paste.`
    );
  }

  // ── Private: Slide parsing helpers ──────────────────────────────────────

  private parseSlideJson(content: string, slideCount: number): SlideData[] {
    // Strip markdown code fences if present
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Array<{
      text?: string;
      emotion?: string;
      scene?: string;
    }>;

    if (!Array.isArray(parsed)) {
      throw new Error("Expected a JSON array");
    }

    return parsed.slice(0, slideCount).map((item, index) => ({
      index,
      text: item.text?.trim() || `Slide ${index + 1}`,
      emotion: item.emotion?.trim() || "neutral",
      scene: item.scene?.trim() || "abstract background",
    }));
  }

  private splitStoryEvenly(story: string, slideCount: number): SlideData[] {
    // Split by sentences, then group evenly.
    const sentences = story
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const perSlide = Math.ceil(sentences.length / slideCount);
    const slides: SlideData[] = [];

    for (let i = 0; i < slideCount; i++) {
      const chunk = sentences.slice(i * perSlide, (i + 1) * perSlide);
      slides.push({
        index: i,
        text: chunk.join(" ") || `Slide ${i + 1}`,
        emotion: "neutral",
        scene: "abstract background",
      });
    }

    return slides;
  }

  private normalizeSlideCount(
    slides: SlideData[],
    slideCount: number,
  ): SlideData[] {
    const result = slides.slice(0, slideCount);

    // Pad with placeholders if we got fewer segments than expected.
    while (result.length < slideCount) {
      const index = result.length;
      result.push({
        index,
        text: `Slide ${index + 1}`,
        emotion: "neutral",
        scene: "abstract background",
      });
    }

    // Re-index to guarantee 0-based sequential indices.
    return result.map((slide, i) => ({ ...slide, index: i }));
  }
}

// ── Utility ───────────────────────────────────────────────────────────────

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
