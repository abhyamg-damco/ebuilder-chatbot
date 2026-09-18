/**
 * API smoke test — run with:
 * EBUILDER_ACCESS_TOKEN=... npx tsx src/smoke-test.ts
 */
import { loadConfig } from "./config.js";
import { EBuilderClient } from "./api/client.js";
import { buildQueryPath, buildQueryParams } from "./api/resources.js";
import { searchProjects } from "./api/project-search.js";

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

  const voiceProject = process.env.EBUILDER_SMOKE_PROJECT;
  if (voiceProject) {
    console.log(`4. resolve_project voice reference (${voiceProject})...`);
    const result = await searchProjects(client, voiceProject, 5);
    console.log(
      `   OK — ${result.matches.length} match(es); tried: ${result.searchTermsTried.join(", ")}`
    );
  }

  console.log("5. query_records (Documents with DownloadURL)...");
  const documentsPath = buildQueryPath("Documents");
  const documentsData = await client.post(
    documentsPath,
    {
      SelectedFields: [
        "Document/FileName",
        "Document/FileId",
        "Document/DownloadURL",
      ],
      Filters: [
        {
          Field: "Document/FileName",
          Operation: "LIKE",
          Value: "%invoice%",
        },
      ],
    },
    buildQueryParams({ schema: false, pageNumber: 0, pageSize: 3 })
  );
  const documentRecords =
    (documentsData as { records?: unknown[] }).records ?? [];
  const firstDocument = documentRecords[0] as
    | { Document?: { DownloadURL?: string; FileName?: string } }
    | undefined;
  const downloadUrl = firstDocument?.Document?.DownloadURL;
  if (!downloadUrl) {
    throw new Error(
      "Documents query returned no DownloadURL — invoice document retrieval will fail"
    );
  }
  console.log(
    `   OK — ${documentRecords.length} document(s); sample: ${firstDocument?.Document?.FileName ?? "unknown"}`
  );

  console.log("\nSmoke test passed.");
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});
