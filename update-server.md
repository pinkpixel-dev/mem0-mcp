# Mem0-MCP Server Update

I have a Mem0 MCP server that is overdue for an update. Mem0 has changed pretty significantly.

My MCP server currently exposes the classic three-tool surface:

* `add_memory`
* `search_memory`
* `delete_memory`

It was built around Mem0’s older cloud/V2 behavior and my last major cloud alignment was around V2 in May 2025. Meanwhile, Mem0’s hosted Platform API has moved into a V3 memory pipeline, newer SDKs, async event-driven writes, hybrid retrieval, graph/entity behavior, batch operations, exports, feedback, webhooks, project settings, and more.

The good news: the server already has a solid foundation. We do not need to rebuild it from scratch. But we should treat this as a proper `1.0`-style modernization rather than tossing in two random tools and calling it a day.

---

# The biggest breaking change: V3 memory writes are async

Mem0’s current V3 add endpoint is:

```txt
POST /v3/memories/add/
```

Instead of returning a completed memory result, it queues the memory-processing job and returns:

```json
{
  "message": "Memory processing has been queued for background execution",
  "status": "PENDING",
  "event_id": "..."
}
```

The caller can then poll the event status until it becomes `SUCCEEDED` or `FAILED`.

That is probably the **single most important thing** for this MCP update.

### What this means for the MCP tool design

The current `add_memory` likely behaves like:

```txt
store this → done
```

V3 behaves more like:

```txt
queue this → here is an event ID → processing finishes later
```

For MCP, I would not make users manually deal with raw event IDs unless they want to. That is annoying as hell for agents.

Instead, make `add_memory` support two modes:

```ts
waitForCompletion?: boolean // default true
timeoutMs?: number          // default 10_000 or 15_000
```

Behavior:

* Default: submit write, poll event automatically, return final result.
* Optional async mode: immediately return `event_id`.
* If polling times out: return a useful `"PENDING"` response with the event ID and tell the agent which tool can inspect it.

That gives agents a clean experience without hiding the new async architecture.

---

# V3 no longer automatically updates or deletes old memories

This is a big semantic shift.

Older Mem0 behavior could extract a fact and decide to add, update, or delete existing memories. The V3 pipeline is now described as **single-pass ADD-only extraction**. It accumulates memories and does not overwrite or remove prior ones automatically.

That means something like:

```txt
"I live in Boston."
```

followed later by:

```txt
"I moved to Manchester."
```

may result in two memories instead of Mem0 silently replacing the old one.

Mem0 says temporal reasoning and graph/entity linking help retrieve the right fact later, but the cleanup/edit APIs become more important.

## Feature implication for the MCP

We should absolutely add:

```txt
update_memory
get_memory
get_memory_history
list_memories
```

And ideally one higher-level helper:

```txt
manage_memory
```

That tool could let an agent deliberately:

* inspect an existing memory
* revise it
* delete it
* annotate it
* review history before changing it

This is more valuable now than it was under the old auto-merge model.

---

# Current core V3 API surface

## 1. Add memories

```txt
POST /v3/memories/add/
```

Required:

```ts
messages: Array<{ role: string; content: string }>
```

At least one scope ID is required:

```ts
user_id?
agent_id?
app_id?
run_id?
```

Additional useful inputs:

```ts
metadata?
custom_instructions?
infer? // false = store provided text without extraction
```

Notable details:

* `infer: false` is excellent for deliberate, exact memories.
* `custom_instructions` can steer the extraction behavior for a single call.
* `run_id` is now a first-class scope ID.
* The operation returns an async event ID.

### What to add to the existing `add_memory`

The README currently advertises older-style options such as `includes`, `excludes`, `outputFormat`, custom categories, immutable, expiration date, etc. Those are not the core fields emphasized in the current V3 docs. I would validate all of those against the new SDK before keeping them exposed, because some may now be deprecated, ignored, renamed, or Platform-only.

Recommended modern tool shape:

```ts
add_memory({
  messages,
  userId?,
  agentId?,
  appId?,
  runId?,
  metadata?,
  infer?,
  customInstructions?,
  waitForCompletion?,
  timeoutMs?
})
```

Also keep the convenient `content` string shorthand, but internally convert it into:

```ts
messages: [{ role: "user", content }]
```

---

## 2. Search memories

```txt
POST /v3/memories/search/
```

V3 search is no longer just vector similarity. Mem0 says it uses:

* semantic retrieval
* BM25 keyword retrieval
* entity matching
* fused scoring

The score is still returned as a normalized `0–1` value.

The new shape requires entity IDs inside `filters`, not as top-level request fields:

```json
{
  "query": "Where does the user live?",
  "filters": {
    "user_id": "alice"
  },
  "top_k": 10
}
```

