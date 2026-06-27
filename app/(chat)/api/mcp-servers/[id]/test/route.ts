import { auth } from "@/app/(auth)/auth";
import { getMcpServerById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { testMcpServerConnection } from "@/lib/mcp/client";
import { createMcpServerSchema } from "@/lib/mcp/types";
import { mergeKeyValueRecords } from "@/lib/mcp/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const isDraft = body?.draft === true;

    if (isDraft) {
      const existing = await getMcpServerById({ id, userId: session.user.id });

      if (!existing) {
        return new ChatbotError("not_found:mcp").toResponse();
      }

      const parsed = createMcpServerSchema.parse(body.config);
      const result = await testMcpServerConnection({
        name: parsed.name,
        transport: parsed.transport,
        url: parsed.transport === "stdio" ? null : (parsed.url ?? null),
        command: parsed.transport === "stdio" ? (parsed.command ?? null) : null,
        args: parsed.transport === "stdio" ? (parsed.args ?? []) : [],
        env: mergeKeyValueRecords(existing.env ?? {}, parsed.env ?? {}),
        headers: mergeKeyValueRecords(
          existing.headers ?? {},
          parsed.headers ?? {}
        ),
      });

      return Response.json(result);
    }

    const server = await getMcpServerById({ id, userId: session.user.id });

    if (!server) {
      return new ChatbotError("not_found:mcp").toResponse();
    }

    const result = await testMcpServerConnection(server);

    return Response.json(result);
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return Response.json({
      success: false,
      error: "Invalid MCP server configuration",
    });
  }
}
