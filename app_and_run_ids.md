## Passing `app_id` and `run_id` in Mem0 Memory Save Requests

In Mem0’s API, **`app_id`** and **`run_id`** are optional context fields (like `user_id` or `agent_id`) that you can include when saving a memory. They should be provided as separate top-level fields in the memory creation request – not buried inside the `metadata`. For example, using the Python or Node SDK, you would pass them as parameters to the `add` method. The Mem0 docs show a Python call like:

```python
client.add(messages, user_id="alex", run_id="trip-planning-2024")
```

which includes a `run_id` alongside a `user_id`. In the Node.js SDK, the `MemoryClient.add` (or `client.add`) accepts an options object with these fields. For instance, you can do:

```js
const memoryOptions = { user_id: "alex", app_id: "myApp123", run_id: "session42" };
client.add(messages, memoryOptions);
```

This is analogous to the documented usage (here shown with user and agent IDs) where you pass an object containing `user_id`, `agent_id`, etc., as the second argument. If you’re calling the REST API directly (e.g. via HTTP request), include `app_id` and `run_id` as JSON fields in the request body (along with the `messages` array and any `user_id/agent_id`). In short, **provide `app_id` and `run_id` as top-level JSON fields or SDK parameters in the memory save request** – just like you would with `user_id` or `agent_id`.

## Requirements and Limitations (Visibility in Dashboard)

Importantly, Mem0 **requires at least one context identifier** when adding a memory. The server will reject a memory save request if you don’t supply any of `user_id`, `agent_id`, `app_id`, or `run_id`. This is explicitly enforced: *“At least one of the filters: agent\_id, user\_id, app\_id, run\_id is required!”*. In practice, that means you must include **one or more** of these IDs in each `add` request – otherwise you’ll get a 400 Bad Request error. There’s no inherent restriction on using them together (you can provide multiple IDs simultaneously; e.g. tagging a memory with both a user and an app context). In fact, you can combine identifiers as needed – for example, tagging a memory with both `user_id` and `agent_id` for dual long-term memory, or with `user_id` and `run_id` to mark a specific user session. The Mem0 platform documentation notes that these fields serve different scopes: `user_id` is a unique user profile, `agent_id` an AI agent identity, `run_id` a specific conversation session, and `app_id` an application context.

One point of confusion can be the **Mem0 web dashboard**: currently the dashboard UI primarily organizes memories by user or agent profiles, and it may **not explicitly display the `app_id` or `run_id` labels in the main list** of memories. This doesn’t mean those fields are not stored – they are saved on the backend (and are queryable/filterable) but the UI might not show them as separate columns. For example, a user on the Mem0 forum noted their set `user_id` wasn’t immediately visible in the dashboard, which instead showed an agent name (the UI was reflecting the agent context). In general, the Mem0 dashboard’s default views focus on user/agent memory groupings; `app_id` and `run_id` might only surface if you use the search or filtering tools. You *can* filter or search memories by these fields using the advanced search API or the dashboard’s filter interface – the docs confirm that you can filter queries by `app_id` or `run_id` just like by user or agent ID. So, while **`app_id` and `run_id` are saved with each memory**, you may not see them labeled in the UI unless you look at a memory’s details or use filters. They are intended mostly for developers to organize and retrieve memories via the API (for example, exporting or searching memories by `app_id` or `run_id`), rather than as prominent identifiers shown on the dashboard.

## Node SDK vs REST API (v1 vs v2) Handling

Both the official SDKs and the raw HTTP API ultimately handle `app_id` and `run_id` in the **same way – as optional fields in the memory object’s data**. The Node.js SDK is essentially a wrapper that sends the appropriate JSON payload to Mem0’s endpoints, so if you provide `app_id`/`run_id` in the SDK call, they will be included in the API request. There should not be any discrepancy in whether the fields get saved; using the Node SDK versus calling the REST API directly should yield the same result (assuming the SDK is up-to-date). That said, ensure you’re using a recent version of the SDK – earlier versions of Mem0’s client libraries had some issues where certain parameters weren’t forwarded. (The Mem0 team noted in a changelog update that they “added missing parameters” in an update to their SDK and fixed some metadata duplication bugs, so upgrading is wise if you ran into odd behavior.) In normal operation, though, there’s **no special difference in how the platform treats these fields** coming from SDK vs direct API – they end up stored the same way.

