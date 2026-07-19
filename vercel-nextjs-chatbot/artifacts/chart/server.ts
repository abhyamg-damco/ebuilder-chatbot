import { createDocumentHandler } from "@/lib/artifacts/server";

/** Chart artifact — structured JSON rendered with Recharts. */
export const chartDocumentHandler = createDocumentHandler<"chart">({
  kind: "chart",
  onCreateDocument: async ({ title, content, dataStream }) => {
    const payload =
      content ??
      JSON.stringify({
        chartType: "bar",
        title,
        xKey: "label",
        series: [{ key: "value", label: "Value" }],
        data: [],
      });

    dataStream.write({
      type: "data-chartDelta",
      data: payload,
      transient: true,
    });

    return payload;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const payload = `${document.content ?? ""}\n\nUpdate: ${description}`;

    dataStream.write({
      type: "data-chartDelta",
      data: payload,
      transient: true,
    });

    return payload;
  },
});