Top-level `user_id`, `agent_id`, `app_id`, and `run_id` are rejected with HTTP 400 in V3 search/list endpoints.

## Important migration bug to avoid

My existing server takes:

```ts
search_memory({
  query,
  userId,
  sessionId?,
  agentId?,
  appId?,
  filters?
})
```

We need to make sure the MCP layer combines them into the V3 `filters` object rather than passing them as old top-level SDK params.

Example internal normalization:

```ts
const filters = {
  ...userFilters,
  ...(userId ? { user_id: userId } : {}),
  ...(agentId ? { agent_id: agentId } : {}),
  ...(appId ? { app_id: appId } : {}),
  ...(runId ? { run_id: runId } : {}),
};
```

V3 also supports richer filtering operators:

```txt
AND
OR
NOT

in
gte
lte
gt
lt
ne
icontains
*
```

That opens up much better MCP-side features than the current generic `filters: object`.

### Recommended new search options

```ts
search_memory({
  query,
  userId?,
  agentId?,
  appId?,
  runId?,
  filters?,
  topK?,
  threshold?,
  referenceDate?,
  includeMetadata?,
})
```

The especially interesting new one is:

```ts
referenceDate
```

Mem0 added temporal reasoning support for relative queries such as “last week,” “upcoming,” “right now,” and “as of.” Supplying a reference date makes behavior reproducible for backfills/tests.

That would be badass for agents doing project-history recall:

```txt
"What did we decide about the auth architecture last month?"
```

---

# New API features worth exposing as MCP tools

## High priority: genuinely useful to MCP users

### `list_memories`

Current endpoint:

```txt
POST /v3/memories/?page=1&page_size=50
```

It returns:

```json
{
  "count": 123,
  "next": "...",
  "previous": null,
  "results": [...]
}
```

It supports pagination plus advanced logical and comparison filters.

This is a glaring gap in my MCP right now. Agents need a way to inspect a person/project’s memory store without inventing a search query.

Suggested tool:

```ts
list_memories({
  userId?,
  agentId?,
  appId?,
  runId?,
  filters?,
  page?,
  pageSize?,
})
```

I would default `pageSize` to 25 or 50, not 100, because dumping a giant memory landfill into an LLM context is how we summon chaos.

---

### `get_memory`

Mem0 provides a single-memory retrieval endpoint under the V1 memory API surface. The MCP should expose it as:

```ts
get_memory({
  memoryId
})
```

This makes update/delete workflows much safer because the model can inspect the exact record first. The docs list it as a supported memory API alongside history, feedback, export, and batch operations.

---

### `update_memory`

Current endpoint:

```txt
PUT /v1/memories/{memory_id}/
```

Supported fields:

```ts
text?
metadata?
```

This is now more important because V3 add does not automatically merge/update old memories.

Suggested MCP tool:

```ts
update_memory({
  memoryId,
  text?,
  metadata?,
})
```

---

### `get_memory_history`

Current endpoint:

```txt
GET /v1/memories/{memory_id}/history/
```

It returns historical versions including:

* original input
* previous memory value
* new memory value
* metadata
* timestamps

Suggested tool:

```ts
get_memory_history({
  memoryId
})
```

This is excellent for transparency/debugging. It also gives this MCP server a feature the official basic memory MCP setups often skip.

---

### `delete_memories`

Mem0 now supports bulk deletion in addition to deleting a single memory.

Suggested MCP tool:

```ts
delete_memories({
  memoryIds,
  confirm?: boolean
})
```

For safety, I would require:

```ts
confirm: true
```

when deleting more than one memory.

Nobody needs an agent having a “whoops, there goes the entire personality profile” afternoon.

---

### `update_memories`

Mem0 supports batch memory updates:

```txt
PUT /v1/batch/
```

with entries containing memory IDs and replacement text.

This is useful, but I would place it behind a more explicit advanced tool rather than making it part of everyday agent behavior.

```ts
batch_update_memories({
  updates: Array<{
    memoryId: string;
    text?: string;
    metadata?: Record<string, unknown>;
  }>
})
```

---

# Medium priority: useful but not essential

## `memory_feedback`

Mem0 now accepts feedback for memory quality:

```txt
POST /v1/feedback/
```

Values:

```txt
POSITIVE
NEGATIVE
VERY_NEGATIVE
```

It can include a human-readable reason.

Suggested MCP tool:

```ts
rate_memory({
  memoryId,
  feedback,
  reason?
})
```

This could be useful for agent self-correction, but I would not let agents silently downvote/delete memories by default. Make it user-initiated or only available to clients explicitly enabling it.

---

## `get_events` and `get_event`

V3 writes are async, so events are now useful. Mem0 provides event APIs for:

* recent event listing
* individual event retrieval
* failure inspection
* audit/logging
* monitoring latency/status

