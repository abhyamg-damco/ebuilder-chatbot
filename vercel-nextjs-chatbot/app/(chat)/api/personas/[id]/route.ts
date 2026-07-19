import { requireRegularSession } from "@/app/(auth)/auth";
import {
  deletePersona,
  getPersonaById,
  updatePersona,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getPersonaScope } from "@/lib/personas/scope";
import { updatePersonaSchema } from "@/lib/personas/types";
import { toPublicPersona } from "@/lib/personas/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const scope = getPersonaScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const { id } = await context.params;
  const persona = await getPersonaById({ id, scope });

  if (!persona) {
    return new ChatbotError("not_found:api").toResponse();
  }

  return Response.json({ persona: toPublicPersona(persona) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const scope = getPersonaScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const { id } = await context.params;
  const existing = await getPersonaById({ id, scope });

  if (!existing) {
    return new ChatbotError("not_found:api").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = updatePersonaSchema.parse(body);

    const persona = await updatePersona({
      id,
      scope,
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.slug !== undefined && { slug: parsed.slug }),
        ...(parsed.description !== undefined && {
          description: parsed.description,
        }),
        ...(parsed.instructions !== undefined && {
          instructions: parsed.instructions,
        }),
        ...(parsed.defaultTolerances !== undefined && {
          defaultTolerances: parsed.defaultTolerances,
        }),
        ...(parsed.defaultEnabledChecks !== undefined && {
          defaultEnabledChecks: parsed.defaultEnabledChecks,
        }),
        ...(parsed.enabled !== undefined && { enabled: parsed.enabled }),
      },
    });

    if (!persona) {
      return new ChatbotError("not_found:api").toResponse();
    }

    return Response.json({ persona: toPublicPersona(persona) });
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const scope = getPersonaScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const { id } = await context.params;
  const deleted = await deletePersona({ id, scope });

  if (!deleted) {
    return new ChatbotError("not_found:api").toResponse();
  }

  return Response.json({ success: true });
}
