/** Whether e-Builder API credentials are configured for document fetch. */
export function isEBuilderConfigured(): boolean {
  return Boolean(
    process.env.EBUILDER_ACCESS_TOKEN ||
      (process.env.EBUILDER_USERNAME && process.env.EBUILDER_PASSWORD)
  );
}

/**
 * Allowlist for e-Builder signed download URLs (SSRF protection).
 * Permits tenant S3 URLs and e-builder hostnames only.
 */
export function isAllowedEBuilderDownloadUrl(url: string): boolean {
  if (!url.startsWith("https://")) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("e-builder") || host.includes("ebuilder")) {
      return true;
    }

    return /^[^.]+\.s3[.-][^.]+\.amazonaws\.com$/.test(host);
  } catch {
    return false;
  }
}
