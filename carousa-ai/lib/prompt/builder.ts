// ============================================================
// Carousa-AI: Prompt_Builder
// ============================================================
// Assembles a structured English prompt for Stability AI from
// theme, slide, and (optionally) brand profile data.
//
// Output structure:
//   [GLOBAL STYLE] [BRAND STYLE] [CHARACTER] [SCENE] [EMOTION]
//   [COMPOSITION] [TYPOGRAPHY]

import type { Theme, Slide, BrandProfile } from "@/lib/db/types";

/**
 * Input parameters for `PromptBuilder.build()`.
 */
export interface PromptParams {
  /** The project theme (mood, color base, lighting). */
  theme: Theme;
  /** The slide whose content drives the scene and emotion. */
  slide: Slide;
  /**
   * The user's brand profile.
   * May be `null` if the user has not configured one yet.
   */
  brandProfile: BrandProfile | null;
  /**
   * When `true`, brand attributes (color palette, lighting, texture,
   * character style) are injected into the prompt.
   * When `false`, only theme and slide data are used.
   */
  styleLockEnabled: boolean;
}

/**
 * Builds structured image-generation prompts for Stability AI.
 *
 * All output is in English to ensure maximum compatibility with SDXL.
 */
export class PromptBuilder {
  /**
   * Assemble a prompt from the provided parameters.
   *
   * The seven components are always present in the output, even if a
   * component falls back to a generic default value. This guarantees
   * Property 11 (all 7 components present) and Property 12 (Style Lock
   * conditionality).
   *
   * @param params  Theme, slide, brand profile, and style-lock flag.
   * @returns       A single English prompt string ready for SDXL.
   */
  build(params: PromptParams): string {
    const { theme, slide, brandProfile, styleLockEnabled } = params;

    // ── 1. GLOBAL STYLE ──────────────────────────────────────────────────
    // Derived from the project theme: mood + color base + lighting.
    const globalStyle = this.buildGlobalStyle(theme);

    // ── 2. BRAND STYLE ───────────────────────────────────────────────────
    // Included only when Style Lock is active AND a brand profile exists.
    const brandStyle = this.buildBrandStyle(brandProfile, styleLockEnabled);

    // ── 3. CHARACTER ─────────────────────────────────────────────────────
    // Character visual style from brand profile (if style lock active),
    // otherwise a neutral default.
    const character = this.buildCharacter(brandProfile, styleLockEnabled);

    // ── 4. SCENE ─────────────────────────────────────────────────────────
    // Scene description from the slide.
    const scene = this.buildScene(slide);

    // ── 5. EMOTION ───────────────────────────────────────────────────────
    // Emotional tone from the slide.
    const emotion = this.buildEmotion(slide);

    // ── 6. COMPOSITION ───────────────────────────────────────────────────
    // Fixed composition rules optimised for Instagram square/portrait.
    const composition = this.buildComposition();

    // ── 7. TYPOGRAPHY ────────────────────────────────────────────────────
    // Typography style for any text overlays in the image.
    const typography = this.buildTypography(
      theme,
      brandProfile,
      styleLockEnabled,
    );

    // Assemble all components, filtering out empty strings.
    const parts = [
      `[GLOBAL STYLE] ${globalStyle}`,
      `[BRAND STYLE] ${brandStyle}`,
      `[CHARACTER] ${character}`,
      `[SCENE] ${scene}`,
      `[EMOTION] ${emotion}`,
      `[COMPOSITION] ${composition}`,
      `[TYPOGRAPHY] ${typography}`,
    ];

    return parts.join(", ");
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private buildGlobalStyle(theme: Theme): string {
    const parts: string[] = [];

    if (theme.mood) parts.push(`${theme.mood} mood`);
    if (theme.color_base) parts.push(`${theme.color_base} color palette`);
    if (theme.lighting) parts.push(`${theme.lighting} lighting`);

    return parts.length > 0
      ? parts.join(", ")
      : "cinematic, high quality, detailed";
  }

  private buildBrandStyle(
    brandProfile: BrandProfile | null,
    styleLockEnabled: boolean,
  ): string {
    if (!styleLockEnabled || !brandProfile) {
      return "no specific brand style";
    }

    const parts: string[] = [];

    if (brandProfile.color_palette) {
      parts.push(`color palette: ${brandProfile.color_palette}`);
    }
    if (brandProfile.lighting) {
      parts.push(`lighting: ${brandProfile.lighting}`);
    }
    if (brandProfile.texture) {
      parts.push(`texture: ${brandProfile.texture}`);
    }

    return parts.length > 0 ? parts.join(", ") : "no specific brand style";
  }

  private buildCharacter(
    brandProfile: BrandProfile | null,
    styleLockEnabled: boolean,
  ): string {
    if (styleLockEnabled && brandProfile?.character_style) {
      return brandProfile.character_style;
    }
    return "faceless character, silhouette, anonymous figure";
  }

  private buildScene(slide: Slide): string {
    return slide.scene?.trim() || "abstract background, minimal environment";
  }

  private buildEmotion(slide: Slide): string {
    return slide.emotion?.trim() || "neutral, calm";
  }

  private buildComposition(): string {
    return (
      "centered composition, rule of thirds, " +
      "Instagram-optimized square format 1:1, " +
      "clean negative space, visually balanced"
    );
  }

  private buildTypography(
    theme: Theme,
    brandProfile: BrandProfile | null,
    styleLockEnabled: boolean,
  ): string {
    // Use brand character style as a hint for typography when style lock is on.
    if (styleLockEnabled && brandProfile?.character_style) {
      return `elegant typography consistent with ${theme.mood} aesthetic`;
    }
    return `clean modern typography, ${theme.mood} aesthetic`;
  }
}
