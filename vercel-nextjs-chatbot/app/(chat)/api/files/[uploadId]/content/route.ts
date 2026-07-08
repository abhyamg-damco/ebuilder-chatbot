import { NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getChatById, getChatUploadById } from "@/lib/db/queries";
import {
  getPublicErrorMessage,
  logStorageError,
} from "@/lib/storage/logger";
import { downloadFromGcs } from "@/lib/storage/upload";

type RouteContext = {
  params: Promise<{ uploadId: string }>;
};

/**
 * GET /api/files/[uploadId]/content
 *
 * Streams file bytes from GCS through the app (auth-gated).
 * Used when signed URLs are unavailable (e.g. local ADC without a SA key).
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const buffer = await downloadFromGcs({
      bucket: upload.bucket,
      objectPath: upload.objectPath,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename="${upload.originalFilename.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    logStorageError("files/content", error, { uploadId });
    return NextResponse.json(
      {
        error: getPublicErrorMessage(error, "Failed to stream upload"),
      },
      { status: 500 }
    );
  }
}
