import { auth } from "@/app/(auth)/auth";
import {
  authenticateEBuilder,
  getEBuilderBaseUrl,
  resolveDocumentDownloadUrl,
} from "@/lib/ebuilder/documents";
import { ChatbotError } from "@/lib/errors";

/**
 * Resolve e-Builder document download URL and redirect.
 * Fallback when signed DownloadURL from MCP has expired; used via previewPath.
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter fileId is required"
    ).toResponse();
  }

  const baseUrl = getEBuilderBaseUrl();
  const token = await authenticateEBuilder(baseUrl);

  if (!token) {
    return new ChatbotError(
      "bad_request:api",
      "e-Builder credentials not configured for document preview"
    ).toResponse();
  }

  try {
    const resolved = await resolveDocumentDownloadUrl(baseUrl, token, fileId);

    if (!resolved) {
      return new ChatbotError(
        "not_found:document",
        "Document file could not be retrieved from e-Builder"
      ).toResponse();
    }

    return Response.redirect(resolved.downloadUrl, 302);
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Failed to fetch document from e-Builder"
    ).toResponse();
  }
}
