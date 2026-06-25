---
name: mem0-api
description: >
  Complete reference for building applications with the Mem0 memory API and SDK — a
  persistent, self-improving memory layer for LLM agents and chatbots. ALWAYS use this skill
  when the user mentions: "mem0", "mem0ai", "MemoryClient", "Memory()", "memory layer for AI",
  "persistent agent memory", "long-term memory for chatbots", "cross-session memory", or any
  request to add memory to AI agents/assistants that survives between conversations. Also
  trigger when discussing: adding/searching/updating/deleting memories, entity-scoped memory
  (user_id/agent_id/run_id), Mem0 MCP server integration, Mem0 webhooks, mem0.ai, or migrating
  from OSS to Platform. If the user wants AI to "remember" things about users across sessions,
  this skill is almost certainly what they need — trigger it even if they don't mention Mem0 by
  name.
---

# Mem0 API & SDK

Mem0 is a managed memory layer for LLM agents. It extracts facts from conversations,
deduplicates, and exposes them via semantic search — giving agents persistent, cross-session
context without you managing a vector DB.

**Two products, one mental model:**
- **Mem0 Platform** (managed, recommended) — hosted API + dashboard, sub-50ms retrieval
- **Mem0 OSS** (self-hosted) — run your own vector store, LLM, and embedder stack

## Quick Product Routing

```
User imports `from mem0 import MemoryClient`      → Platform
User imports `from mem0 import Memory`             → OSS (Python)
User imports `import { Memory } from "mem0ai/oss"` → OSS (Node)
User imports `import MemoryClient from "mem0ai"`   → Platform (TS/JS)
No package installed yet                           → Recommend Platform first
```

---

## Install

```bash
# Python
pip install mem0ai

# Node / TypeScript
npm install mem0ai

# CLI
pip install mem0-cli    # Python CLI
npm install -g @mem0/cli  # Node CLI
```

