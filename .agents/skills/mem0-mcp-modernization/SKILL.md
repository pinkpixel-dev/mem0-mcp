---
name: mem0-mcp-modernization
description: Modernize and maintain the pinkpixel-dev/mem0-mcp server against Mem0 Platform API V3. Use when changing Mem0 API calls, SDK usage, MCP tool schemas, cloud/local capability behavior, tests, or documentation.
metadata:
  owner: pinkpixel-dev
  repository: https://github.com/pinkpixel-dev/mem0-mcp
  last_verified: 2026-06-24
  source_of_truth: https://docs.mem0.ai/api-reference
---

# Mem0 MCP Modernization Skill

## Purpose

Maintain `pinkpixel-dev/mem0-mcp` as a reliable MCP interface for Mem0 while supporting its existing Cloud, Supabase, and local/in-memory modes. Prefer a stable, ergonomic MCP layer over exposing every Mem0 REST endpoint blindly.

This skill is specifically about **Mem0 Platform API V3** migration and feature design. Treat older V1/V2 assumptions as potentially stale until verified against the current Mem0 docs and installed SDK types.

## Non-negotiable rules

1. **Do not silently send old V2 request shapes to V3 endpoints.**
2. **Do not pretend all Cloud capabilities exist in Supabase or local mode.** Capability-report and fail clearly instead.
3. **Do not expose destructive bulk actions without an explicit confirmation field.**
4. **Do not make callers manually poll async events by default.** Provide a good default polling experience with an opt-out.
5. **Do not remove existing convenient MCP inputs without a compatibility path or a major-version migration note.**
6. **Use the current official docs and installed `mem0ai` package types as final authority when implementation details disagree.**

## Current Mem0 Platform API facts

### Authentication

All hosted REST calls use token authentication:

```http
Authorization: Token <MEM0_API_KEY>
Accept: application/json
Content-Type: application/json
```

Keep API keys server-side only. Never expose them in browser code, logs, test fixtures, screenshots, or generated docs.

### V3 add-memory behavior is asynchronous and ADD-only

Endpoint:

```http
POST https://api.mem0.ai/v3/memories/add/
```

Minimal request:

```json
{
  "messages": [
    { "role": "user", "content": "I moved to Manchester last month." }
  ],
  "user_id": "user-123"
}
```

Important behavior:

- Requires `messages`.
- Requires at least one entity scope: `user_id`, `agent_id`, `app_id`, or `run_id`.
- Supports `metadata`, `custom_instructions`, and `infer`.
- `infer: false` stores messages verbatim instead of invoking memory extraction.
- Returns an async event response, usually `PENDING` plus `event_id`.
- V3 extraction is **single-pass ADD-only**. It does not automatically update or delete old memories. Memories can accumulate and require deliberate maintenance.

Typical response:

```json
{
  "message": "Memory processing has been queued for background execution",
  "status": "PENDING",
  "event_id": "evt-uuid"
}
```

Event polling endpoint:

```http
GET /v1/event/{event_id}/
```

Terminal statuses are expected to include `SUCCEEDED` and `FAILED`.

### V3 search behavior

Endpoint:

```http
POST https://api.mem0.ai/v3/memories/search/
```

Minimal request:

```json
{
  "query": "Where does the user live?",
  "filters": {
    "user_id": "user-123"
  },
  "top_k": 10
}
```

Important behavior:

- Search is hybrid: semantic retrieval, BM25 keyword retrieval, and entity matching.
- Entity IDs must be nested inside `filters` for V3 search.
- Do **not** send `user_id`, `agent_id`, `app_id`, or `run_id` as top-level search fields; V3 rejects that shape.
- At least one entity ID is required in `filters`.
- `top_k`: 1–1000, default 10.
- `threshold`: default 0.1; pass `0.0` to disable threshold filtering.
- `rerank`: default false; enabling it may improve ordering but adds latency.
- `reference_date` supports Unix epoch, `YYYY-MM-DD`, or ISO datetime for relative-time interpretation.
- Supported logical/comparison filtering includes `AND`, `OR`, `NOT`, `in`, `gte`, `lte`, `gt`, `lt`, `contains`, `icontains`, `ne`, and wildcard `*`.

Example complex filter:

```json
{
  "AND": [
    { "user_id": "user-123" },
    { "categories": { "in": ["preferences"] } },
    { "run_id": "*" }
  ]
}
```

## Recommended MCP tool surface

### Core tools: include in the next modernization release

```text
add_memory
search_memories
list_memories
get_memory
update_memory
delete_memory
get_memory_history
get_memory_capabilities
```

### Quality / observability tools: add once async behavior is implemented

```text
get_memory_event
list_memory_events
```

### Advanced cloud tools: add only after the core tools are solid

```text
batch_update_memories
batch_delete_memories
rate_memory
create_memory_export
get_memory_export
list_memory_users
```

### Defer unless there is an HTTP/hosted companion service or dashboard

```text
create_webhook
list_webhooks
update_webhook
delete_webhook
get_project_settings
update_project_settings
```

