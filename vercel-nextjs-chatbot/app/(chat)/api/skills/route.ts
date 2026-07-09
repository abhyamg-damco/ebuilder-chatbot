import { requireRegularSession } from "@/app/(auth)/auth";
import { createAgentSkill, getAgentSkills } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getAgentSkillScope } from "@/lib/skills/scope";
import { createAgentSkillSchema } from "@/lib/skills/types";
import { toPublicAgentSkill } from "@/lib/skills/utils";

export async function GET() {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const scope = getAgentSkillScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const skills = await getAgentSkills({ scope });

  return Response.json({
    skills: skills.map(toPublicAgentSkill),
  });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();

  if (!session) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  const scope = getAgentSkillScope(session.user.type, session.user.id);

  if (!scope) {
    return new ChatbotError("unauthorized:skills").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = createAgentSkillSchema.parse(body);

    const skill = await createAgentSkill({
      scope,
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        content: parsed.content,
        enabled: parsed.enabled ?? true,
      },
    });

    return Response.json({ skill: toPublicAgentSkill(skill) }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:skills").toResponse();
  }
}
