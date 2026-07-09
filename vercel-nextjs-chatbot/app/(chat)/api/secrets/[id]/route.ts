import { requireRegularSession } from "@/app/(auth)/auth";
import {
  deleteUserSecret,
  getUserSecretById,
  updateUserSecret,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getUserSecretScope } from "@/lib/secrets/scope";
import { updateUserSecretSchema } from "@/lib/secrets/types";
import {
  toPublicUserSecret,
  toRevealedUserSecret,
} from "@/lib/secrets/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET returns the secret with the real value for edit forms.
 * List endpoints always mask values; this route is the explicit reveal path.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const scope = getUserSecretScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const { id } = await context.params;
  const secret = await getUserSecretById({ id, scope });

  if (!secret) {
    return new ChatbotError("not_found:secrets").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const reveal = searchParams.get("reveal") === "1";

  return Response.json({
    secret: reveal ? toRevealedUserSecret(secret) : toPublicUserSecret(secret),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const scope = getUserSecretScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const { id } = await context.params;
  const existing = await getUserSecretById({ id, scope });

  if (!existing) {
    return new ChatbotError("not_found:secrets").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = updateUserSecretSchema.parse(body);

    const updateData: Partial<
      Omit<
        import("@/lib/db/schema").UserSecret,
        "id" | "userId" | "createdAt" | "updatedAt"
      >
    > = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.slug !== undefined && { slug: parsed.slug }),
      ...(parsed.kind !== undefined && { kind: parsed.kind }),
      ...(parsed.value !== undefined && { value: parsed.value }),
      ...(parsed.description !== undefined && {
        description: parsed.description,
      }),
    };

    const secret = await updateUserSecret({
      id,
      scope,
      data: updateData,
    });

    if (!secret) {
      return new ChatbotError("not_found:secrets").toResponse();
    }

    return Response.json({ secret: toPublicUserSecret(secret) });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:secrets").toResponse();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const scope = getUserSecretScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const { id } = await context.params;
  const deleted = await deleteUserSecret({ id, scope });

  if (!deleted) {
    return new ChatbotError("not_found:secrets").toResponse();
  }

  return Response.json({ success: true });
}
