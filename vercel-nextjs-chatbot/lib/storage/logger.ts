/**
 * @file Structured logging for GCS storage operations.
 */

/**
 * Logs a storage error with context to the server console.
 */
export function logStorageError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[storage:${context}]`, {
    message,
    stack,
    ...extra,
  });
}

/**
 * Returns a safe error message for API responses (detailed in development).
 */
export function getPublicErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }

  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}
