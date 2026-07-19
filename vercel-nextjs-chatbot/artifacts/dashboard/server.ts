import { createDocumentHandler } from "@/lib/artifacts/server";

/** Dashboard artifact — KPI cards with optional chart and table. */
export const dashboardDocumentHandler = createDocumentHandler<"dashboard">({
  kind: "dashboard",
  onCreateDocument: async ({ title, content, dataStream }) => {
    const payload =
      content ??
      JSON.stringify({
        title,
        kpis: [],
      });

    dataStream.write({
      type: "data-dashboardDelta",
      data: payload,
      transient: true,
    });

    return payload;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const payload = `${document.content ?? ""}\n\nUpdate: ${description}`;

    dataStream.write({
      type: "data-dashboardDelta",
      data: payload,
      transient: true,
    });

    return payload;
  },
});
