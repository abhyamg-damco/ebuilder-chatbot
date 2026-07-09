import "server-only";

import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

/**
 * pdfjs-dist (used by pdf-parse) expects browser canvas APIs when its module loads.
 * Call this before dynamically importing pdf-parse in Node / Cloud Run.
 */
export function installPdfPolyfills(): void {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix;
  }

  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = Path2D as typeof globalThis.Path2D;
  }

  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = ImageData as typeof globalThis.ImageData;
  }
}

installPdfPolyfills();
