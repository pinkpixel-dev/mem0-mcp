# Mem0 MCP & Framework Integrations

## MCP Server

Mem0 has a cloud-hosted MCP server at `https://mcp.mem0.ai/mcp`.  
Requires a Mem0 Platform API key passed via OAuth on first connect.

### One-command setup (all clients)

```bash
npx mcp-add \
  --name mem0-mcp \
  --type http \
  --url "https://mcp.mem0.ai/mcp" \
  --clients "claude,claude code,cursor,windsurf,vscode,opencode"
```

### Manual config (claude_desktop_config.json / Cursor settings)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "type": "http",
      "url": "https://mcp.mem0.ai/mcp"
    }
  }
}
```

### Codex (config.toml — different format)

```toml
[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
bearer_token_env_var = "MEM0_API_KEY"
```

### MCP Tools Exposed

| Tool                  | Description |
|-----------------------|-------------|
| `add_memory`          | Save text or conversation for a user/agent |
| `search_memories`     | Semantic search with filters |
| `get_memories`        | List memories with pagination |
| `get_memory`          | Single memory by ID |
| `update_memory`       | Overwrite memory text |
| `delete_memory`       | Delete by ID |
| `delete_all_memories` | Bulk delete by scope |
| `delete_entities`     | Delete entity + all its memories |
| `list_entities`       | Enumerate users/agents/apps/runs |
| `list_events`         | List async operation events |
| `get_event_status`    | Check status of an async event |

---

## TypeScript / JavaScript Integrations

### Vercel AI SDK

```ts
import { createMem0 } from "@mem0/vercel-ai-provider";
import { generateText } from "ai";

const mem0 = createMem0({ apiKey: process.env.MEM0_API_KEY! });

// Model with built-in memory
const { text } = await generateText({
  model: mem0("gpt-4.1-mini", { user_id: "alice" }),
  prompt: "What restaurants do I like?",
});
```

### Mastra Agent (TypeScript)

```ts
import { Agent } from "@mastra/core";
import { Mem0Memory } from "@mastra/mem0";

const memory = new Mem0Memory({ apiKey: process.env.MEM0_API_KEY! });

const agent = new Agent({
  name: "my-agent",
  model: openai("gpt-4.1-mini"),
  memory,
});
```

---

## Python Integrations

### LangChain

```python
from langchain_community.memory import Mem0Memory
from langchain_openai import ChatOpenAI
from langchain.chains import ConversationChain

llm = ChatOpenAI()
memory = Mem0Memory(user_id="alice", api_key="your-api-key")
chain = ConversationChain(llm=llm, memory=memory)

response = chain.invoke({"input": "What do you know about my preferences?"})
```

### LangChain Tool

```python
from mem0.tools.langchain import Mem0Tool

tool = Mem0Tool(user_id="alice", api_key="your-api-key")
# Use in any LangChain agent
```

### LangGraph

```python
from mem0 import MemoryClient
from langgraph.graph import StateGraph

client = MemoryClient(api_key="your-api-key")

def retrieve_memories(state):
    memories = client.search(
        state["query"],
        filters={"user_id": state["user_id"]}
    )
    return {"context": memories["results"]}

def store_memories(state):
    client.add(state["messages"], user_id=state["user_id"])
    return state
```

### LlamaIndex

```python
from llama_index.memory.mem0 import Mem0Memory

memory = Mem0Memory(
    api_key="your-api-key",
    user_id="alice",
    search_msg_limit=4
)

# Attach to a chat engine
chat_engine = index.as_chat_engine(memory=memory)
```

### CrewAI

```python
from crewai import Agent, Task, Crew
from mem0 import MemoryClient

client = MemoryClient(api_key="your-api-key")

class MemoryTool:
    def search(self, query: str, user_id: str) -> str:
        results = client.search(query, filters={"user_id": user_id})
        return "\n".join(m["memory"] for m in results["results"])

agent = Agent(
    role="Assistant",
    tools=[MemoryTool().search],
    verbose=True
)
```

### AutoGen

```python
import autogen
from mem0 import MemoryClient

client = MemoryClient(api_key="your-api-key")

def search_mem0(query: str, user_id: str) -> list:
    return client.search(query, filters={"user_id": user_id})["results"]

# Register as AutoGen function
```

### OpenAI Agents SDK

```python
from agents import Agent, function_tool
from mem0 import MemoryClient

client = MemoryClient(api_key="your-api-key")

@function_tool
def search_memories(query: str, user_id: str) -> str:
    results = client.search(query, filters={"user_id": user_id})
    return "\n".join(r["memory"] for r in results["results"])

@function_tool
def add_memory(content: str, user_id: str) -> str:
    client.add([{"role": "user", "content": content}], user_id=user_id)
    return "Memory stored"

agent = Agent(
    name="MemoryAgent",
    tools=[search_memories, add_memory]
)
```

### Google AI ADK

```python
from google.adk.agents import Agent
from mem0 import MemoryClient

client = MemoryClient(api_key="your-api-key")

def search_memories(query: str, user_id: str) -> dict:
    return client.search(query, filters={"user_id": user_id})

agent = Agent(
    model="gemini-2.0-flash",
    name="memory_agent",
    tools=[search_memories]
)
```

---

## Async Client (Platform)

For high-concurrency apps:

```python
from mem0 import AsyncMemoryClient
import asyncio

async def main():
    client = AsyncMemoryClient(api_key="your-api-key")

    await client.add(
        [{"role": "user", "content": "I love hiking"}],
        user_id="alice"
    )
    results = await client.search(
        "hobbies",
        filters={"user_id": "alice"}
    )
    print(results)

asyncio.run(main())
```

TypeScript is always async (all methods return Promises).

---

## Common Agent Loop Pattern

```ts
import MemoryClient from "mem0ai";
import Anthropic from "@anthropic-ai/sdk";

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });
const anthropic = new Anthropic();

async function chat(userId: string, userMessage: string) {
  // 1. Retrieve relevant memories
  const { results } = await mem0.search(userMessage, {
    filters: { user_id: userId },
    top_k: 5,
  });

  const memoryContext = results
    .map((m) => m.memory)
    .join("\n");

  // 2. Call LLM with memory context
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You have access to the user's memory:\n${memoryContext}`,
    messages: [{ role: "user", content: userMessage }],
  });

  const assistantText = response.content[0].type === "text"
    ? response.content[0].text
    : "";

  // 3. Store the exchange as new memory
  await mem0.add(
    [
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantText },
    ],
    { user_id: userId }
  );

  return assistantText;
}
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 400 on V3 search | `user_id` at top-level | Move into `filters: { user_id: "..." }` |
| 401 | Bad/missing API key | Check `Authorization: Token <key>` header |
| Empty search results | Entity ID mismatch on write vs search | Print filters before each call |
| `add()` seems to do nothing | It's async | Poll `/v1/event/{event_id}/` |
| AND across user+agent returns nothing | Platform stores per-entity | Use OR, or query one entity scope at a time |
| MCP connection failed | API key not set | Get key from app.mem0.ai/dashboard/api-keys |
