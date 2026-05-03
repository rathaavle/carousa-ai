---
inclusion: manual
---

# Carousa-AI — API Reference

All endpoints require authentication. Unauthenticated requests return `401 { error, code: "UNAUTHORIZED" }`.
All error responses use the shape: `{ error: string, code: string }`.

---

## Projects

### `GET /api/project`

Returns all projects owned by the authenticated user, sorted by `updated_at` descending.

**Response 200:**

```json
{ "projects": [{ "id", "name", "theme_id", "theme", "total_slides", "created_at", "updated_at" }] }
```

---

### `POST /api/project`

Creates a new project.

**Body:**

```json
{ "name": "string", "theme_id": "uuid | null", "total_slides": 3-20 }
```

**Response 201:** `{ "project": Project }`
**Errors:** 400 BAD_REQUEST, 422 VALIDATION_ERROR

---

### `GET /api/project/[id]`

Returns a single project by ID (must be owned by the user).

**Response 200:** `{ "project": Project }`
**Errors:** 403 FORBIDDEN

---

### `DELETE /api/project/[id]`

Deletes a project and all its slides and generation records (cascade).

**Response 200:** `{ "success": true }`
**Errors:** 403 FORBIDDEN

---

## Slides

### `GET /api/slides/[projectId]`

Returns all slides for a project, ordered by `index` ascending.

**Response 200:** `{ "slides": Slide[] }`
**Errors:** 403 FORBIDDEN

---

### `PATCH /api/slides/[id]`

Updates text, emotion, or scene for a single slide.

**Body:** `{ "text"?, "emotion"?, "scene"? }` (all optional)

**Response 200:** `{ "slide": Slide }`
**Errors:** 403 FORBIDDEN, 422 VALIDATION_ERROR

---

### `POST /api/slides/reorder`

Reorders slides within a project.

**Body:** `{ "projectId": "uuid", "fromIndex": number, "toIndex": number }`

**Response 200:** `{ "slides": Slide[] }` (all slides with updated indexes)
**Errors:** 400 BAD_REQUEST, 403 FORBIDDEN

---

## AI Generation

### `POST /api/ai/generate-story`

Generates a full storyline and creates/updates all slide records.

**Body:** `{ "projectId": "uuid" }`

**Response 200:**

```json
{ "slides": Slide[], "status": "success" }
```

**Errors:** 403 FORBIDDEN, 500 AI_GENERATION_ERROR

---

### `POST /api/ai/generate-images`

Generates images for all slides in a project sequentially. Fail-graceful — partial success is possible.

**Body:** `{ "projectId": "uuid" }`

**Response 200:**

```json
{
  "completed": 5,
  "failed": 1,
  "total": 6,
  "slides": Slide[],
  "status": "success" | "partial"
}
```

**Errors:** 403 FORBIDDEN, 500 AI_GENERATION_ERROR

---

### `POST /api/ai/regenerate`

Regenerates text or image for a single slide.

**Body:** `{ "slideId": "uuid", "type": "text" | "image" }`

**Response 200:** `{ "slide": Slide, "generationId": "uuid" }`
**Errors:** 403 FORBIDDEN, 500 AI_GENERATION_ERROR

---

### `POST /api/ai/caption`

Generates an Instagram caption from all slide texts in a project.

**Body:** `{ "projectId": "uuid" }`

**Response 200:** `{ "caption": "string", "status": "success" }`
**Errors:** 403 FORBIDDEN, 500 AI_GENERATION_ERROR

---

## Brand Profile

### `GET /api/brand`

Returns the authenticated user's brand profile, or `null` if not set.

**Response 200:** `{ "brandProfile": BrandProfile | null }`

---

### `POST /api/brand`

Creates or replaces the brand profile (upsert — only one profile per user).

**Body:** `{ "color_palette"?, "lighting"?, "texture"?, "character_style"?, "style_lock"? }`

**Response 200:** `{ "brandProfile": BrandProfile }`

---

### `PATCH /api/brand`

Partially updates the brand profile (e.g. toggle `style_lock`).

**Body:** `{ "style_lock"?: boolean, ... }`

**Response 200:** `{ "brandProfile": BrandProfile }`

---

## Themes

### `GET /api/themes`

Returns all available themes (public, no auth required in practice but middleware still runs).

**Response 200:** `{ "themes": Theme[] }`

---

## Export

### `GET /api/export/[projectId]`

Downloads all slide images as a ZIP file.

**Query params:**

- `confirm=true` — skip the missing-images warning and proceed with export

**Response 200 (all slides have images):** Binary ZIP file

```
Content-Type: application/zip
Content-Disposition: attachment; filename="{project-name}-carousel.zip"
```

**Response 200 (some slides missing images, no `confirm=true`):**

```json
{
  "requiresConfirmation": true,
  "slidesWithoutImages": 2,
  "totalSlides": 6,
  "slidesWithImages": 4,
  "message": "2 dari 6 slide tidak memiliki gambar dan akan dilewati. Lanjutkan ekspor?"
}
```

**Errors:** 403 FORBIDDEN, 500 INTERNAL_ERROR

---

## Common Error Codes

| Code                  | HTTP Status | Meaning                                     |
| --------------------- | ----------- | ------------------------------------------- |
| `UNAUTHORIZED`        | 401         | No active session                           |
| `FORBIDDEN`           | 403         | Authenticated but does not own the resource |
| `BAD_REQUEST`         | 400         | Malformed request body                      |
| `VALIDATION_ERROR`    | 422         | Input failed business validation            |
| `AI_GENERATION_ERROR` | 500         | AI provider returned an error               |
| `INTERNAL_ERROR`      | 500         | Unexpected server error                     |
