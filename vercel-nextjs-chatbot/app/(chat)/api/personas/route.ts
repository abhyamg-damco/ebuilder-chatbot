import { requireRegularSession } from "@/app/(auth)/auth";
import { createPersona, getPersonas } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getPersonaScope } from "@/lib/personas/scope";
import { createPersonaSchema } from "@/lib/personas/types";
import { toPublicPersona } from "@/lib/personas/utils";

export async function GET() {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const scope = getPersonaScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const personas = await getPersonas({ scope });

  return Response.json({
    personas: personas.map(toPublicPersona),
  });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const scope = getPersonaScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = createPersonaSchema.parse(body);

    const persona = await createPersona({
      scope,
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        instructions: parsed.instructions,
        defaultTolerances: parsed.defaultTolerances,
        defaultEnabledChecks: parsed.defaultEnabledChecks,
        enabled: parsed.enabled ?? true,
      },
    });

    return Response.json({ persona: toPublicPersona(persona) }, { status: 201 });
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }
}