Webhooks and project administration are legitimate Mem0 features, but they are not core value for a local stdio MCP server.

## Tool contracts and compatibility guidance

### `add_memory`

Preferred MCP schema:

```ts
interface AddMemoryInput {
  // Backward-compatible convenience input. Convert to one user message when supplied.
  content?: string;

  // Preferred V3 input.
  messages?: Array<{ role: string; content: string }>;

  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  metadata?: Record<string, unknown>;
  infer?: boolean;
  customInstructions?: string;

  // MCP ergonomics, implemented by this server.
  waitForCompletion?: boolean; // default true
  timeoutMs?: number;          // default 10_000–15_000
}
```

Validation and behavior:

- Require either `content` or `messages`; reject calls that provide neither.
- Normalize camelCase MCP names to Mem0 snake_case API fields.
- Require at least one scope ID after normalization.
- If both `content` and `messages` are supplied, prefer `messages` and either warn or reject to avoid ambiguity.
- Default `waitForCompletion` to true.
- When waiting: poll the event until terminal status or timeout.
- When timing out: return a structured `PENDING` result with `eventId`, `elapsedMs`, and a clear message to call `get_memory_event`.
- Never fake a completed memory result before the event succeeds.

Suggested result shape:

```ts
interface AddMemoryResult {
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  eventId: string;
  memories?: Array<unknown>;
  error?: { message: string; code?: string };
  elapsedMs?: number;
}
```

### `search_memories`

Preferred MCP schema:

```ts
interface SearchMemoriesInput {
  query: string;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  filters?: Record<string, unknown>;
  topK?: number;
  threshold?: number;
  rerank?: boolean;
  referenceDate?: string | number;
}
```

Normalization rule:

```ts
const scopeFilters = {
  ...(userId ? { user_id: userId } : {}),
  ...(agentId ? { agent_id: agentId } : {}),
  ...(appId ? { app_id: appId } : {}),
  ...(runId ? { run_id: runId } : {}),
};

const finalFilters = mergeFiltersSafely(scopeFilters, filters);
```

Rules:

- Ensure at least one scope entity exists in the final V3 `filters` tree.
- Do not accidentally overwrite a user-supplied logical filter when appending scope filters.
- If a caller supplies both `userId` and `filters.user_id` with different values, reject with a clear validation error.
- Preserve advanced `AND`/`OR`/`NOT` filters rather than flattening them.
- Return compact results by default; avoid stuffing huge metadata blobs into model context unless requested.

### `list_memories`

Recommended schema:

```ts
interface ListMemoriesInput {
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}
```

Guidance:

- Default `pageSize` to 25 or 50.
- Cap `pageSize` to the official API limits after verifying them.
- Return pagination metadata (`count`, `next`, `previous`, `page`, `pageSize`) where available.
- This tool is essential for inspection and cleanup now that V3 adds rather than auto-merges memories.

### `get_memory`, `update_memory`, and `get_memory_history`

Use these as a safe maintenance trio:

1. `get_memory(memoryId)` before changes.
2. `update_memory({ memoryId, text?, metadata? })` for deliberate edits.
3. `get_memory_history(memoryId)` for audit/debugging.

Do not claim that V3 add automatically resolves duplicates or stale facts. Update/delete is now a first-class management workflow.

### `delete_memory` and bulk delete

- Single delete may be a normal core tool.
- Bulk delete must require `confirm: true`.
- For bulk delete, return an explicit preview/count when feasible.
- Never accept broad unscoped destructive actions such as "delete everything" without a strong confirmation and clear scope.

Recommended bulk schema:

```ts
interface BatchDeleteMemoriesInput {
  memoryIds: string[];
  confirm: true;
}
```

### `get_memory_event` and `list_memory_events`

These are support tools for V3 async operations.

- `get_memory_event` should accept one `eventId`.
- `list_memory_events` should support pagination.
- Surface failures cleanly, including event status and provider error details when safe to show.

### `get_memory_capabilities`

Implement this even if it is server-generated rather than backed by a direct Mem0 endpoint.

Example:

```json
{
  "mode": "cloud",
  "apiVersion": "v3",
  "supportsAsyncEvents": true,
  "supportsListMemories": true,
  "supportsHistory": true,
  "supportsBatchOperations": true,
  "supportsExports": true,
  "supportsWebhooks": true,
  "supportsAdvancedFilters": true,
  "supportsTemporalSearch": true
}
```

For Supabase/local, report only what is truly implemented. Use booleans or a string such as `"server-implemented"` only when the distinction helps users understand behavior.

## Mode-aware architecture

The server supports multiple backends. Keep the MCP API stable where possible, but surface capability differences honestly.

| Feature | Mem0 Cloud V3 | Supabase mode | Local/in-memory mode |
|---|---:|---:|---:|
| Async event IDs | Expected | Not guaranteed | No |
| Hybrid V3 search | Expected | Not guaranteed | No |
| Advanced logical filters | Expected | Backend-dependent | Usually no |
| Memory history | Cloud API | Implement only if available | Optional server implementation |
| Batch operations | Cloud API | Backend-dependent | Optional server implementation |
| Exports/webhooks/project settings | Cloud API | No | No |

