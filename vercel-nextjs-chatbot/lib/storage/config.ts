/**
 * @file GCS storage configuration and feature flags.
 */

/** Default signed URL lifetime (1 hour). */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Returns the configured GCS bucket name.
 * @throws When GCS_BUCKET_NAME is not set.
 */
export function getGcsBucketName(): string {
  const bucket = process.env.GCS_BUCKET_NAME;
  if (!bucket) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set");
  }
  return bucket;
}

/**
 * Returns the GCP project ID for storage operations.
 */
export function getGcsProjectId(): string | undefined {
  return process.env.GCS_PROJECT_ID ?? process.env.GCP_PROJECT_ID;
}

/**
 * Signed URL TTL in seconds for agent and UI access.
 */
export function getSignedUrlTtlSeconds(): number {
  const raw = process.env.GCS_SIGNED_URL_TTL_SECONDS;
  if (!raw) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
}

/**
 * Whether GCS upload is configured (bucket name present).
 */
export function isGcsStorageEnabled(): boolean {
  return Boolean(process.env.GCS_BUCKET_NAME);
}
