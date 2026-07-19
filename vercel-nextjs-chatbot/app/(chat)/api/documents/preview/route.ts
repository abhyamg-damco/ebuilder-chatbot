import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";

async function authenticateEBuilder(
  baseUrl: string
): Promise<string | null> {
  const accessToken = process.env.EBUILDER_ACCESS_TOKEN;
  if (accessToken) {
    return accessToken;
  }

  const username = process.env.EBUILDER_USERNAME;
  const password = process.env.EBUILDER_PASSWORD;

  if (!username || !password) {
    return null;
  }

  const authResponse = await fetch(`${baseUrl}/api/v2/Authenticate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!authResponse.ok) {
    return null;
  }

  const payload = (await authResponse.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

/**
 * Proxy e-Builder document bytes when EBUILDER_* env credentials are configured.
 * Used by file-preview artifacts via previewPath from search_documents MCP tool.
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

  const baseUrl =
    process.env.EBUILDER_BASE_URL ?? "https://api2-us2.e-builder.net";
  const token = await authenticateEBuilder(baseUrl);

  if (!token) {
    return new ChatbotError(
      "bad_request:api",
      "e-Builder credentials not configured for document preview"
    ).toResponse();
  }

  try {
    const downloadResponse = await fetch(
      `${baseUrl}/api/v2/Documents/${encodeURIComponent(fileId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/octet-stream, application/pdf, image/*, */*",
        },
      }
    );

    if (!downloadResponse.ok) {
      return new ChatbotError(
        "not_found:document",
        "Document file could not be retrieved from e-Builder"
      ).toResponse();
    }

    const contentType =
      downloadResponse.headers.get("content-type") ?? "application/octet-stream";
    const body = await downloadResponse.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Failed to fetch document from e-Builder"
    ).toResponse();
  }
}
