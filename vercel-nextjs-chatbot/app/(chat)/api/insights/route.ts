import { auth } from "@/app/(auth)/auth";
import { getInsightDocumentsByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

/** List saved Ivy insight artifacts for the signed-in user. */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  const documents = await getInsightDocumentsByUserId({
    userId: session.user.id,
  });

  return Response.json({ documents }, { status: 200 });
}
