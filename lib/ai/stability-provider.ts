// ============================================================
// Carousa-AI: StabilityProvider — image generation via Stability AI
// ============================================================
// This module is SERVER-SIDE ONLY. The STABILITY_API_KEY environment
// variable must never be exposed to the browser bundle.

import type {
  AIProvider,
  ImageOptions,
  ImageResult,
  TextOptions,
  TextResult,
} from "./provider";
import { UnsupportedOperationError } from "@/lib/utils/errors";

/** Stability AI REST API base URL. */
const STABILITY_API_BASE = "https://api.stability.ai";

/** Default SDXL model endpoint. */
const DEFAULT_ENGINE = "stable-diffusion-xl-1024-v1-0";

/**
 * Implements `AIProvider` using Stability AI (SDXL) for image generation.
 *
 * `generateText()` is intentionally unsupported — use `GeminiProvider`
 * for text generation.
 */
export class StabilityProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly engineId: string;

  constructor(apiKey?: string, engineId = DEFAULT_ENGINE) {
    const key = apiKey ?? process.env.STABILITY_API_KEY;
    if (!key) {
      throw new Error(
        "StabilityProvider: STABILITY_API_KEY is not set. " +
          "Provide it via the environment variable or the constructor argument.",
      );
    }
    this.apiKey = key;
    this.engineId = engineId;
  }

  /**
   * Not supported by StabilityProvider.
   * @throws {UnsupportedOperationError} Always.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateText(
    _prompt: string,
    _options?: TextOptions,
  ): Promise<TextResult> {
    throw new UnsupportedOperationError("StabilityProvider", "generateText");
  }

  /**
   * Generate an image using Stability AI's REST API.
   *
   * @param prompt  The image description / instruction string (must be in English).
   * @param options Optional generation parameters (width, height, steps, cfgScale).
   * @returns       The generated image as a Buffer with its MIME type.
   */
  async generateImage(
    prompt: string,
    options?: ImageOptions,
  ): Promise<ImageResult> {
    const width = options?.width ?? 1024;
    const height = options?.height ?? 1024;
    const steps = options?.steps ?? 30;
    const cfgScale = options?.cfgScale ?? 7;

    const url = `${STABILITY_API_BASE}/v1/generation/${this.engineId}/text-to-image`;

    const body = JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: cfgScale,
      width,
      height,
      steps,
      samples: 1,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `StabilityProvider: API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const json = (await response.json()) as {
      artifacts: Array<{ base64: string; finishReason: string; seed: number }>;
    };

    const artifact = json.artifacts?.[0];
    if (!artifact?.base64) {
      throw new Error(
        "StabilityProvider: No image artifact returned by the API.",
      );
    }

    const imageBuffer = Buffer.from(artifact.base64, "base64");

    return {
      imageBuffer,
      mimeType: "image/png",
    };
  }
}
