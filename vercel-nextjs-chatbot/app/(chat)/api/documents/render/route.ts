import mammoth from "mammoth";
import { auth } from "@/app/(auth)/auth";
import { fetchEBuilderDocumentByFileId } from "@/lib/ebuilder/documents";
import { ChatbotError } from "@/lib/errors";

function wrapHtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      padding: 1.25rem;
      margin: 0;
      color: #111827;
      background: #fff;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #d1d5db; padding: 0.375rem 0.5rem; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function isDocx(contentType: string, fileName: string): boolean {
  if (contentType.includes("wordprocessingml") || contentType.includes("msword")) {
    return true;
  }
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === "doc" || extension === "docx";
}

function isPdf(contentType: string, fileName: string): boolean {
  if (contentType.includes("pdf")) {
    return true;
  }
  return fileName.toLowerCase().endsWith(".pdf");
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/** HTML fallback when render fails — avoids raw JSON inside iframe. */
function renderUnavailableHtml(fileId: string): string {
  const downloadPath = `/api/documents/preview?fileId=${encodeURIComponent(fileId)}`;
  return wrapHtmlDocument(
    "Preview unavailable",
    `<p>Document could not be retrieved from e-Builder.</p>
<p><a href="${downloadPath}">Download document</a></p>`
  );
}

function unavailableDocumentResponse(fileId: string): Response {
  return new Response(renderUnavailableHtml(fileId), {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Fetch e-Builder document bytes and return an inline-renderable response
 * (PDF/image stream or HTML for Word documents).
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

  try {
    const document = await fetchEBuilderDocumentByFileId(fileId);

    if (!document) {
      return unavailableDocumentResponse(fileId);
    }

    const { buffer, fileName, contentType } = document;

    if (isDocx(contentType, fileName)) {
      const result = await mammoth.convertToHtml({ buffer });
      const html = wrapHtmlDocument(fileName, result.value);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    if (isPdf(contentType, fileName)) {
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    if (isImage(contentType)) {
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Failed to render document from e-Builder"
    ).toResponse();
  }
}
