// ============================================================
// Carousa-AI: Custom Error Classes
// ============================================================

/**
 * Thrown when an AI provider operation fails (e.g. API error, quota exceeded).
 * Carries the `generationId` of the Generation_Record that was created for
 * the failed operation so callers can update its status.
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly generationId: string,
  ) {
    super(message);
    this.name = "AIGenerationError";
    // Maintain proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request is made by an authenticated user who does not have
 * permission to access or modify the requested resource.
 */
export class AuthorizationError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when user-supplied input fails validation rules.
 * The optional `field` property identifies which input field caused the error.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a method is called on a provider that does not support it.
 * For example, calling `generateImage()` on GeminiProvider (text-only).
 */
export class UnsupportedOperationError extends Error {
  constructor(providerName: string, operation: string) {
    super(`${providerName} does not support the "${operation}" operation.`);
    this.name = "UnsupportedOperationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