**API Key:** Get from [app.mem0.ai/dashboard/api-keys](https://app.mem0.ai/dashboard/api-keys)

Auth header: `Authorization: Token <YOUR_API_KEY>`

---

## Platform SDK — Core CRUD (TypeScript / Python)

### TypeScript (primary for this project)

```ts
import MemoryClient from "mem0ai";

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

// ADD — async, returns event_id
const result = await client.add(
  [{ role: "user", content: "I moved to Austin last month." }],
  { user_id: "alice" }
);
// result.event_id → poll GET /v1/event/{id}/ to confirm SUCCEEDED

// SEARCH — V3 hybrid (semantic + BM25 + entity). Filters REQUIRED in V3.
const hits = await client.search("Where does Alice live?", {
  filters: { user_id: "alice" },
  top_k: 10,
});

// GET ALL
const all = await client.getAll({ user_id: "alice" });

// GET ONE
const mem = await client.get("<memory_id>");

// UPDATE
await client.update("<memory_id>", { text: "Alice lives in Austin, TX" });

// DELETE ONE
await client.delete("<memory_id>");

// DELETE ALL for a scope
await client.deleteAll({ user_id: "alice" });
```

### Python

```python
from mem0 import MemoryClient

client = MemoryClient(api_key="your-api-key")

# ADD
result = client.add(
    [{"role": "user", "content": "I love hiking on weekends"}],
    user_id="alice",
)

# SEARCH (V3 — filters required)
results = client.search(
    "What are Alice's hobbies?",
    filters={"user_id": "alice"},
    top_k=10,
)

# CRUD mirrors TypeScript API
client.get_all(user_id="alice")
client.get("<memory_id>")
client.update("<memory_id>", data="Alice loves mountain hiking")
client.delete("<memory_id>")
client.delete_all(user_id="alice")
```

---

## REST API Quick Reference

Base URL: `https://api.mem0.ai`

| Operation       | Method | Endpoint                    | Notes                                |
|-----------------|--------|-----------------------------|--------------------------------------|
| Add memories    | POST   | `/v3/memories/add/`         | Async; returns `event_id`            |
| Search          | POST   | `/v3/memories/search/`      | Filters object required in V3        |
| Get all         | GET    | `/v1/memories/`             | Query params: user_id, page, etc.    |
| Get one         | GET    | `/v1/memories/{id}/`        |                                      |
| Update          | PATCH  | `/v1/memories/{id}/`        |                                      |
| Delete one      | DELETE | `/v1/memories/{id}/`        |                                      |
| Delete all      | DELETE | `/v1/memories/`             | Scoped by entity params              |
| Memory history  | GET    | `/v1/memories/{id}/history/`| Full change log for a memory         |
| Poll event      | GET    | `/v1/event/{event_id}/`     | Status: PENDING / SUCCEEDED / FAILED |
| Get users       | GET    | `/v1/entities/`             | List known users/agents              |
| Batch update    | POST   | `/v1/memories/batch/`       | Bulk update many memories            |
| Batch delete    | POST   | `/v1/memories/batch-delete/`| Bulk delete many memories            |
| Create webhook  | POST   | `/v1/webhooks/`             |                                      |
| Feedback        | POST   | `/v1/memories/{id}/feedback/`| User quality signal                 |

→ Full request/response shapes: `references/api-endpoints.md`

---

## Entity Scoping (Critical — Read This)

Memories are scoped with up to 4 identifiers:

| Field      | Purpose                                 | Example            |
|------------|-----------------------------------------|--------------------|
| `user_id`  | Persistent person/account               | `"customer_6412"`  |
| `agent_id` | Distinct agent persona                  | `"travel_planner"` |
| `app_id`   | Tenant / white-label product surface    | `"ios_retail_app"` |
| `run_id`   | Ephemeral session / support ticket      | `"ticket-9241"`    |

**Key rules:**
1. At least one entity ID required on every add/search
2. **V3 search**: entity IDs go INSIDE the `filters` object (top-level rejected with 400)
3. Writing with `user_id="alice"` + `agent_id=null` → searching `{user_id:"alice", agent_id:"bot"}` returns **nothing** (null != "bot")
4. Platform stores multi-ID writes as separate records per entity. Query per-entity scope using OR, not AND across entities.
5. Wildcard `"*"` matches any non-null value: `{"run_id": "*"}` = any session

```ts
// ✅ Correct V3 search
await client.search("hobbies", {
  filters: { user_id: "alice" }
});

// ✅ OR across entities
await client.search("hobbies", {
  filters: {
    OR: [{ user_id: "alice" }, { agent_id: { in: ["bot-a", "bot-b"] } }]
  }
});

// ❌ Wrong — top-level entity IDs rejected in V3
await client.search("hobbies", { user_id: "alice" }); // 400 error
```

---

## V3 Search Filter Operators

Filters support full logical composition:

```json
{
  "AND": [
    { "user_id": "alice" },
    { "categories": { "in": ["hobbies", "travel"] } },
    { "created_at": { "gte": "2025-01-01" } }
  ]
}
```

Operators: `in`, `gte`, `lte`, `gt`, `lt`, `ne`, `icontains`, `contains`, `*` (wildcard)

Search params:
- `top_k`: 1–1000, default 10
- `threshold`: 0–1, default 0.1 (pass 0.0 to disable)
- `rerank`: default false (enable for better ordering at cost of latency)
- `reference_date`: Unix epoch / ISO datetime for temporal reasoning

---

## MCP Integration

Mem0 has a hosted MCP server — ideal for giving Claude/Cursor/Codex automatic memory:

```bash
# One-command setup for all clients
npx mcp-add \
  --name mem0-mcp \
  --type http \
  --url "https://mcp.mem0.ai/mcp" \
  --clients "claude,claude code,cursor,windsurf,vscode,opencode"
```

MCP tools exposed: `add_memory`, `search_memories`, `get_memories`, `get_memory`,
`update_memory`, `delete_memory`, `delete_all_memories`, `delete_entities`,
`list_entities`, `list_events`, `get_event_status`

→ See `references/mcp-and-integrations.md` for framework integrations (LangChain, Vercel AI SDK, etc.)

---

## Async Add Pattern

V3 `add()` is always async. The response returns an `event_id`, not memories directly.

```ts
const { event_id } = await client.add(messages, { user_id: "alice" });

// Poll until SUCCEEDED
async function waitForMemory(eventId: string) {
  while (true) {
    const res = await fetch(`https://api.mem0.ai/v1/event/${eventId}/`, {
      headers: { Authorization: `Token ${process.env.MEM0_API_KEY}` }
    });
    const { status } = await res.json();
    if (status === "SUCCEEDED") return;
    if (status === "FAILED") throw new Error("Memory add failed");
    await new Promise(r => setTimeout(r, 500));
  }
}
```

---

## Webhooks

Events: `memory_add`, `memory_update`, `memory_delete`, `memory_categorize`

```python
# Python SDK
webhook = client.create_webhook(
    url="https://your-app.com/webhook",
    name="Memory Logger",
    project_id="proj_123",
    event_types=["memory_add", "memory_categorize"]
)
```

Payload shape:
```json
{
  "event_details": {
    "id": "<memory_id>",
    "data": { "memory": "Name is Alex" },
    "event": "ADD"
  }
}
```

---

## OSS Self-Hosted

Use `from mem0 import Memory` instead of `MemoryClient`. Requires configuring providers:

```python
from mem0 import Memory

config = {
    "vector_store": { "provider": "qdrant", "config": { "host": "localhost", "port": 6333 } },
    "llm":          { "provider": "openai", "config": { "model": "gpt-4.1-mini" } },
    "embedder":     { "provider": "openai", "config": { "model": "text-embedding-3-small" } },
    "reranker":     { "provider": "cohere", "config": { "model": "rerank-english-v3.0" } },
}

memory = Memory.from_config(config)
memory.add("I love hiking", user_id="alice")
memory.search("hobbies", user_id="alice")
```

Supported vector stores: Qdrant, Chroma, PGVector, Pinecone, MongoDB, Redis, Supabase, Neon,
Weaviate, FAISS, Elasticsearch, Milvus, Cloudflare Vectorize, S3 Vectors, and more.

→ Full provider reference: `references/oss-configuration.md`

---

## Version Gotchas

| Issue | Fix |
|-------|-----|
| V3 search rejects top-level entity IDs | Move `user_id` etc. into `filters: {}` |
| `add()` returns no memories, just `event_id` | It's async — poll `/v1/event/{id}/` |
| OSS `Memory` vs Platform `MemoryClient` confused | Different classes, different config needs |
| AND across `user_id` + `agent_id` returns nothing | Platform stores them as separate records; use OR |
| Python `mem0ai` v2.x vs TS `mem0ai` v3.x | Different major versions, both current |

---

## Reference Files

- `references/api-endpoints.md` — Complete REST endpoint schemas, all request/response fields
- `references/mcp-and-integrations.md` — MCP setup, LangChain, Vercel AI SDK, LlamaIndex, etc.
- `references/oss-configuration.md` — All OSS provider configs (LLM, embedder, vector store, reranker)
