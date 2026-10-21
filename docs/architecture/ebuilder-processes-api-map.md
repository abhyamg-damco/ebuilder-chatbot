# e-Builder Processes: Find, Read, Write

> Which APIs perform the manual work in Sid's Loom of 2026-08-11, organised as the three
> things an agent has to do: **find** a project's process, **read** an instance's
> contents, **write** an instance's contents.
>
> Find and Read are verified against the live tenant on 2026-09-03. The endpoint
> sweep alone made 437 calls, and the field audit read all 93 instances.
> **Write is mapped but deliberately not executed.** See §4 for why.
> Working files in `code/probe/`.

---

## Summary

| | Capability | Endpoint | Status |
|---|-----------|----------|--------|
| **1** | **Find** a project | `POST /api/v2/Projects/Query` | verified |
| | **Find** its process instances | `POST /api/v2/{Type}Processes/Query?processPrefix=X` | verified |
| **2** | **Read** an instance, state and all fields | `GET /api/v2/ProcessInstances/{id}/dataFields` | verified |
| | **Read** its comments | `GET /api/v2/ProcessInstances/{id}/Comments` | verified |
| | **Read** its grids | `GET /api/v2/ProcessInstances/{id}/dynamicGrids` | empty in this tenant |
| **3** | **Write** fields, create or update an instance | `POST /api/v2/{Type}Processes/Import?processPrefix=X` | **mapped, not called** |
| | **Write** a comment | `POST /api/v2/ProcessInstances/{id}/Comments/Create` | **mapped, not called** |
| | **Write** an attachment | `POST /api/v2/ProcessInstance/{id}/Attach` | **mapped, not called** |

Three endpoints do the whole job on the read side. Three do it on the write side.

---

## 1. FIND: project to process

### 1.1 List projects

```
POST /api/v2/Projects/Query?schema=false&pageNumber=0&pageSize=100
Body: { "SelectedFields": ["Project/ProjectId", "Project/ProjectName",
                           "Project/PortalId", "Project/Status"] }
```

Returns projects in `records[]`. Add `?schema=true` with an empty body to get the field
list first: the `Project` entity exposes 70 fields. **`SelectedFields` is mandatory**, and
guessing a name that does not exist returns 400, so read the schema before selecting.

### 1.2 List the process catalogue

```
GET /api/v2/ProcessTypes?limit=500&schema=false
```

Every process type configured in the tenant, with `processId`, `processName`, `prefix`,
and `costIntegrationType`. The `prefix` is the key you need for every subsequent call.

`costIntegrationType` tells you which Query endpoint applies: `null` means non-cost, so
use `NonCostProcesses`. Otherwise it names the cost entity (`CommitmentChange`,
`CommitmentInvoice`, `Commitment`, `BudgetChange`, and so on).

### 1.3 List instances of a process

```
POST /api/v2/NonCostProcesses/Query?processPrefix=BWPUP&pageNumber=0&pageSize=100
Body: { "SelectedFields": ["ProcessInstance/InstanceId",
                           "ProcessInstance/InstanceCounter",
                           "ProcessInstance/Subject",
                           "ProcessInstance/Status",
                           "ProcessInstance/CurrentStepName",
                           "ProcessInstance/DateDue",
                           "ProcessInstance/SubmittedBy",
                           "ProcessInstance/SubmittedDate",
                           "Process/Prefix", "Process/ProcessName",
                           "Project/ProjectName"] }
```

Two parameters are mandatory and each has its own error:

- No `processPrefix` → `400 "Process query requires a process prefix value"`
- No `SelectedFields` → `400 "A minimum of 1 selected fields is required."`

Three entities are selectable: `Project` (70 fields), `Process` (48),
`ProcessInstance` (30).

**`Filters` works, and it filters before pagination**, so scoping to one project happens
server-side. Filtering `Project/ProjectName LIKE %Dyckman%` returns that project's 24 rows
directly rather than 100 rows to sift. Multiple filters combine with AND.

**The valid operator set is much smaller than documented.** Tested one by one against this
endpoint:

