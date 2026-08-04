/**
 * @file Document text extraction for agent context.
 */
import "server-only";

import mammoth from "mammoth";
import type { AllowedMimeType, UploadCategory } from "./mime";
import { logStorageError } from "./logger";

const TEXT_PREVIEW_MAX_CHARS = 8000;

export { TEXT_PREVIEW_MAX_CHARS };

export type ExtractedDocumentText = {
  extractedTextPreview?: string;
  pageCount?: number;
  /** True when source text exceeded the preview cap. */
  truncated?: boolean;
  supported?: boolean;
  unsupportedReason?: string;
};

type PdfParseCtor = typeof import("pdf-parse").PDFParse;

let pdfParseCtorPromise: Promise<PdfParseCtor> | undefined;
let xlsxModulePromise: Promise<typeof import("xlsx")> | undefined;

async function getXlsxModule(): Promise<typeof import("xlsx")> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

function capText(text: string): { preview: string; truncated: boolean } {
  if (text.length <= TEXT_PREVIEW_MAX_CHARS) {
    return { preview: text, truncated: false };
  }
  return {
    preview: text.slice(0, TEXT_PREVIEW_MAX_CHARS),
    truncated: true,
  };
}

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
    return {
      supported: false,
      unsupportedReason:
        "Image files are available for vision preview only, not text extraction.",
    };
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const { preview, truncated } = capText(buffer.toString("utf8"));
    return {
      extractedTextPreview: preview,
      truncated,
      supported: true,
    };
  }

  if (mimeType === "application/pdf") {
    try {
      const PDFParse = await getPdfParseCtor();
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      const { preview, truncated } = capText(result.text);
      return {
        extractedTextPreview: preview,
        pageCount: result.total,
        truncated,
        supported: true,
      };
    } catch (error) {
      logStorageError("extractTextPreview:pdf", error);
      return {
        supported: false,
        unsupportedReason: "PDF text extraction failed.",
      };
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      let text = result.value.trim();
      if (!text) {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        text = htmlResult.value
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (!text) {
        return {
          supported: false,
          unsupportedReason: "Word document contained no extractable text.",
        };
      }
      const { preview, truncated } = capText(text);
      return {
        extractedTextPreview: preview,
        truncated,
        supported: true,
      };
    } catch (error) {
      logStorageError("extractTextPreview:docx", error);
      return {
        supported: false,
        unsupportedReason: "Word document text extraction failed.",
      };
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    try {
      const XLSX = await getXlsxModule();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames.at(0);
      if (!firstSheetName) {
        return {
          supported: false,
          unsupportedReason: "Spreadsheet has no sheets.",
        };
      }
      const sheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const { preview, truncated } = capText(csv.trim());
      return {
        extractedTextPreview: preview,
        truncated,
        supported: true,
      };
    } catch (error) {
      logStorageError("extractTextPreview:xlsx", error);
      return {
        supported: false,
        unsupportedReason: "Spreadsheet text extraction failed.",
      };
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return {
      supported: false,
      unsupportedReason:
        "PowerPoint text extraction is not supported yet. Use file-preview for visual access.",
    };
  }

  return {
    supported: false,
    unsupportedReason: `Unsupported document type: ${mimeType}`,
  };
}
