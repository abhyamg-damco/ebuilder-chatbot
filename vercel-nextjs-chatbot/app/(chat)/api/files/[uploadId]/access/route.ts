import { NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getChatById, getChatUploadById } from "@/lib/db/queries";
import {
  getPublicErrorMessage,
  logStorageError,
} from "@/lib/storage/logger";
import { getReadableUrl } from "@/lib/storage/upload";
import { buildUploadContentUrl, getRequestOrigin } from "@/lib/storage/urls";

type RouteContext = {
  params: Promise<{ uploadId: string }>;
};

/**
 * GET /api/files/[uploadId]/access
 *
 * Returns a fresh signed read URL for a private GCS upload.
 * Falls back to the authenticated content proxy URL when signing fails.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uploadId } = await context.params;

  try {
    const upload = await getChatUploadById({ id: uploadId });

    if (!upload || upload.status !== "ready" || !upload.bucket) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    const chat = await getChatById({ id: upload.chatId });

    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const origin = getRequestOrigin(request);
    const contentUrl = buildUploadContentUrl({ uploadId, origin });

    try {
      const signed = await getReadableUrl({
        objectPath: upload.objectPath,
        bucket: upload.bucket,
        isPublic: upload.isPublic,
      });

      return NextResponse.json({
        id: upload.id,
        url: signed.url,
        contentUrl,
        expiresAt: signed.expiresAt,
        contentType: upload.mimeType,
        originalFilename: upload.originalFilename,
        category: upload.category,
        isPublic: upload.isPublic,
      });
    } catch (signError) {
      logStorageError("files/access:signedUrl", signError, { uploadId });

      return NextResponse.json({
        id: upload.id,
        url: contentUrl,
        contentUrl,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        contentType: upload.mimeType,
        originalFilename: upload.originalFilename,
        category: upload.category,
        isPublic: upload.isPublic,
      });
    }
  } catch (error) {
    logStorageError("files/access", error, { uploadId });
    return NextResponse.json(
      {
        error: getPublicErrorMessage(error, "Failed to generate access URL"),
      },
      { status: 500 }
    );
  }
}
