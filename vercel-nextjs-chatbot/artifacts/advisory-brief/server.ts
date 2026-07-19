import { createDocumentHandler } from "@/lib/artifacts/server";

/** Advisory brief artifact — structured JSON rendered in the side panel. */
export const advisoryBriefDocumentHandler =
  createDocumentHandler<"advisory-brief">({
    kind: "advisory-brief",
    onCreateDocument: async ({ title, content, dataStream }) => {
      const payload =
        content ??
        JSON.stringify({
          title,
          riskRating: "LOW",
          flags: [],
          passedChecks: [],
          recommendation: "Review complete.",
        });

      dataStream.write({
        type: "data-advisoryBriefDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
      const payload = `${document.content ?? ""}\n\nUpdate: ${description}`;

      dataStream.write({
        type: "data-advisoryBriefDelta",
        data: payload,
        transient: true,
      });

      return payload;
    },
  });
