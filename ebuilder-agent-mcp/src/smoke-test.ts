/**
 * API smoke test — run with:
 * EBUILDER_ACCESS_TOKEN=... npx tsx src/smoke-test.ts
 */
import { loadConfig } from "./config.js";
import { EBuilderClient } from "./api/client.js";
import { buildQueryPath, buildQueryParams } from "./api/resources.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new EBuilderClient(config);

  console.log("1. discover_query_schema (Budgets)...");
  const schemaPath = buildQueryPath("Budgets");
  const schemaParams = buildQueryParams({
    schema: true,
    pageNumber: 0,
    pageSize: 0,
  });
  const schema = await client.post(schemaPath, {}, schemaParams);
  const schemaKeys = Object.keys(schema as object);
  console.log(`   OK — schema response keys: ${schemaKeys.join(", ")}`);

  console.log("2. resolve_project (Tower)...");
  const projectPath = buildQueryPath("Projects");
  const projectParams = buildQueryParams({
    schema: false,
    pageNumber: 0,
    pageSize: 5,
  });
  const projects = await client.post(
    projectPath,
    {
      SelectedFields: [
        "Project/ProjectName",
        "Project/PortalId",
      ],
      Filters: [
        {
          Field: "Project/ProjectName",
          Operation: "LIKE",
          Value: "%Tower%",
        },
      ],
    },
    projectParams
  );
  const projectRecords = (projects as { records?: unknown[] }).records ?? [];
  console.log(`   OK — ${projectRecords.length} project match(es)`);

  console.log("3. query_records (Budgets, first page)...");
  const budgetData = await client.post(
    schemaPath,
    {
      SelectedFields: ["Project/ProjectName", "Budget/BudgetId"],
      Filters: [
        {
          Field: "Project/ProjectName",
          Operation: "LIKE",
          Value: "%Tower%",
        },
      ],
    },
    buildQueryParams({ schema: false, pageNumber: 0, pageSize: 5 })
  );
  const budgetRecords = (budgetData as { records?: unknown[] }).records ?? [];
  console.log(`   OK — ${budgetRecords.length} budget record(s)`);

  console.log("\nSmoke test passed.");
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});