Suggested tools:

```ts
get_memory_event({ eventId })

list_memory_events({
  page?,
  pageSize?,
})
```

This becomes much more useful if `add_memory` supports `waitForCompletion: false`.

---

## `list_entities`

Mem0 has an entity API that lists users and returns fields including:

* ID
* name
* total memories
* owner
* organization
* metadata

Suggested tool:

```ts
list_memory_users()
```

I would call it `list_memory_users`, not merely `list_users`, so it does not sound like it is querying the MCP client’s application users.

This is useful in shared/multi-agent deployments, but not necessary for small personal MCP use.

---

## `export_memories`

Mem0 can create structured exports using a schema and filters:

```txt
POST /v1/exports/
```

The export is asynchronous and returns an export job ID. It accepts a custom schema plus user/agent/app/run filters, with organization/project context available too.

Honestly, this is a very cool tool for people using my server as a knowledge-management layer.

Suggested tools:

```ts
create_memory_export({
  schema,
  filters?,
  orgId?,
  projectId?
})

get_memory_export({
  exportId
})
```

This could support things like:

```txt
"Turn all memories about this project into a concise project profile."
```

or:

```txt
"Export user preferences as structured JSON."
```

I would put this in an “advanced cloud tools” feature flag because arbitrary schemas can get spicy fast.

---

# Webhooks: probably not a first release feature for the MCP

Mem0 has project-level webhooks with event types:

```txt
memory:add
memory:update
memory:delete
memory:categorize
```

The API can create, list, update, and delete webhook configurations.

This is useful for server-side applications, dashboards, audit systems, or event-driven automation.

But for a local stdio MCP server, webhooks are not especially useful unless we plan to add an HTTP transport or companion service, which is probably not necessary.

### Thoughts

Do **not** make webhook management a core tool in the next update.

Add it later if we eventually release one of these:

* HTTP/SSE MCP transport
* hosted version of the MCP server
* dashboard/UI
* event relay integration
* Cloudflare Worker companion

Otherwise it is just more knobs for the agent to fiddle with while accomplishing precisely jack shit.

---

# Project-level memory decay is interesting

Mem0 added optional Memory Decay in May 2026.

It changes ranking at search time by favoring recently accessed/recently relevant memories and damping stale ones. It does not delete or hide memories; it only affects ranking. It is disabled by default and configured per project.

This is potentially useful for long-running coding-agent memory.

Example:

```txt
Old stack decision from 2024
vs.
Current stack decision from this week
```

The newer/current fact gets more natural priority.

### Should the MCP expose this?

Not in the first update unless we also expose Mem0 project management.

If we eventually do:

```ts
get_project_settings()
update_project_settings({
  decay?: boolean
})
```

But this should be clearly marked as a **cloud project setting**, not a per-memory option.

---

# The graph/entity stuff means we should not reinvent graph memory

Mem0’s newer memory system includes automatic entity extraction and linking across memories. The migration docs describe built-in graph memory rather than requiring a separately configured graph store.

That means I would **not** add our own custom knowledge graph layer unless we have a unique UX angle, which I currently have no plans for.

Better idea:

* expose the improved V3 search
* expose memory history
* expose list/get/update
* let Mem0 manage entity linking internally

We could later add a friendly MCP tool such as:

```ts
get_related_memories({
  memoryId,
  depth?: number
})
```

But only if Mem0 exposes a stable graph/entity endpoint for it. I did not see a documented public endpoint for traversing the graph directly in the current API reference, so do not fake one.

---

# The local and Supabase modes need a design decision

The server currently supports:

1. Mem0 Cloud
2. Supabase
3. Local in-memory mode

The newer Mem0 docs explicitly separate the managed Platform API from self-hosted OSS behavior. The Platform V3 features—advanced retrieval, newer entity filtering, custom categories, webhooks, and some memory-management features—are not guaranteed to exist in OSS mode.

That means my tools should expose **capability awareness**.

## Add a `memory_status` or `get_capabilities` tool

Something like:

```ts
get_memory_capabilities()
```

Return:

```json
{
  "mode": "cloud",
  "apiVersion": "v3",
  "supportsAsyncEvents": true,
  "supportsBatchOperations": true,
  "supportsHistory": true,
  "supportsExports": true,
  "supportsWebhooks": true,
  "supportsAdvancedFilters": true,
  "supportsTemporalReasoning": true
}
```

For Supabase/local:

```json
{
  "mode": "supabase",
  "supportsAsyncEvents": false,
  "supportsBatchOperations": false,
  "supportsHistory": "server-implemented",
  "supportsExports": false,
  "supportsWebhooks": false
}
```

That would be a genuinely useful differentiator for this MCP server. It prevents models from trying a cloud-only tool and faceplanting into an opaque error.

---

# My recommended tool set for version 1.0

