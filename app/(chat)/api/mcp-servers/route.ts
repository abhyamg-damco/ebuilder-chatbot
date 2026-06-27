import { auth } from "@/app/(auth)/auth";
import {
  createMcpServer,
  getMcpServers,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { createMcpServerSchema } from "@/lib/mcp/types";
import { testMcpServerConnection } from "@/lib/mcp/client";
import type { McpServerStatus } from "@/lib/mcp/types";
import { getMcpServerScope } from "@/lib/mcp/scope";
import { toPublicMcpServer } from "@/lib/mcp/utils";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  const scope = getMcpServerScope(session.user.type, session.user.id);
  const servers = await getMcpServers({ scope });
  const includeStatus =
    new URL(request.url).searchParams.get("status") === "true";

  if (!includeStatus) {
    return Response.json({
      servers: servers.map(toPublicMcpServer),
    });
  }

  const statuses: McpServerStatus[] = await Promise.all(
    servers.map(async (server) => {
      const result = await testMcpServerConnection(server);
      return { serverId: server.id, ...result };
    })
  );

  return Response.json({
    servers: servers.map(toPublicMcpServer),
    statuses,
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = createMcpServerSchema.parse(body);
    const scope = getMcpServerScope(session.user.type, session.user.id);

    const server = await createMcpServer({
      scope,
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        transport: parsed.transport,
        url: parsed.transport === "stdio" ? null : (parsed.url ?? null),
        command: parsed.transport === "stdio" ? (parsed.command ?? null) : null,
        args: parsed.transport === "stdio" ? (parsed.args ?? []) : [],
        env: parsed.env ?? {},
        headers: parsed.headers ?? {},
        enabled: parsed.enabled ?? true,
      },
    });

    return Response.json({ server: toPublicMcpServer(server) }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:mcp").toResponse();
  }
}
