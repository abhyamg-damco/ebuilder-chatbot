#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createWeeklyStatusServer } from "./server.js";

const server = createWeeklyStatusServer(loadConfig());
await server.connect(new StdioServerTransport());
