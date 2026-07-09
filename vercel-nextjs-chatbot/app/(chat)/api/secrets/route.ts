import { requireRegularSession } from "@/app/(auth)/auth";
import {
  createUserSecret,
  getUserSecrets,
  upsertUserSecretBySlug,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getUserSecretScope } from "@/lib/secrets/scope";
import {
  createUserSecretSchema,
  upsertUserSecretSchema,
} from "@/lib/secrets/types";
import { toPublicUserSecret } from "@/lib/secrets/utils";

export async function GET() {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const scope = getUserSecretScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const secrets = await getUserSecrets({ scope });

  return Response.json({
    secrets: secrets.map(toPublicUserSecret),
  });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  const scope = getUserSecretScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:secrets").toResponse();
  }

  try {
    const body = await request.json();
    const upsert = body?.upsert === true;

    if (upsert) {
      const parsed = upsertUserSecretSchema.parse(body);
      const secret = await upsertUserSecretBySlug({
        scope,
        data: {
          name: parsed.name,
          slug: parsed.slug,
          kind: parsed.kind ?? "other",
          value: parsed.value,
          description: parsed.description ?? null,
        },
      });

      return Response.json(
        { secret: toPublicUserSecret(secret) },
        { status: 200 }
      );
    }

    const parsed = createUserSecretSchema.parse(body);

    const secret = await createUserSecret({
      scope,
      data: {
        name: parsed.name,
        slug: parsed.slug,
        kind: parsed.kind ?? "other",
        value: parsed.value,
        description: parsed.description ?? null,
      },
    });

    return Response.json(
      { secret: toPublicUserSecret(secret) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:secrets").toResponse();
  }
}
