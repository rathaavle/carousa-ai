---
inclusion: manual
---

# Carousa-AI — AI System Reference

## Overview

The AI system uses two providers behind a unified `AIProvider` interface:

| Provider      | Class               | Capability            | Model                                      |
| ------------- | ------------------- | --------------------- | ------------------------------------------ |
| Google Gemini | `GeminiProvider`    | Text generation only  | `gemini-1.5-flash`                         |
| Stability AI  | `StabilityProvider` | Image generation only | SDXL 1.0 (`stable-diffusion-xl-1024-v1-0`) |

All AI operations are coordinated by `AI_Orchestrator` in `modules/ai/orchestrator.ts`. Never call providers directly from API routes or other modules.

## AIProvider Interface (`lib/ai/provider.ts`)

```typescript
interface AIProvider {
  generateText(prompt: string, options?: TextOptions): Promise<TextResult>;
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
}

interface TextOptions {
  maxTokens?: number;
  temperature?: number;
}
interface ImageOptions {
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
}
interface TextResult {
  content: string;
  tokensUsed?: number;
}
interface ImageResult {
  imageBuffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
}
```

Providers that don't support an operation throw `UnsupportedOperationError`.

## AI_Orchestrator Public Methods

```typescript
class AI_Orchestrator {
  constructor(supabase: SupabaseClient);

  // Generate a full carousel storyline text via Gemini
  generateStory(context: StoryContext): Promise<StoryResult>;

  // Parse a storyline text into exactly N slide segments
  generateSlides(storyText: string, slideCount: number): Promise<SlideData[]>;

  // Build a structured SDXL prompt for a slide (saves prompt to slide record)
  generatePrompt(
    slide: Slide,
    brandProfile: BrandProfile | null,
    theme: Theme,
  ): Promise<string>;

  // Generate an image via Stability AI
  generateImage(prompt: string): Promise<ImageResult>;

  // Regenerate text for a single slide via Gemini
  regenerateSlideText(slide: Slide, theme: Theme): Promise<string>;

  // Generate an Instagram caption from all slide texts via Gemini
  generateCaption(projectId: string, slides: Slide[]): Promise<string>;
}
```

Every method:

1. Creates a `Generation_Record` with `status: 'processing'` before calling the provider.
2. Updates the record to `status: 'success'` with metadata on success.
3. Updates the record to `status: 'failed'` with `error_msg` on failure.
4. Throws `AIGenerationError(message, generationId)` on failure so callers can surface it.

## Generation Record Lifecycle

```
Before call  → INSERT generations { status: 'processing', type, provider, project_id, slide_id }
On success   → UPDATE generations SET status = 'success', metadata = { tokensUsed, ... }
On failure   → UPDATE generations SET status = 'failed', error_msg = '...'
               → throw AIGenerationError(message, generationId)
```

## Prompt Builder (`lib/prompt/builder.ts`)

`PromptBuilder.build(params)` assembles a 7-component English prompt for SDXL:

```
[GLOBAL STYLE] [BRAND STYLE] [CHARACTER] [SCENE] [EMOTION] [COMPOSITION] [TYPOGRAPHY]
```

| Component    | Source                                                                      | Condition                              |
| ------------ | --------------------------------------------------------------------------- | -------------------------------------- |
| GLOBAL STYLE | `theme.mood + theme.color_base + theme.lighting`                            | Always                                 |
| BRAND STYLE  | `brandProfile.color_palette + brandProfile.lighting + brandProfile.texture` | Only when `styleLockEnabled = true`    |
| CHARACTER    | `brandProfile.character_style`                                              | Only when `styleLockEnabled = true`    |
| SCENE        | `slide.scene`                                                               | Always (falls back to generic default) |
| EMOTION      | `slide.emotion`                                                             | Always (falls back to generic default) |
| COMPOSITION  | Fixed rules for Instagram square/portrait                                   | Always                                 |
| TYPOGRAPHY   | Fixed typography style for text overlays                                    | Always                                 |

All 7 components are always present in the output — components without data fall back to sensible defaults. This guarantees Property 11 (prompt completeness).

**Style Lock rule (Property 12):** Brand attributes appear in the prompt if and only if `styleLockEnabled = true` AND a `brandProfile` exists.

## Carousel Workflow (CarouselModule)

### `generateStoryline(projectId, userId)`

1. Fetch project + theme (verify ownership).
2. Call `AI_Orchestrator.generateStory()` → raw storyline text.
3. Call `AI_Orchestrator.generateSlides()` → exactly `total_slides` segments (Property 7).
4. Upsert slide rows to DB (conflict key: `project_id + index`).
5. Return slides sorted by index.

### `generateAllImages(projectId, userId)`

For each slide sequentially:

1. `AI_Orchestrator.generatePrompt()` → build + save prompt.
2. `AI_Orchestrator.generateImage()` → image buffer.
3. `uploadSlideImage()` → upload to Supabase Storage → public URL.
4. `updateSlide()` → save `image_url` to DB.

Failures on individual slides are caught and counted — they do not abort the batch (fail-gracefully, Property 7.3). Returns `{ completed, failed, total, slides }`.

### `regenerateSlide(slideId, type, userId)`

- `type: 'image'` → fetch latest brand profile → rebuild prompt → generate new image → replace `image_url`.
- `type: 'text'` → call Gemini with theme + slide position context → replace `text`.
- On failure: preserve existing content, log to Generation_Record, throw error.

### `generateCaption(projectId, userId)`

Collects all slide texts → sends to Gemini → returns caption with narrative, CTA, and ≥10 hashtags (Property 14).

## Error Handling in AI Operations

```typescript
// Pattern used in every AI_Orchestrator method
const genRecord = await this.createRecord({ projectId, type, provider });
try {
  const result = await provider.generateX(prompt, options);
  await this.updateRecord(genRecord.id, { status: "success", metadata });
  return result;
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : "Unknown error";
  await this.updateRecord(genRecord.id, {
    status: "failed",
    error_msg: errorMsg,
  });
  throw new AIGenerationError(errorMsg, genRecord.id);
}
```

API routes catch `AIGenerationError` and return HTTP 500 with a user-friendly Indonesian message. The `generationId` is logged server-side for debugging.
