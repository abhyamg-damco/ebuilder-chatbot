/**
 * @file Browserbase session file uploads
 *
 * Bridges chat uploads (GCS) into a remote Browserbase session so the agent
 * can attach files to website file inputs via CDP.
 *
 * Flow:
 * 1. Download bytes from GCS
 * 2. POST /v1/sessions/{id}/uploads (file lands at /tmp/.uploads/{filename})
 * 3. DOM.setFileInputFiles on the target <input type="file">
 *
 * @see https://docs.browserbase.com/platform/browser/files/uploads
 */
import "server-only";

import { toFile } from "@browserbasehq/sdk";
import { mergeChatUploadMetadata } from "@/lib/db/queries";
import type { ChatUpload } from "@/lib/db/schema";
import { downloadFromGcs, sanitizeFilename } from "@/lib/storage/upload";
import { getBrowserbaseClient } from "./client";
import type { ActiveBrowserSession } from "./session-store";

/** Remote directory where Browserbase stores session-uploaded files. */
export const REMOTE_UPLOADS_DIR = "/tmp/.uploads";

export type BrowserSyncResult = {
  synced: Array<{ uploadId: string; filename: string; remotePath: string }>;
  skipped: Array<{ uploadId: string; reason: string }>;
  errors: Array<{ uploadId: string; error: string }>;
};

/** Stagehand understudy Page — exposes CDP via sendCDP (not Playwright newCDPSession). */
type StagehandPage = {
  sendCDP: <T = unknown>(method: string, params?: object) => Promise<T>;
  url: () => string;
};

/**
 * Returns uploads flagged for Browserbase form use with a valid GCS bucket.
 */
export function getBrowserBoundUploads(uploads: ChatUpload[]): ChatUpload[] {
  return uploads.filter(
    (upload) =>
      upload.status === "ready" &&
      upload.metadata?.useInBrowser === true &&
      Boolean(upload.bucket)
  );
}

/**
 * Builds a unique remote filename, prefixing upload id when names collide.
 */
export function buildRemoteFilename(
  upload: ChatUpload,
  usedNames: Set<string>
): string {
  let name = sanitizeFilename(upload.originalFilename);

  if (usedNames.has(name)) {
    name = `${upload.id.slice(0, 4)}-${name}`;
  }

  usedNames.add(name);
  return name;
}

/**
 * Pushes file bytes into a Browserbase session via the Session Uploads API.
 *
 * @returns Remote path inside the session, e.g. /tmp/.uploads/resume.pdf
 */
export async function uploadToBrowserSession({
  sessionId,
  buffer,
  filename,
  mimeType,
}: {
  sessionId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<string> {
  const client = getBrowserbaseClient();
  const file = await toFile(buffer, filename, { type: mimeType });

  await client.sessions.uploads.create(sessionId, { file });

  // Use the File object's name — Browserbase stores at /tmp/.uploads/{name}.
  const storedName = "name" in file && typeof file.name === "string" ? file.name : filename;

  return `${REMOTE_UPLOADS_DIR}/${storedName}`;
}

/**
 * Syncs browser-bound chat uploads into the active Browserbase session.
 */
export async function syncUploadsToSession({
  session,
  uploads,
  uploadIds,
}: {
  session: ActiveBrowserSession;
  uploads: ChatUpload[];
  uploadIds?: string[];
}): Promise<BrowserSyncResult> {
  const result: BrowserSyncResult = { synced: [], skipped: [], errors: [] };
  const targetIds = uploadIds ? new Set(uploadIds) : null;

  const browserBound = getBrowserBoundUploads(uploads).filter(
    (upload) => !targetIds || targetIds.has(upload.id)
  );

  const usedNames = new Set<string>(
    [...session.syncedFiles.values()].map((file) => file.filename)
  );

  const pending = browserBound
    .map((upload) => {
      if (upload.metadata?.browserSyncedSessionId === session.sessionId) {
        const remotePath = upload.metadata.browserRemotePath;
        if (remotePath) {
          session.syncedFiles.set(upload.id, {
            uploadId: upload.id,
            remotePath,
            filename: sanitizeFilename(upload.originalFilename),
          });
          result.skipped.push({ uploadId: upload.id, reason: "already synced" });
          return null;
        }
      }

      return { upload, filename: buildRemoteFilename(upload, usedNames) };
    })
    .filter(
      (entry): entry is { upload: ChatUpload; filename: string } =>
        entry !== null
    );

  await Promise.all(
    pending.map(async ({ upload, filename }) => {
      try {
        const buffer = await downloadFromGcs({
          bucket: upload.bucket,
          objectPath: upload.objectPath,
        });

        const remotePath = await uploadToBrowserSession({
          sessionId: session.sessionId,
          buffer,
          filename,
          mimeType: upload.mimeType,
        });

        session.syncedFiles.set(upload.id, {
          uploadId: upload.id,
          remotePath,
          filename,
        });

        await mergeChatUploadMetadata({
          id: upload.id,
          metadata: {
            browserRemotePath: remotePath,
            browserSyncedSessionId: session.sessionId,
            browserSyncedAt: new Date().toISOString(),
          },
        });

        result.synced.push({ uploadId: upload.id, filename, remotePath });
      } catch (error) {
        result.errors.push({
          uploadId: upload.id,
          error:
            error instanceof Error ? error.message : "Upload sync failed",
        });
      }
    })
  );

  return result;
}

/**
 * Attaches a session file to a file input via CDP DOM.setFileInputFiles.
 *
 * Uses Stagehand's page.sendCDP — V3Context does not expose Playwright's
 * newCDPSession, and Playwright setInputFiles would look for paths on the
 * server machine, not inside the remote Browserbase session.
 */
export async function attachFileToInput({
  page,
  remotePath,
  selector,
}: {
  page: unknown;
  remotePath: string;
  selector: string;
}): Promise<void> {
  const stagehandPage = page as StagehandPage;

  if (typeof stagehandPage.sendCDP !== "function") {
    throw new Error(
      "Page does not support CDP commands. Cannot attach remote session files."
    );
  }

  await stagehandPage.sendCDP("DOM.enable");

  const root = await stagehandPage.sendCDP<{ root: { nodeId: number } }>(
    "DOM.getDocument"
  );

  const inputNode = await stagehandPage.sendCDP<{ nodeId: number }>(
    "DOM.querySelector",
    {
      nodeId: root.root.nodeId,
      selector,
    }
  );

  if (!inputNode?.nodeId) {
    throw new Error(`No file input found for selector: ${selector}`);
  }

  await stagehandPage.sendCDP("DOM.setFileInputFiles", {
    files: [remotePath],
    nodeId: inputNode.nodeId,
  });
}