## Core tools

```txt
add_memory
search_memory
list_memories
get_memory
update_memory
delete_memory
```

## Quality and visibility tools

```txt
get_memory_history
get_memory_event
list_memory_events
get_memory_capabilities
```

## Advanced tools

```txt
batch_update_memories
batch_delete_memories
rate_memory
create_memory_export
get_memory_export
list_memory_users
```

## Do later / optional cloud admin pack

```txt
list_webhooks
create_webhook
update_webhook
delete_webhook
get_project_settings
update_project_settings
```

---

# Suggested MCP tool naming cleanup

The current names are understandable, but I would make the naming more consistent:

| Current         | Better                    |
| --------------- | ------------------------- |
| `add_memory`    | `add_memory`              |
| `search_memory` | `search_memories`         |
| `delete_memory` | `delete_memory`           |
| New             | `list_memories`           |
| New             | `get_memory`              |
| New             | `update_memory`           |
| New             | `get_memory_history`      |
| New             | `get_memory_event`        |
| New             | `get_memory_capabilities` |

I would use plural names whenever the tool returns multiple things.

---

# Two killer features I would add that Mem0 itself does not hand users

## 1. `remember_preference`

A high-level safe helper for storing user preferences intentionally.

```ts
remember_preference({
  userId,
  preference,
  category?,
  source?,
  confidence?,
})
```

Internally:

```ts
infer: false
metadata: {
  type: "preference",
  source,
  confidence
}
```

Why this matters: agents are notoriously too eager to store random garbage as “memory.” A specialized preference tool encourages more deliberate persistence.

---

## 2. `review_memory_changes`

A tool that searches recent memories and flags likely duplicates/conflicts.

Example output:

```json
{
  "possibleConflicts": [
    {
      "memoryId": "abc",
      "memory": "User lives in Boston",
      "conflictsWith": {
        "memoryId": "xyz",
        "memory": "User moved to Manchester"
      }
    }
  ]
}
```

Because V3 is ADD-only, this is a perfect companion feature. We could implement it with:

1. `list_memories`
2. local grouping by entity/category/date
3. optional LLM-free heuristics first
4. optional model-assisted review only when requested

This would make thid MCP more than a thin SDK wrapper. That is where the fun shit lives.

---

# SDK/version work we should do immediately

Mem0’s docs say the current Node SDK package is still:

```bash
npm install mem0ai
```

The current TypeScript SDK line is in the V3 era, and Mem0’s own OpenClaw integration upgraded to `mem0ai` `3.0.1` for V3 API compatibility in June 2026.

So I would:

```bash
npm install mem0ai@latest
```

Then audit:

* constructor shape
* `MemoryClient.add()`
* `MemoryClient.search()`
* `MemoryClient.getAll()`
* update/delete/batch methods
* event methods
* TypeScript response types
* SDK handling of `v3` filter structure
* whether legacy fields in my MCP schema still map correctly

Do not blindly bump the dependency and pray to the package manager gods. The V3 endpoint behavior changes enough that this deserves integration tests.

---

# Tests I would add before releasing

## Add flow

* Add a basic user memory.
* Add with `infer: false`.
* Add with `run_id`.
* Add with metadata.
* Verify event polling succeeds.
* Verify timeout returns a pending event ID cleanly.

## Search flow

* Search by `user_id` via `filters`.
* Search with `AND`.
* Search with date comparison.
* Search with metadata field matching.
* Search with `reference_date`.
* Confirm old top-level scope IDs do not sneak into V3 requests.

## Maintenance flow

* List paginated memories.
* Get a specific memory.
* Update a memory.
* Get history.
* Delete a single memory.
* Batch update/delete in a test project only.

## Multi-mode behavior

* Cloud mode exposes all cloud tools.
* Supabase mode gracefully reports unsupported cloud-only tools.
* Local mode does not claim capabilities it cannot actually provide.

---

# My blunt priority order

### Ship first

1. Upgrade `mem0ai`.
2. Move cloud add/search/list behavior to V3.
3. Add async event polling.
4. Add `list_memories`.
5. Add `get_memory`.
6. Add `update_memory`.
7. Add `get_memory_history`.
8. Add capability reporting.

### Ship second

9. Batch update/delete.
10. Feedback tool.
11. Event inspection.
12. Export tools.

### Hold for later

13. Webhook administration.
14. Organization/project administration.
15. Memory decay controls.
16. Any custom graph visualization stuff.

That path gets us modern compatibility plus practical agent tools without turning this MCP server into a miniature Mem0 control panel wearing a trench coat.

One extra caution: Mem0 recently warned about a malicious npm package impersonating its MCP server. My package is unrelated, but it is worth making the README/security section very explicit about the official npm package name, GitHub repo, and that users should verify source/install commands.