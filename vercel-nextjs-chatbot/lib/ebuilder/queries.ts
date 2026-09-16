/**
 * Request bodies for the e-Builder Documents API.
 *
 * Kept out of `documents.ts` so it can be imported without `server-only`,
 * the same reason `download-url-policy.ts` sits on its own.
 */

/**
 * The only equality operator e-Builder accepts on a Documents query.
 *
 * `EQ`, `EQUALS` and `==` are all rejected with
 * `400 Invalid filter operation (EQ) encountered.` Document preview sent `EQ`,
 * so the lookup failed every time, the render endpoint never resolved a URL,
 * and every document fell back to a download link instead of previewing.
 */
export const EBUILDER_EQUALS = "=";

/** Look a document up by its file id, returning the signed download URL. */
export function buildDocumentByFileIdQuery(fileId: string) {
  return {
    SelectedFields: [
      "Document/FileId",
      "Document/FileName",
      "Document/DownloadURL",
    ],
    Filters: [
      {
        Field: "Document/FileId",
        Operation: EBUILDER_EQUALS,
        Value: fileId,
      },
    ],
  };
}
