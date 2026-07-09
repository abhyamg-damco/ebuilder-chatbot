/**
 * @file Document text extraction for agent context.
 */
import "server-only";

import mammoth from "mammoth";
import type { AllowedMimeType, UploadCategory } from "./mime";
import { logStorageError } from "./logger";

const TEXT_PREVIEW_MAX_CHARS = 8000;

export type ExtractedDocumentText = {
  extractedTextPreview?: string;
  pageCount?: number;
};

type PdfParseCtor = typeof import("pdf-parse").PDFParse;

let pdfParseCtorPromise: Promise<PdfParseCtor> | undefined;

/**
 * Lazily loads pdf-parse after installing Node canvas polyfills required by pdfjs-dist.
 * Avoids top-level import so routes that only handle images/DOCX do not crash on module load.
 */
async function getPdfParseCtor(): Promise<PdfParseCtor> {
  if (!pdfParseCtorPromise) {
    pdfParseCtorPromise = (async () => {
      await import("./pdf-polyfills");
      const { PDFParse } = await import("pdf-parse");
      return PDFParse;
    })();
  }

  return pdfParseCtorPromise;
}

/**
 * Extracts plain text from uploaded document buffers for agent/system-prompt context.
 * Office formats are not sent as native model file parts — text preview is used instead.
 */
export async function extractTextPreview({
  buffer,
  mimeType,
  category,
}: {
  buffer: Buffer;
  mimeType: AllowedMimeType;
  category: UploadCategory;
}): Promise<ExtractedDocumentText> {
  if (category === "image") {
    return {};
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = buffer.toString("utf8").slice(0, TEXT_PREVIEW_MAX_CHARS);
    return { extractedTextPreview: text };
  }

  if (mimeType === "application/pdf") {
    try {
      const PDFParse = await getPdfParseCtor();
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return {
        extractedTextPreview: result.text.slice(0, TEXT_PREVIEW_MAX_CHARS),
        pageCount: result.total,
      };
    } catch (error) {
      logStorageError("extractTextPreview:pdf", error);
      return {};
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      if (!text) {
        return {};
      }
      return {
        extractedTextPreview: text.slice(0, TEXT_PREVIEW_MAX_CHARS),
      };
    } catch (error) {
      logStorageError("extractTextPreview:docx", error);
      return {};
    }
  }

  return {};
}
