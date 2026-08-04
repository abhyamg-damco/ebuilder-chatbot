import { createDocumentHandler } from "@/lib/artifacts/server";
import { sanitizeFilePreviewPayload } from "@/lib/insights/sanitize-file-preview";

/** File preview artifact — PDF or image from e-Builder documents or uploads. */
export const filePreviewDocumentHandler =
  createDocumentHandler<"file-preview">({
    kind: "file-preview",
    onCreateDocument: async ({ title, content, dataStream }) => {
      const raw =
        content ??
        JSON.stringify({
          title,
          fileUrl: "",
        });
      const payload = sanitizeFilePreviewPayload(raw);

      dataStream.write({
        type: "data-filePreviewDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
      const raw = `${document.content ?? ""}\n\nUpdate: ${description}`;
      const payload = sanitizeFilePreviewPayload(raw);

      dataStream.write({
        type: "data-filePreviewDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
  });
