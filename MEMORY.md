# Memory decisions log

## 2026-06-24 - V1.0.0 Modernization Refactoring

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