One difference to be aware of is **Mem0’s API versioning for the add operation**. Mem0 introduced an improved “contextual add” under **v2**, which changes how memories are processed but not the basic inclusion of `app_id`/`run_id`. By default the SDK’s `client.add` used the older v1 mode unless you specify otherwise. Mem0’s documentation advises using `version="v2"` for adds, as *“the default version is v1, which is deprecated now.”* In practice, if you’re using the SDK, you can pass `version="v2"` in the `add()` call (as shown in their examples). This ensures the memory is saved using the latest algorithm for context extraction. If you call the REST API directly, you might not see a separate `/v2/memories` endpoint for adding – instead, the v1 endpoint is used with the newer processing on the backend when you specify the new version (the Mem0 client likely handles this under the hood). The key point is that this **does not change how you pass `app_id` or `run_id`** – you include them just the same. The version mainly affects how the content of `messages` is interpreted and how the memory is extracted/stored internally (e.g. managing conversation context automatically in v2). So whether you use v1 or v2, or SDK vs HTTP, you should still pass `app_id` and `run_id` as described above. Just remember to use v2 mode going forward for better results (and to avoid deprecation issues).

## Storage as Metadata vs Top-Level Fields

Mem0 stores `app_id` and `run_id` as **first-class fields on each memory record**, not inside the free-form `metadata`. In JSON responses from the API, you can see they appear alongside `user_id` and `agent_id`. For example, a fetched memory object might look like:

```json
{
  "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
  "memory": "...",
  "user_id": "alice",
  "agent_id": "support-bot",
  "app_id": "myApp123",
  "run_id": "session-42",
  "hash": "<string>",
  "metadata": {...},
  "created_at": "2023-11-07T05:31:56Z",
  "updated_at": "2023-11-07T05:31:56Z"
}
```

Here `app_id` and `run_id` are their own fields in the JSON structure. The `metadata` field is a separate object meant for any custom key–value data you want to attach. (For instance, you might use `metadata` to store extra info like categories or attributes that don’t fit into the predefined fields.) But you **do not need to shove** the application or run identifiers into `metadata` – Mem0 has dedicated fields for those. In other words, treat `app_id` and `run_id` like standard properties of the memory, just as you would `user_id`. This also means if you set these fields when adding a memory, you can later filter or retrieve based on them directly (e.g. get all memories with a certain `app_id`). They are not hidden; they’re part of the memory’s record. The only caveat, as mentioned, is that the **dashboard UI might not list them prominently**, but they *are* stored in the backend and will appear in API outputs and be usable in queries.

## Examples and Documentation References

* **Official SDK Usage:** Mem0’s guide shows how to include these IDs in `add()` calls. For example, adding a memory with a run identifier: `client.add(messages, user_id="alex", run_id="trip-planning-2024")`. In Node/TypeScript, pass an object with the desired fields (e.g. `user_id`, `agent_id`, `app_id`, `run_id`) to the `add` function.
* **REST API Request:** When calling the HTTP API (e.g. `POST /v1/memories`), include at least one of `user_id | agent_id | app_id | run_id` in the JSON body along with the conversation `messages`. For instance, a JSON payload might contain `"user_id": "alex", "app_id": "myApp123", "messages": [ ... ]`. The Mem0 API will accept and store those fields, and you can verify they were saved by fetching the memory back – the returned memory object will show the same `app_id`/`run_id` you sent.
* **Behavior and Filtering:** According to Mem0 docs, you can use these identifiers later to retrieve or filter memories. They’re considered standard filter fields in the v2 search and export APIs (available filter fields include `user_id, agent_id, app_id, run_id, created_at`, etc.). This confirms that the platform expects `app_id`/`run_id` to be part of the memory’s data (not just buried in metadata).
* **Contextual Notes:** Typically, you’d use `run_id` to group memories from a single session or conversation (short-term context), and use `app_id` to distinguish memories originating from different applications or sub-systems using the same Mem0 service. These fields are optional – use them if they make sense for your memory organization. If you don’t need an app-specific grouping, you can ignore `app_id`; if you’re not distinguishing sessions, you can skip `run_id`. Just ensure **at least one** context (user, agent, app, or run) is always included, or the Mem0 service will reject the save request.

In summary, **pass `app_id` and `run_id` as normal fields when adding memories** (via SDK or API), and they will be stored as top-level attributes of the memory. The Node.js SDK and REST calls handle them equivalently – the main difference is remembering to specify `version="v2"` in the SDK for the new add behavior. Once saved, those IDs won’t necessarily show up on the dashboard UI by default, but they are preserved in Mem0’s database (not in the metadata blob) and can be used to filter or fetch memories as needed.

**Sources:** Official Mem0 documentation and API references, including usage guides and community Q\&A. The Mem0 docs on **adding memories** and **memory fields** show `app_id` and `run_id` as part of the memory schema, and the Mem0 developer forum confirms that one of these identifiers (or a user/agent ID) must be provided for each memory save. For further examples, see the Mem0 quickstart guide (which uses `run_id` in an `add` call) and the integration notes (which define `run_id` as a session ID and `app_id` as an application identifier).
