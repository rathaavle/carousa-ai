---
inclusion: always
---

# Carousa-AI — Coding Conventions

## TypeScript

- Strict mode is enabled. No `any` types — use `unknown` and narrow explicitly.
- All functions must have explicit return types.
- Use `interface` for object shapes that represent entities or contracts. Use `type` for unions, intersections, and utility aliases.
- Prefer named exports over default exports (except for Next.js page/layout components which require default exports).

## Error Handling

Always use the custom error classes from `lib/utils/errors.ts`:

```typescript
// For AI provider failures
throw new AIGenerationError("message", generationId);

// For unauthorized access to a resource
throw new AuthorizationError("message");

// For invalid user input
throw new ValidationError("message", "fieldName");

// For calling a method a provider doesn't support
throw new UnsupportedOperationError("ProviderName", "methodName");
```

API routes must map these to HTTP status codes:

- `AuthorizationError` → 403
- `ValidationError` → 422
- `AIGenerationError` → 500
- Unknown errors → 500 (log details server-side, return generic message to client)

All API error responses use the shape `{ error: string, code: string }`.

## API Routes

Every API route follows this pattern:

```typescript
// 1. Authenticate
const userId = await getAuthenticatedUserId();
if (!userId) return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);

// 2. Parse body (for POST/PATCH)
let body: unknown;
try { body = await request.json(); }
catch { return errorResponse("Body permintaan tidak valid.", "BAD_REQUEST", 400); }

// 3. Delegate to module
try {
  const result = await someModule.doSomething(userId, ...);
  return NextResponse.json({ result }, { status: 200 });
} catch (err) {
  if (err instanceof AuthorizationError) return errorResponse(err.message, "FORBIDDEN", 403);
  if (err instanceof ValidationError) return errorResponse(err.message, "VALIDATION_ERROR", 422);
  console.error("[route-name] error:", err);
  return errorResponse("Terjadi kesalahan internal.", "INTERNAL_ERROR", 500);
}
```

## Modules

- Modules are server-side only. Add `// SERVER-SIDE ONLY` comment at the top.
- Every module function that mutates data must verify ownership before proceeding.
- Use `createClient()` from `lib/db/server.ts` inside module functions — do not accept a Supabase client as a parameter unless the function is a helper called within the same module.
- Exception: `AI_Orchestrator` accepts a `SupabaseClient` in its constructor because it is always instantiated inside a module that already has a client.

## Database Queries (`lib/db/queries.ts`)

- All queries live in `queries.ts`. No raw Supabase calls outside this file (except in `modules/export` which uses the service client directly for storage).
- Query functions accept a `SupabaseClient` as the first parameter.
- Return `null` (not throw) when a single-row query finds no result.
- Throw the Supabase error for unexpected failures.

## Client Components & Stores

- Client components use Zustand stores for all async state — no `useState` + `useEffect` for data fetching.
- Stores implement optimistic updates: update local state immediately, roll back on API failure.
- Per-slide generation status uses the `SlideGenerationStatus` type: `"idle" | "processing" | "done" | "failed"`.
- Never import anything from `modules/` or `lib/ai/` in client components.

## Naming

| Thing                 | Convention      | Example                             |
| --------------------- | --------------- | ----------------------------------- |
| Files                 | kebab-case      | `gemini-provider.ts`                |
| React components      | PascalCase      | `SlideCard.tsx`                     |
| Classes               | PascalCase      | `AI_Orchestrator`, `CarouselModule` |
| Functions             | camelCase       | `generateStoryline`                 |
| Constants             | SCREAMING_SNAKE | `STABILITY_API_BASE`                |
| DB table names        | snake_case      | `brand_profiles`                    |
| TypeScript interfaces | PascalCase      | `BrandProfile`                      |

## Comments

- Every exported function must have a JSDoc comment explaining its purpose, parameters, and what it throws.
- Reference requirement numbers in comments where relevant: `// Requirements: 7.2, 7.3`.
- Property test tags must follow the format: `// Feature: carousa-ai, Property N: description`.

## Language

- Error messages shown to users are in **Indonesian** (Bahasa Indonesia).
- Code comments, JSDoc, and variable names are in **English**.
- AI prompts sent to Stability AI must be in **English** (SDXL compatibility).

## Testing

- Test files live in `tests/unit/` or `tests/integration/` mirroring the source structure.
- Property-based tests use `fast-check` with `numRuns: 100` minimum.
- Run tests with `npm test` (single run) or `npm run test:watch` (watch mode).
- Do not add tests unless explicitly requested.
