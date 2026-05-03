// ============================================================
// Carousa-AI: GeminiProvider — text generation via Google Gemini
// ============================================================
// This module is SERVER-SIDE ONLY. The GEMINI_API_KEY environment
// variable must never be exposed to the browser bundle.

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProvider,
  TextOptions,
  TextResult,
  ImageOptions,
  ImageResult,
} from "./provider";
import { UnsupportedOperationError } from "@/lib/utils/errors";

/**
 * Implements `AIProvider` using Google Gemini for text generation.
 *
 * `generateImage()` is intentionally unsupported — use `StabilityProvider`
 * for image generation.
 */
export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenerativeAI;
  /** Default model to use for text generation. */
  private readonly modelName: string;

  constructor(apiKey?: string, modelName = "gemini-1.5-flash") {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GeminiProvider: GEMINI_API_KEY is not set. " +
          "Provide it via the environment variable or the constructor argument.",
      );
    }
    this.client = new GoogleGenerativeAI(key);
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
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        ...(options?.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options?.maxTokens !== undefined && {
          maxOutputTokens: options.maxTokens,
        }),
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    return {
      content,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  }

  /**
   * Not supported by GeminiProvider.
   * @throws {UnsupportedOperationError} Always.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateImage(
    _prompt: string,
    _options?: ImageOptions,
  ): Promise<ImageResult> {
    throw new UnsupportedOperationError("GeminiProvider", "generateImage");
  }
}
