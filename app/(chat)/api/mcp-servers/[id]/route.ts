import { auth } from "@/app/(auth)/auth";
import {
  deleteMcpServer,
  getMcpServerById,
  updateMcpServer,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { updateMcpServerSchema } from "@/lib/mcp/types";
import { mergeKeyValueRecords, toPublicMcpServer } from "@/lib/mcp/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  const { id } = await context.params;
  const server = await getMcpServerById({ id, userId: session.user.id });

  if (!server) {
    return new ChatbotError("not_found:mcp").toResponse();
  }

  return Response.json({ server: toPublicMcpServer(server) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  const { id } = await context.params;
  const existing = await getMcpServerById({ id, userId: session.user.id });

  if (!existing) {
    return new ChatbotError("not_found:mcp").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = updateMcpServerSchema.parse(body);
    const transport = parsed.transport ?? existing.transport;
    const mergedHeaders = parsed.headers
      ? mergeKeyValueRecords(existing.headers ?? {}, parsed.headers)
      : undefined;
    const mergedEnv = parsed.env
      ? mergeKeyValueRecords(existing.env ?? {}, parsed.env)
      : undefined;

    const updateData: Partial<
      Omit<import("@/lib/db/schema").McpServer, "id" | "userId" | "createdAt" | "updatedAt">
    > = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && {
        description: parsed.description,
      }),
      ...(parsed.enabled !== undefined && { enabled: parsed.enabled }),
      ...(parsed.transport !== undefined && { transport: parsed.transport }),
      ...(parsed.url !== undefined && { url: parsed.url }),
      ...(parsed.command !== undefined && { command: parsed.command }),
      ...(parsed.args !== undefined && { args: parsed.args }),
      ...(mergedEnv !== undefined && { env: mergedEnv }),
      ...(mergedHeaders !== undefined && { headers: mergedHeaders }),
    };

    if (parsed.transport && parsed.transport !== existing.transport) {
      if (parsed.transport === "stdio") {
        updateData.url = null;
        updateData.headers = {};
      } else {
        updateData.command = null;
        updateData.args = [];
      }
    }

    const server = await updateMcpServer({
      id,
      userId: session.user.id,
      data: updateData,
    });

    if (!server) {
      return new ChatbotError("not_found:mcp").toResponse();
    }

    return Response.json({ server: toPublicMcpServer(server) });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    return new ChatbotError("bad_request:mcp").toResponse();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  const { id } = await context.params;
  const deleted = await deleteMcpServer({ id, userId: session.user.id });

  if (!deleted) {
    return new ChatbotError("not_found:mcp").toResponse();
  }

  return Response.json({ success: true });
}