| Works | Rejected with `400 "Invalid filter operation (X) encountered."` |
|-------|-----------------------------------------------------------------|
| `LIKE`, `NOT LIKE`, `IN`, `=` | `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`, `CONTAINS`, `STARTSWITH` |

Note `=` works but `EQ` does not, which is worth knowing because the MCP server's own
system prompt in `prompts/server-instructions.ts` advertises `EQ, NE, LIKE, IN, GT, GTE,
LT, LTE`. That list holds for the cost-object Query endpoints but not for the process
ones, so an agent following that prompt will get 400s here.

There is also an `AdvancedScript` field for ordering, for example
`orderby:[ProcessInstance/Subject],[ProcessInstance/InstanceId]`.

`pageSize` caps at 100. Page until a short page comes back, unless a filter has already
narrowed the result below that.

The `/DynamicGrid/Query` variant of the same endpoint takes a `gridName` and returns grid
rows instead of instance headers.

---

## 2. READ: an instance's contents

### 2.1 One call gets the state and the entire form

```
GET /api/v2/ProcessInstances/{instanceId}/dataFields?limit=500&schema=false
```

This is the workhorse. `records[0]` is the workflow state, `details[]` is the form.

`records[0]`, the fields worth knowing:

| Field | Example | Use |
|-------|---------|-----|
| `currentStep` | `"01 PM Review"` | which step is waiting |
| `responsibleActors` | `"Sanidhya Mathur"` | who to chase or call |
| `instanceStatus` / `processStatus` | `"Open"` / `"Submitted"` | is it actionable |
| `processSubject` | `"Bi-Weekly Update: 07/10/2026 - …"` | how to open the conversation |
| `stepAge` | `546.1` | days waiting on this step |
| `dateDue`, `stepDateDue` | often empty here | deadline |
| `projectId`, `processId`, `processPrefix` | | anchors back to Find |

`details[]` is the form as flat `{name, value}` pairs. That shape is close to ideal for a
voice agent: one pair is one conversational turn, and a null value is an unanswered
question.

**Verified: every field visible on the print version is returned.** Audited across 93
instances in four projects, all four expose an identical 34-field set with no variation
instance to instance. Full field table in Appendix A.

### 2.2 Comments

```
GET /api/v2/ProcessInstances/{instanceId}/Comments?limit=100
```

Works, except on drafts: `400 "Draft Processes are not supported in Get Comments API"`.

### 2.3 Grids

```
GET /api/v2/ProcessInstances/{instanceId}/dynamicGrids
GET /api/v2/ProcessInstances/{instanceId}/dynamicGrids/{gridId}/items
```

Returns 200 but empty on every instance in this tenant, so the nested `items` path is
unverified. Needs an instance known to carry a grid.

---

## 3. WRITE: an instance's contents

**Mapped from the vendor Postman collection. None of these were called.**

Exactly three endpoints write to a non-cost process:

### 3.1 Create or update instances and field values

```
POST /api/v2/{Type}Processes/Import?processPrefix=BWPUP&schema=false&schemaType=request
Body: { "options": {}, "data": [] }
```

`Import` is the write path. It is what Sid's team used for the bulk load, which is
precisely why every `SubmittedDate` reads 2026-08-11: **the import stamps the submitted
date and there is no parameter to override it.** That is the root cause of the original
problem, and it will recur on every future import.

Available for `NonCostProcesses`, `BudgetChangeProcesses`, `CommitmentChangeProcesses`,
`CommitmentProcesses`, `InvoiceProcesses`, `AccountFundingProcesses`,
`MasterCommitmentProcesses`, `MasterCommitmentChangeProcesses`.

### 3.2 Add a comment

```
POST /api/v2/ProcessInstances/{instanceId}/Comments/Create
Body: { "commentText": "…", "isPrivate": false,
        "documents": ["<documentId>", "…"] }
```

The only write with a fully documented body in the collection.

### 3.3 Attach documents

```
POST /api/v2/ProcessInstance/{instanceId}/Attach?schemaType=request
Body: { "options": {}, "data": [] }
```

Note the path is `ProcessInstance` **singular** here, against `ProcessInstances` plural on
every read endpoint. A genuine inconsistency in the API, and an easy bug to write.

