# Project Roadmap

## Phase 1: Core V3 Modernization (Done)
- [x] Refactor monolith into modular backend adapter pattern (`src/backends/`).
- [x] Bump `mem0ai` dependency to `^3.0.10` for Platform V3 compatibility.
- [x] Implement async event polling for memory additions (wait/poll with timeout).
- [x] Map top-level entity scope queries into nested `filters` in V3 search and list.
- [x] Expose `list_memories`, `get_memory`, `update_memory`, `get_memory_history`, and `get_memory_capabilities`.

## Phase 2: Advanced Memory Operations (Done)
- [x] Add `batch_update_memories` and `batch_delete_memories` tools (requiring an explicit `confirm: true` option).
- [x] Add `rate_memory` to submit user feedback (positive/negative/very_negative) on memory records.
- [x] Add `get_memory_event` and `list_memory_events` to manually inspect async queue tasks.
- [x] Implement `create_memory_export` and `get_memory_export` for exporting scoped memory bases.

## Phase 3: Developer & Admin Features
- [ ] Expose cloud project settings (e.g. enabling memory decay config).
- [ ] Implement SSE (Server-Sent Events) HTTP transport option for remote connections.
- [ ] Expose webhooks administration tools (`create_webhook`, `list_webhooks`, etc.).
