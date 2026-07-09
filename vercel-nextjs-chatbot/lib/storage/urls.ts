/**
 * @file URL helpers for upload access (proxy vs signed GCS URLs).
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Builds the authenticated app proxy URL that streams file bytes from GCS.
 */
export function buildUploadContentUrl({
  uploadId,
  origin,
}: {
  uploadId: string;
  origin: string;
}): string {
  return `${origin}${basePath}/api/files/${uploadId}/content`;
}

/**
 * Resolves request origin for absolute URL construction.
 */
export function getRequestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
