# Mem0 REST API — Full Endpoint Reference

Base URL: `https://api.mem0.ai`  
Auth: `Authorization: Token <MEM0_API_KEY>` on every request  
Content-Type: `application/json`

---

## Memory Endpoints

### POST /v3/memories/add/

Extract and store memories from conversation messages. Uses single-pass ADD-only extraction (V3 additive pipeline — no UPDATE/DELETE during add).

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "I moved to Austin last month." },
    { "role": "assistant", "content": "Got it, I'll remember that." }
  ],
  "user_id": "alice",
  "agent_id": null,
  "run_id": null,
  "app_id": null,
  "metadata": { "source": "onboarding_form" },
  "infer": true,
  "custom_instructions": "Focus on location and preferences."
}
```

| Field                | Type    | Required | Description |
|----------------------|---------|----------|-------------|
| `messages`           | array   | ✅       | `[{role, content}]`. roles: user/assistant/system |
| `user_id`            | string  | ⚠️*      | Scope to user |
| `agent_id`           | string  | ⚠️*      | Scope to agent |
| `run_id`             | string  | ⚠️*      | Scope to session/run |
| `app_id`             | string  | ⚠️*      | Scope to app |
| `metadata`           | object  | No       | Custom key/value attached to each extracted memory |
| `infer`              | boolean | No       | Default true. Set false to store verbatim (no LLM extraction) |
| `custom_instructions`| string  | No       | Per-call extraction guidance |

*At least one entity ID required.

**Response 200:**
```json
{
  "message": "Memory processing has been queued for background execution",
  "status": "PENDING",
  "event_id": "2c4d1f44-4f7b-4b2f-9f6e-7b5b4f5a1234"
}
```

Processing is **async**. Poll `/v1/event/{event_id}/` for `SUCCEEDED` or `FAILED`.

---

### POST /v3/memories/search/

Hybrid search (semantic + BM25 + entity matching). V3 requires entity IDs inside `filters`.

**Request body:**

```json
{
  "query": "Where does Alice live?",
  "filters": {
    "user_id": "alice"
  },
  "top_k": 10,
  "threshold": 0.1,
  "rerank": false,
  "reference_date": "2025-06-01"
}
```

| Field            | Type    | Required | Description |
|------------------|---------|----------|-------------|
| `query`          | string  | ✅       | Natural-language search query |
| `filters`        | object  | ✅       | Must include at least one entity ID. Supports AND/OR/NOT + operators |
| `top_k`          | integer | No       | 1–1000, default 10 |
| `threshold`      | number  | No       | 0–1, default 0.1. Pass 0.0 to disable filtering |
| `rerank`         | boolean | No       | Default false. Enable for better result ordering (adds latency) |
| `reference_date` | string  | No       | Anchor for temporal queries. Unix epoch, YYYY-MM-DD, or ISO |

**Response 200:**
```json
{
  "results": [
    {
      "id": "ea925981-272f-40dd-b576-be64e4871429",
      "memory": "Moved to Austin in May 2025",
      "user_id": "alice",
      "metadata": { "source": "onboarding_form" },
      "score": 0.82,
      "categories": ["location"],
      "created_at": "2025-05-15T10:29:36Z",
      "updated_at": null
    }
  ]
}
```

**Filter operators:**

| Operator    | Example |
|-------------|---------|
| `in`        | `{ "categories": { "in": ["hobbies", "travel"] } }` |
| `gte`       | `{ "created_at": { "gte": "2025-01-01" } }` |
| `lte`       | `{ "created_at": { "lte": "2025-12-31" } }` |
| `gt`        | `{ "score": { "gt": 0.5 } }` |
| `lt`        | `{ "score": { "lt": 0.9 } }` |
| `ne`        | `{ "user_id": { "ne": "bob" } }` |
| `icontains` | `{ "memory": { "icontains": "hiking" } }` |
| `contains`  | `{ "categories": { "contains": "finance" } }` |
| `*`         | `{ "run_id": "*" }` — wildcard: any non-null value |

**Logical composition:**
```json
{
  "AND": [
    { "user_id": "alice" },
    { "categories": { "in": ["hobbies"] } },
    { "created_at": { "gte": "2025-01-01" } }
  ]
}
```

```json
{
  "OR": [
    { "user_id": "alice" },
    { "agent_id": { "in": ["bot-a", "bot-b"] } }
  ]
}
```

---

### GET /v1/memories/

List/paginate all memories for a scope.

Query params: `user_id`, `agent_id`, `app_id`, `run_id`, `page`, `page_size`

**Response 200:**
```json
{
  "count": 42,
  "next": "https://api.mem0.ai/v1/memories/?page=2",
  "previous": null,
  "results": [ { "id": "...", "memory": "...", ... } ]
}
```

---

### GET /v1/memories/{memory_id}/

Get a single memory by ID.

**Response 200:**
```json
{
  "id": "ea925981-272f-40dd-b576-be64e4871429",
  "memory": "Moved to Austin in May 2025",
  "user_id": "alice",
  "metadata": {},
  "categories": ["location"],
  "created_at": "2025-05-15T10:29:36Z",
  "updated_at": null
}
```

---

### PATCH /v1/memories/{memory_id}/

Update a memory's text.

**Request body:**
```json
{ "text": "Alice lives in Austin, TX (moved May 2025)" }
```

---

### DELETE /v1/memories/{memory_id}/

Delete a single memory.

---

### DELETE /v1/memories/

Delete all memories matching a scope.

Query params: `user_id`, `agent_id`, `app_id`, `run_id`

---

### GET /v1/memories/{memory_id}/history/

Full change log for a memory — every version ever stored.

---

### POST /v1/memories/{memory_id}/feedback/

Submit quality signal for a memory.

**Request body:**
```json
{ "feedback": "positive" }
```
Values: `"positive"`, `"negative"`

---

### POST /v1/memories/batch/

Update many memories in one call.

**Request body:**
```json
{
  "memories": [
    { "id": "mem-uuid-1", "text": "Updated text 1" },
    { "id": "mem-uuid-2", "text": "Updated text 2" }
  ]
}
```

---

### POST /v1/memories/batch-delete/

Delete many memories in one call.

**Request body:**
```json
{
  "memory_ids": ["mem-uuid-1", "mem-uuid-2"]
}
```

---

### POST /v1/memories/export/

Kick off an async memory export job.

**Request body:**
```json
{
  "user_id": "alice",
  "format": "json"
}
```

**Response:**
```json
{ "export_id": "exp-uuid" }
```

### GET /v1/memories/export/{export_id}/

Fetch result of an export job.

---

## Event Endpoints

### GET /v1/event/{event_id}/

Poll status of an async memory operation.

**Response:**
```json
{
  "id": "evt-uuid",
  "status": "SUCCEEDED",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:00:01Z"
}
```

Status values: `PENDING`, `SUCCEEDED`, `FAILED`

### GET /v1/events/

List events with filters.

Query params: `status`, `page`, `page_size`

---

## Entity Endpoints

### GET /v1/entities/

List users/agents/apps known to the project.

Query params: `entity_type` (`user`, `agent`, `app`), `page`, `page_size`

**Response:**
```json
{
  "results": [
    { "entity_type": "user", "entity_id": "alice", "num_memories": 12 }
  ]
}
```

### DELETE /v1/entities/{entity_type}/{entity_id}/

Delete an entity and ALL its memories.

`entity_type`: `user`, `agent`, `app`, `run`

---

## Webhook Endpoints

### POST /v1/webhooks/

Create a project-scoped webhook.

**Request body:**
```json
{
  "url": "https://your-app.com/webhook",
  "name": "Memory Logger",
  "project_id": "proj_123",
  "event_types": ["memory_add", "memory_update", "memory_delete", "memory_categorize"]
}
```

**Response:**
```json
{
  "id": "wh_123",
  "url": "https://your-app.com/webhook",
  "name": "Memory Logger",
  "event_types": ["memory_add"],
  "created_at": "2025-06-01T10:00:00Z"
}
```

### GET /v1/webhooks/{webhook_id}/

Get webhook config.

### PATCH /v1/webhooks/{webhook_id}/

Update webhook settings.

**Request body:** Same fields as create (partial update allowed).

### DELETE /v1/webhooks/{webhook_id}/

Remove a webhook.

---

## Webhook Payload Shapes

**memory_add / memory_update / memory_delete:**
```json
{
  "event_details": {
    "id": "mem-uuid",
    "data": { "memory": "Name is Alex" },
    "event": "ADD"
  }
}
```

**memory_categorize:**
```json
{
  "event_details": {
    "event": "CATEGORIZE",
    "memory_id": "mem-uuid",
    "categories": ["hobbies", "travel"]
  }
}
```

---

## Organization & Project Endpoints

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/v1/organizations/` | Create org |
| GET    | `/v1/organizations/` | List orgs |
| GET    | `/v1/organizations/{id}/` | Get org |
| GET    | `/v1/organizations/{id}/members/` | List members |
| POST   | `/v1/organizations/{id}/members/` | Invite member |
| DELETE | `/v1/organizations/{id}/` | Delete org |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/v1/projects/` | Create project |
| GET    | `/v1/projects/` | List projects |
| GET    | `/v1/projects/{id}/` | Get project |
| GET    | `/v1/projects/{id}/members/` | List members |
| POST   | `/v1/projects/{id}/members/` | Invite member |
| DELETE | `/v1/projects/{id}/` | Delete project |

OpenAPI spec: https://docs.mem0.ai/openapi.json
