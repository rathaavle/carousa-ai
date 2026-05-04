// ============================================================
// Carousa-AI: GeminiProvider — text & image generation via Google Gemini
// ============================================================
// This module is SERVER-SIDE ONLY. The GEMINI_API_KEY environment
// variable must never be exposed to the browser bundle.

import { GoogleGenAI } from "@google/genai";
import type {
  AIProvider,
  TextOptions,
  TextResult,
  ImageOptions,
  ImageResult,
} from "./provider";

/** Default model for text generation. */
const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";

/**
 * Implements `AIProvider` using Google Gemini for both text and image generation.
 *
 * Text generation uses `gemini-1.5-flash` (configurable).
 * Image generation uses `gemini-2.5-flash-image` (Gemini native image model).
 */
export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;
  /** Default model to use for text generation. */
  private readonly modelName: string;

  constructor(apiKey?: string, modelName = DEFAULT_TEXT_MODEL) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GeminiProvider: GEMINI_API_KEY is not set. " +
          "Provide it via the environment variable or the constructor argument.",
      );
    }
    this.client = new GoogleGenAI({ apiKey: key });
    this.modelName = modelName;
  }

  /**
   * Generate text using Google Gemini.
   *
   * @param prompt  The instruction / context string.
   * @param options Optional generation parameters (temperature, maxTokens).
   * @returns       The generated text and token usage (if available).
   */
  async generateText(
    prompt: string,
    options?: TextOptions,
  ): Promise<TextResult> {
    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        ...(options?.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options?.maxTokens !== undefined && {
          maxOutputTokens: options.maxTokens,
        }),
      },
    });

    const content = response.text ?? "";
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? undefined;

    return { content, tokensUsed };
  }

  /**
   * Generate an image using Pollinations AI (free, no API key required).
   * Retries up to 3 times with exponential backoff on rate limit errors.
   *
   * @param prompt  The image description string (English recommended).
   * @param options Optional generation parameters (width, height).
   * @returns       The generated image as a Buffer with its MIME type.
   */
  async generateImage(
    prompt: string,
    options?: ImageOptions,
  ): Promise<ImageResult> {
    const width = options?.width ?? 1024;
    const height = options?.height ?? 1024;

    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux`;

    const maxRetries = 3;
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 5s, 10s
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
      }

      const response = await fetch(url);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        return { imageBuffer, mimeType: "image/jpeg" };
      }

      if (response.status === 429) {
        lastError = new Error(
          `PollinationsProvider: Image request failed with status 429`,
        );
        continue; // retry
      }

      throw new Error(
        `PollinationsProvider: Image request failed with status ${response.status}`,
      );
    }

    throw lastError;
  }
}
