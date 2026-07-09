import { requireRegularSession } from "@/app/(auth)/auth";
import {
  deleteAgentSkill,
  getAgentSkillById,
  updateAgentSkill,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getAgentSkillScope } from "@/lib/skills/scope";
import { updateAgentSkillSchema } from "@/lib/skills/types";
import { toPublicAgentSkill } from "@/lib/skills/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const scope = getAgentSkillScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const { id } = await context.params;
  const skill = await getAgentSkillById({ id, scope });

  if (!skill) {
    return new ChatbotError("not_found:skills").toResponse();
  }

  return Response.json({ skill: toPublicAgentSkill(skill) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const scope = getAgentSkillScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const { id } = await context.params;
  const existing = await getAgentSkillById({ id, scope });

  if (!existing) {
    return new ChatbotError("not_found:skills").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = updateAgentSkillSchema.parse(body);

    const updateData: Partial<
      Omit<
        import("@/lib/db/schema").AgentSkill,
        "id" | "userId" | "createdAt" | "updatedAt"
      >
    > = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.slug !== undefined && { slug: parsed.slug }),
      ...(parsed.description !== undefined && {
        description: parsed.description,
      }),
      ...(parsed.content !== undefined && { content: parsed.content }),
      ...(parsed.enabled !== undefined && { enabled: parsed.enabled }),
    };

    const skill = await updateAgentSkill({
      id,
      scope,
      data: updateData,
    });

    if (!skill) {
      return new ChatbotError("not_found:skills").toResponse();
    }

    return Response.json({ skill: toPublicAgentSkill(skill) });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:skills").toResponse();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const scope = getAgentSkillScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const { id } = await context.params;
  const deleted = await deleteAgentSkill({ id, scope });

  if (!deleted) {
    return new ChatbotError("not_found:skills").toResponse();
  }

  return Response.json({ success: true });
}
