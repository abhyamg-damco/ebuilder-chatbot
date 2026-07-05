import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";
import { testMcpServerConnection } from "@/lib/mcp/client";
import { createMcpServerSchema } from "@/lib/mcp/types";

/** Test a draft MCP server configuration before saving. */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:mcp").toResponse();
  }

  try {
    const body = await request.json();
    const parsed = createMcpServerSchema.parse(body);

    const result = await testMcpServerConnection({
      name: parsed.name,
      transport: parsed.transport,
      url: parsed.transport === "stdio" ? null : (parsed.url ?? null),
      command: parsed.transport === "stdio" ? (parsed.command ?? null) : null,
      args: parsed.transport === "stdio" ? (parsed.args ?? []) : [],
      env: parsed.env ?? {},
      headers: parsed.headers ?? {},
    });

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
