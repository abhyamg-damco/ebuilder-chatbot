import { createDocumentHandler } from "@/lib/artifacts/server";

/** File preview artifact — PDF or image from e-Builder documents or uploads. */
export const filePreviewDocumentHandler =
  createDocumentHandler<"file-preview">({
    kind: "file-preview",
    onCreateDocument: async ({ title, content, dataStream }) => {
      const payload =
        content ??
        JSON.stringify({
          title,
          fileUrl: "",
        });

      dataStream.write({
        type: "data-filePreviewDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
      const payload = `${document.content ?? ""}\n\nUpdate: ${description}`;

      dataStream.write({
        type: "data-filePreviewDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
  });
