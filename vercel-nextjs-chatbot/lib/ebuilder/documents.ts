import "server-only";

import {
  isAllowedEBuilderDownloadUrl,
  isEBuilderConfigured,
} from "@/lib/ebuilder/download-url-policy";

export { isAllowedEBuilderDownloadUrl, isEBuilderConfigured };

type JsonRecord = Record<string, unknown>;

export type EBuilderDocumentBytes = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

/** Authenticate to e-Builder using env credentials. */
export async function authenticateEBuilder(
  baseUrl: string
): Promise<string | null> {
  const accessToken = process.env.EBUILDER_ACCESS_TOKEN;
  if (accessToken) {
    return accessToken;
  }

  const username = process.env.EBUILDER_USERNAME;
  const password = process.env.EBUILDER_PASSWORD;

  if (!username || !password) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  const authResponse = await fetch(`${baseUrl}/api/v2/Authenticate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!authResponse.ok) {
    return null;
  }

  const payload = (await authResponse.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

export function getEBuilderBaseUrl(): string {
  return process.env.EBUILDER_BASE_URL ?? "https://api2-us2.e-builder.net";
}

/** Infer MIME type from file name (exported for document access layer). */
export function inferContentTypeFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[extension] ?? "application/octet-stream";
}

/** Resolve signed DownloadURL for a document FileId via Documents Query. */
export async function resolveDocumentDownloadUrl(
  baseUrl: string,
  token: string,
  fileId: string
): Promise<{ downloadUrl: string; fileName: string } | null> {
  const queryResponse = await fetch(
    `${baseUrl}/api/v2/Documents/Query?schema=false&pageNumber=0&pageSize=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SelectedFields: [
          "Document/FileId",
          "Document/FileName",
          "Document/DownloadURL",
        ],
        Filters: [
          {
            Field: "Document/FileId",
            Operation: "EQ",
            Value: fileId,
          },
        ],
      }),
    }
  );

  if (!queryResponse.ok) {
    return null;
  }

  const payload = (await queryResponse.json()) as {
    records?: JsonRecord[];
  };
  const records = payload.records ?? [];
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  const doc = (record.Document as JsonRecord | undefined) ?? record;
  const downloadUrl = String(doc.DownloadURL ?? doc.downloadUrl ?? "");
  const fileName = String(doc.FileName ?? doc.fileName ?? "document");

  if (!downloadUrl) {
    return null;
  }

  return { downloadUrl, fileName };
}

/** Download document bytes from a signed e-Builder DownloadURL. */
export async function fetchEBuilderDocumentByDownloadUrl(
  downloadUrl: string,
  fileNameHint = "document"
): Promise<EBuilderDocumentBytes | null> {
  if (!isAllowedEBuilderDownloadUrl(downloadUrl)) {
    return null;
  }

  const downloadResponse = await fetch(downloadUrl);
  if (!downloadResponse.ok) {
    return null;
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const contentType =
    downloadResponse.headers.get("content-type") ??
    inferContentTypeFromFileName(fileNameHint);

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: fileNameHint,
    contentType,
  };
}

/** Download document bytes from e-Builder using FileId. */
export async function fetchEBuilderDocumentByFileId(
  fileId: string
): Promise<EBuilderDocumentBytes | null> {
  const baseUrl = getEBuilderBaseUrl();
  const token = await authenticateEBuilder(baseUrl);

  if (!token) {
    return null;
  }

  const resolved = await resolveDocumentDownloadUrl(baseUrl, token, fileId);
  if (!resolved) {
    return null;
  }

  const downloadResponse = await fetch(resolved.downloadUrl);
  if (!downloadResponse.ok) {
    return null;
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const contentType =
    downloadResponse.headers.get("content-type") ??
    inferContentTypeFromFileName(resolved.fileName);

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: resolved.fileName,
    contentType,
  };
}