### 3.4 What is missing: there is no workflow-advance for non-cost processes

All five `StatusUpdate` endpoints are cost objects only:

```
PUT  /api/v2/BudgetChanges/StatusUpdate
PUT  /api/v2/CommitmentChanges/StatusUpdate
PUT  /api/v2/Commitments/StatusUpdate
PUT  /api/v2/GeneralInvoices/StatusUpdate
POST /api/v2/Invoices/StatusUpdate
```

**None exists for `NonCostProcesses` or `ProcessInstances`.** So for BWPUP there is no API
call that submits a step or moves the workflow forward. `Import` is the only lever, and
whether it can advance a step or merely set field values is the single most important
unknown on the write side. It decides whether a phone-call agent can complete a PM's
update or can only prepare a draft for the PM to submit by hand.

### 3.5 Getting the payload shape without writing

Every write endpoint advertises `schemaType=request`. Calling it with `schema=true`
returns the expected request body rather than performing the write. That is the safe way
to learn the `data[]` element shape, and it is the natural next step once someone
authorises it.

---

## 4. Why no write was tested

Three findings from the collection, in increasing order of seriousness:

1. **No dry-run exists.** Searched all 184 requests for `dryRun`, `validateOnly`,
   `preview`, `testMode`, `simulate`. Zero hits. No endpoint offers a validate-only mode.

2. **The API has no DELETE verb at all.** 132 GET, 48 POST, 4 PUT, **zero DELETE**. No
   endpoint anywhere contains `delete`, `remove`, `cancel` or `void`.

3. **Therefore nothing written through this API can be removed through it.** A test
   comment is permanent. A test instance can only be removed by a human clicking *Delete
   Instance* in the UI, and that still leaves workflow history.

The condition was no data left behind. **On this API that condition cannot be met**, so I
did not write. The nearest thing to a safe candidate is an `Import` with an empty
`data: []` array, which creates zero rows by construction, but it may still register an
import job in the tenant's history and I would not run it on an account Sid uses for
customer demos without someone saying so explicitly.

**If you want the write path verified,** the clean way is a throwaway process type or a
scratch project that nobody demos from, nominated by Abhyam. Then `Import` can be
exercised properly, including whether it advances a workflow step.

---

## 5. Constraints across all three

- **Custom fields cannot be queried in bulk.** `NonCostProcesses/Query` exposes only
  `Project`, `Process` and `ProcessInstance`. None of the 34 form fields are selectable.
  Three path conventions were rejected identically, including
  `ProcessInstance/CustomFields/Bi-Weekly Comment Date`. Worth noting the `CustomFields/`
  convention *does* work on `CommitmentInvoices/Query` elsewhere in this API, so this is
  a per-endpoint limitation rather than a global one.
- **Reading fields costs one call per instance.** Measured at 392ms average, 93 instances
  in 36.5 seconds. Fine for a batch or cache warm, fatal inside a phone call where a turn
  allows roughly 1000ms end to end. **Pre-fetch before the call, do not fetch during it.**
- **`SubmittedDate` is not a date.** Every imported instance carries the import timestamp.
  Order by the process's own date field instead.
- **Two entries in `dataFields` are not fields.** `'"'` and `'""'` hold raw HTML for the
  section header labels. Filter them.

---

## Appendix A. The 34 fields on BWPUP

Identical across all four projects and every instance. Population is non-empty values
across all 93 instances.

