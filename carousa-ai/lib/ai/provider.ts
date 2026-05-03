// ============================================================
// Carousa-AI: AIProvider Interface & Result Types
// ============================================================

/**
 * Options for text generation requests.
 */
export interface TextOptions {
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** Sampling temperature (0.0 – 1.0). Higher = more creative. */
  temperature?: number;
}

/**
 * Options for image generation requests.
 */
export interface ImageOptions {
  /** Output width in pixels. */
  width?: number;
  /** Output height in pixels. */
  height?: number;
  /** Number of inference steps (quality vs. speed trade-off). */
  steps?: number;
  /** Guidance scale — how closely the model follows the prompt. */
  cfgScale?: number;
}

/**
 * Result returned by a successful text generation call.
 */
export interface TextResult {
  /** The generated text content. */
  content: string;
  /** Number of tokens consumed (if reported by the provider). */
  tokensUsed?: number;
}

/**
 * Result returned by a successful image generation call.
 */
export interface ImageResult {
  /** Raw image data as a Node.js Buffer. */
  imageBuffer: Buffer;
  /** MIME type of the generated image. */
  mimeType: "image/jpeg" | "image/png";
}

/**
 * Unified contract for all AI providers used by Carousa-AI.
 *
 * Each concrete provider (GeminiProvider, StabilityProvider) implements
 * this interface. Methods that are not supported by a provider must throw
 * an `UnsupportedOperationError` rather than silently failing.
 */
export interface AIProvider {
  /**
   * Generate text from a prompt.
   * @param prompt  The instruction / context string.
   * @param options Optional generation parameters.
   */
  generateText(prompt: string, options?: TextOptions): Promise<TextResult>;

  /**
   * Generate an image from a prompt.
   * @param prompt  The image description / instruction string.
   * @param options Optional generation parameters.
   */
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
}
