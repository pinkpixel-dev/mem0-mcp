# Memory decisions log

## 2026-06-24 - V0.8.0 Advanced Memory Operations

### What was decided
Added 7 new advanced memory tools: `batch_update_memories`, `batch_delete_memories` (with `confirm` option), `rate_memory`, `get_memory_event`, `list_memory_events`, `create_memory_export`, and `get_memory_export`.

### Why
1. Broadens functional coverage to mirror all major Platform V3 capabilities.
2. Supports batch management, saving user API requests and reducing developer friction.
3. Incorporates a safety gate on batch delete (`confirm: true` must be supplied) to prevent disastrous data loss scenarios.
4. Leverages fallback loops for batch delete on self-hosted and local backends where native batch endpoints do not exist.

### What was rejected and why
1. **Mocking/Stubbing local batch deletes entirely:** Rejected because bulk deletes are highly useful even when running self-hosted Supabase or local testing modes. Simulating bulk deletions via sequential iterative deletes is a robust fallback.
2. **Batch update support for local/Supabase backends:** Rejected because standard OSS SDKs do not support memory editing or direct updates by query, so there is no reliable way to run this locally without extensive custom vector store rewrites.

## 2026-06-24 - V0.7.0 Modernization Refactoring

### What was decided
Refactored the codebase from a monolithic `src/index.ts` to a modular multi-file provider-adapter architecture under `src/backends/`. Upgraded to `mem0ai@3.0.10` and `@modelcontextprotocol/sdk@1.29.0`.

### Why
1. Aligns with Pink Pixel design preferences ("Prefer organized multi-file project structure over giant single files").
2. Decouples the MCP layer from underlying SDK implementation details.
3. Allows custom capability reporting (`get_memory_capabilities`) to prevent client models from calling unsupported backend tools.
4. Isolates V3 async event polling and filter normalization logic in the Cloud adapter.

### What was rejected and why
1. **Monolithic Single-File Modernization (Approach 2):** Rejected because combining 9 modernized tools and 3 distinct storage modes (Cloud V3, Supabase, Local in-memory) inside a single file would exceed 1,200 lines and lead to complex conditional spaghetti.
2. **Minimal V3 Shim (Approach 3):** Rejected because V3 cloud extraction is ADD-only (no auto-merging). Memories duplicate and accumulate unless managed, making list/get/update/history tools essential.