| Section | Field | Populated |
|---------|-------|-----------|
| Project Information | `Project Status` | 93/93 |
| | `Project Delivery Type` | 68/93 |
| | `Current Project Phase` | 68/93 |
| Dates | `Bi-Weekly Comment Date` | 93/93 |
| | `Bi-Weekly Comment Date (Previous Period)` | 88/93 |
| Narrative | `Bi-Weekly Comments` | 93/93 |
| | `Bi-Weekly Comments (Previous Period)` | 88/93 |
| Progress | `Physical Construction Percentage(Previous Update)` | 93/93 |
| | `Physical Construction Percentage` | 66/93 |
| | `General Update` | 48/93 |
| | `General Update (Previous Period)` | 45/93 |
| Meetings | `Next External Stakeholder Meeting` | 48/93 |
| | `Next External Stakeholder Meeting (Previous Period)` | 46/93 |
| Activities | `Activities Completed This Period` | 48/93 |
| | `Activities Completed in Previous Period` | 44/93 |
| Delay | `Incurred Delay (Previous Period)` | 93/93 |
| | `Incurred Delay (Days)` | 49/93 |
| | `Delay Cause #1` | 25/93 |
| | `Delay Cause #1 Details & Remediation` | 25/93 |
| | `Delay Cause #1 Details & Remediation (Previous Period)` | 23/93 |
| | `Delay Cause #1 (Previous Period)` | 22/93 |
| | `Delay Cause #2 (Previous Period)` | 5/93 |
| | `Delay Cause #2` | 3/93 |
| | `Delay Cause #2 Details & Remediation (Previous Period)` | 3/93 |
| | `Delay Cause #2 Details & Remediation` | 2/93 |
| Vendors | `New Instruction Given to any Vendors` | 48/93 |
| | `New Instruction Given to any Vendors (Previous Period)` | 43/93 |
| Schedule | `Changes to Baseline or Forecast Schedule` | 48/93 |
| Risk | `Major Upcoming Risks` | 5/93 |
| | `Mitigation of Upcoming Risks` | 5/93 |
| Review | `PM Comments` | 0/93 |
| | `Director Comments` | 0/93 |
| artefact | `'"'` and `'""'` | 93/93 |

**`Changes to Baseline or Forecast Schedule` does not appear on the print version** but is
returned by the API and populated on 48 instances. Anyone treating the printed form as the
field spec loses it.

**`PM Comments` and `Director Comments` are empty on all 93** because the bulk import
bypassed the review steps. Expect them to populate only on instances created through the
normal workflow.

Name the fields exactly. `Physical Construction Percentage(Previous Update)` has no space
before the bracket and says *Update* not *Period*, and two pairs flip word order
(`Activities Completed in Previous Period` against `Activities Completed This Period`).
Never derive the twin name from a pattern.

---

## Appendix B. The demo data

`BWPUP` holds 140 instances. 93 belong to the four demo projects, matching Sid's "90
transactions total". **The other 47 are "Kanika Taneja Test Project"**, unrelated test
data in the same process, indistinguishable by `SubmittedDate` since all 140 share
2026-08-11. Anything reading BWPUP must filter by project.

| Project | Instances | PortalID |
|---------|-----------|----------|
| e20242-Elevators-Dyckman | 24 | `8bad3267-a2d4-498b-8643-8e03a8cecf8a` |
| e20244-Elevators-Amsterdam | 23 | `b7634e32-6d5b-4f3f-9e6e-10cc849f6f03` |
| e20249-CCR-Conlon Lihfe Towers | 23 | `3e7ea128-97dc-4092-aa5d-bd487e39fe01` |
| e20297-Community Center Addition-Wyckoff | 23 | `1cb4573b-deae-49ae-a578-9b110397c148` |
| Kanika Taneja Test Project | 47 | not a demo project |

Two data-quality notes for anyone building against this set. The
`(Previous Period)` pointer does not chain reliably, so order by `Bi-Weekly Comment Date`
rather than walking it. And `Physical Construction Percentage` runs 0, 100, 0, 35, 80, 35,
0 across the series, so it is synthetic backfill rather than real progress, and trend
logic built on it will look broken when it is working.

---

## Open questions

1. **Can `Import` advance a workflow step, or only set field values?** The single most
   important unknown. It decides whether an agent can complete a PM's update or only
   prepare a draft. Needs either the vendor's documentation or a write test on a
   nominated throwaway project.
2. **Where can writes be tested?** Nothing on this API is reversible, so a scratch process
   type or project is needed before any write is exercised.
3. **Dynamic grids** returned empty everywhere. Is anything expected in them?
4. **Format.** Is this the deliverable, or should the confirmed requests go into
   `Unity Construct APIs.postman_collection.json`? The committed collection is not
   runnable as shipped: `baseUrl` is empty and `{{access_token}}` is referenced by the
   collection auth but never defined.