Implementation pattern:

```ts
interface MemoryBackend {
  readonly mode: 'cloud' | 'supabase' | 'local';
  getCapabilities(): Promise<MemoryCapabilities>;
  add(input: NormalizedAddInput): Promise<AddResult>;
  search(input: NormalizedSearchInput): Promise<SearchResult>;
  list?(input: ListInput): Promise<ListResult>;
  get?(memoryId: string): Promise<MemoryRecord>;
  update?(input: UpdateInput): Promise<MemoryRecord>;
  delete?(memoryId: string): Promise<void>;
}
```

Avoid scattering `if (mode === ...)` checks across every MCP tool handler. Put provider-specific behavior behind backend adapters.

## Recommended implementation sequence

### Phase 1 — get Cloud V3 correct

1. Upgrade `mem0ai` to the current compatible release.
2. Read installed SDK type definitions and compare them with official REST docs.
3. Implement V3 `add_memory` normalization and event polling.
4. Implement V3 `search_memories` filter normalization.
5. Add integration tests for raw REST payload shapes.

### Phase 2 — make memory maintenance usable

1. Add `list_memories`.
2. Add `get_memory`.
3. Add `update_memory`.
4. Add `get_memory_history`.
5. Add clear documentation explaining V3 ADD-only semantics.

### Phase 3 — observability and advanced features

1. Add event inspection.
2. Add batch update/delete with confirmation.
3. Add feedback and exports only after confirming SDK/API support.
4. Add webhooks/project administration only if a hosted or HTTP-facing use case exists.

## Test checklist

### Add flow

- [ ] Add one memory with `content` shorthand.
- [ ] Add one memory with `messages`.
- [ ] Add with `infer: false`.
- [ ] Add with each valid scope ID type.
- [ ] Add with metadata and custom instructions.
- [ ] Verify default polling reaches terminal event state.
- [ ] Verify timeout produces a usable `PENDING` result with event ID.
- [ ] Verify provider failures are surfaced without leaking API secrets.

### Search flow

- [ ] Search using `userId` and verify it is nested under `filters.user_id`.
- [ ] Search using advanced `AND`/`OR` filter trees.
- [ ] Search using categories and metadata filters.
- [ ] Search with `referenceDate`.
- [ ] Search with `threshold: 0.0`.
- [ ] Search with `rerank: true`.
- [ ] Reject missing scope entities before sending the API request.
- [ ] Reject conflicting shorthand scopes and raw filter scopes.

### Maintenance flow

- [ ] List with pagination.
- [ ] Get one memory.
- [ ] Update text.
- [ ] Update metadata.
- [ ] Retrieve history after update.
- [ ] Delete one memory.
- [ ] Verify bulk delete refuses without `confirm: true`.
- [ ] Verify batch updates/deletes are scoped to test data only.

### Multi-mode flow

- [ ] Cloud reports V3 async/event support.
- [ ] Supabase reports only implemented capabilities.
- [ ] Local mode rejects unavailable tools with actionable errors.
- [ ] No backend claims support it does not actually provide.

## Error-handling conventions

Use structured, actionable errors. Avoid vague messages like `request failed`.

Good:

```json
{
  "error": {
    "code": "MEM0_SCOPE_REQUIRED",
    "message": "Mem0 V3 search requires at least one entity scope. Provide userId, agentId, appId, runId, or an equivalent entity filter.",
    "hint": "For example: { userId: 'user-123' }"
  }
}
```

Good:

```json
{
  "error": {
    "code": "FEATURE_UNAVAILABLE",
    "message": "get_memory_history is only available in the configured Mem0 Cloud backend.",
    "backend": "local"
  }
}
```

Never include raw `Authorization` headers, API keys, or entire upstream error dumps in normal MCP responses.

## Documentation updates to make with the release

Update the README and changelog to state:

- Cloud mode uses the Mem0 Platform V3 pipeline.
- Memory addition is asynchronous and the MCP server can wait/poll by default.
- V3 memory extraction is ADD-only; stale/conflicting memories should be maintained using get/update/delete/history tools.
- Search scope IDs are normalized into V3 `filters`.
- Cloud-only features are capability-gated.
- Official install source is the repository and published package only; users should verify package/repo identity before installing.

## Source links — verify before implementing

Use these official pages first when working on this codebase:

- API overview: https://docs.mem0.ai/api-reference
- Add memories (V3): https://docs.mem0.ai/api-reference/memory/add-memories
- Search memories (V3): https://docs.mem0.ai/api-reference/memory/search-memories
- V2 to V3 migration: https://docs.mem0.ai/migration/platform-v2-to-v3
- Documentation index for discovery: https://docs.mem0.ai/llms.txt

When adding a feature that is not covered above, locate the exact current API reference page from the docs index before coding. Do not infer endpoint paths or request shapes from old examples, blog posts, GitHub issues, or stale SDK snippets.
