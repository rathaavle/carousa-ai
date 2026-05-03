// ============================================================
// Carousa-AI: Input Validation Utilities
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a project name.
 * Rejects empty strings or strings that consist entirely of whitespace.
 *
 * Requirements: 2.4
 */
export function validateProjectName(name: string): ValidationResult {
  if (typeof name !== "string" || name.trim().length === 0) {
    return {
      valid: false,
      error: "Nama project tidak boleh kosong.",
    };
  }
  return { valid: true };
}

/**
 * Validates the number of slides for a project.
 * Accepts only integer values in the inclusive range [3, 20].
 *
 * Requirements: 3.4, 3.5
 */
export function validateSlideCount(count: number): ValidationResult {
  if (!Number.isInteger(count) || count < 3 || count > 20) {
    return {
      valid: false,
      error: "Jumlah slide harus berupa angka antara 3 dan 20.",
    };
  }
  return { valid: true };
}
