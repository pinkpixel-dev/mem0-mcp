![Mem0 MCP Logo](mem0-mcp-logo.png)

[![npm version](https://badge.fury.io/js/@pinkpixel%2Fmem0-mcp.svg)](https://badge.fury.io/js/@pinkpixel%2Fmem0-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-0.6.0-purple.svg)](https://modelcontextprotocol.io/)
[![Mem0](https://img.shields.io/badge/Mem0-2.1%2B-orange.svg)](https://mem0.ai)
[![Downloads](https://img.shields.io/npm/dm/@pinkpixel/mem0-mcp.svg)](https://www.npmjs.com/package/@pinkpixel/mem0-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/pinkpixel-dev/mem0-mcp.svg)](https://github.com/pinkpixel-dev/mem0-mcp)
[![smithery badge](https://smithery.ai/badge/@pinkpixel-dev/mem0-mcp-server)](https://smithery.ai/server/@pinkpixel-dev/mem0-mcp-server)

# @pinkpixel/mem0-mcp MCP Server ✨

A Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for LLMs. It allows AI agents to store and retrieve information across sessions.

This server uses the `mem0ai` Node.js SDK for its core functionality.

## Features 🧠

### Modernized Tools (v0.7.0)
*   **`add_memory`**: Stores a memory from text content or structured message arrays.
    *   **Inputs:** `content` (string) or `messages` (array of role/content objects), `userId` (string), `runId` / `sessionId` (string), `agentId` (string), `appId` (string), `metadata` (object), `infer` (boolean), `customInstructions` (string), `waitForCompletion` (boolean, default: true), `timeoutMs` (number, default: 15000)
    *   **Behavior:** Cloud V3 additions are asynchronous. By default, this tool polls the background queue until completed. Pass `waitForCompletion: false` to get the `eventId` immediately.
*   **`search_memories`**: Searches memories using semantic and BM25 hybrid filters.
    *   **Inputs:** `query` (string), `userId` (string), `runId` / `sessionId` (string), `agentId` (string), `appId` (string), `filters` (object), `threshold` (number), `topK` (number), `rerank` (boolean), `referenceDate` (string)
    *   **Behavior:** Automatically nests scope variables inside the V3 `filters` block to prevent API validation errors.
*   **`search_memory`**: Backward-compatible alias for `search_memories`.
*   **`list_memories`**: Paginated listing of memory records scoped by identifiers.
    *   **Inputs:** `userId` (string), `runId` / `sessionId` (string), `agentId` (string), `appId` (string), `filters` (object), `page` (number), `pageSize` (number)
*   **`get_memory`**: Retrieves a single memory record by its ID.
    *   **Inputs:** `memoryId` (string)
*   **`update_memory`**: Modifies the text or metadata of an existing memory.
    *   **Inputs:** `memoryId` (string), `text` (string), `metadata` (object)
*   **`delete_memory`**: Deletes a specific memory record by ID.
    *   **Inputs:** `memoryId` (string)
*   **`get_memory_history`**: Retrieves the audit trail of memory revisions (cloud only).
    *   **Inputs:** `memoryId` (string)
*   **`get_memory_capabilities`**: Exposes the feature matrix and support flags of the active backend storage mode.
    *   **Inputs:** None

## Prerequisites 🔑

This server supports three storage modes:

1. **Cloud Storage Mode** ☁️ (Recommended for production)
   * Requires a **Mem0 API key** (provided as `MEM0_API_KEY` environment variable)
   * Memories are persistently stored on Mem0's cloud servers
   * No local database needed
   * Full feature support with advanced filtering and search

2. **Supabase Storage Mode** 🗄️ (Recommended for self-hosting)
   * Requires **Supabase credentials** (`SUPABASE_URL` and `SUPABASE_KEY` environment variables)
   * Requires **OpenAI API key** (`OPENAI_API_KEY` environment variable) for embeddings
   * Memories are persistently stored in your Supabase database
   * Free tier available, self-hostable option
   * Requires initial database setup (SQL migrations provided below)

3. **Local Storage Mode** 💾 (Development/testing only)
   * Requires an **OpenAI API key** (provided as `OPENAI_API_KEY` environment variable)
   * Memories are stored in an in-memory vector database (non-persistent by default)
   * Data is lost when the server restarts unless configured for persistent storage

## Installation & Configuration ⚙️

You can run this server in three main ways:

### Installing via Smithery

To install Mem0 Memory Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@pinkpixel-dev/mem0-mcp-server):

```bash
npx -y @smithery/cli install @pinkpixel-dev/mem0-mcp-server --client claude
```

### 1. Global Installation (Recommended for frequent use)

Install the package globally and use the `mem0-mcp` command:

```bash
npm install -g @pinkpixel/mem0-mcp
```

After global installation, you can run the server directly:

```bash
mem0-mcp
```

Configure your MCP client to use the global command:

#### Cloud Storage Configuration (Global Install)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "mem0-mcp",
      "args": [],
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Supabase Storage Configuration (Global Install)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "mem0-mcp",
      "args": [],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_PROJECT_URL",
        "SUPABASE_KEY": "YOUR_SUPABASE_ANON_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Local Storage Configuration (Global Install)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "mem0-mcp",
      "args": [],
      "env": {
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123"
      }
    }
  }
}
```

### 2. Using `npx` (Recommended for occasional use)

Configure your MCP client (e.g., Claude Desktop, Cursor, Cline, Roo Code, etc.) to run the server using `npx`:

#### Cloud Storage Configuration (npx)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/mem0-mcp"
      ],
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Supabase Storage Configuration (npx)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/mem0-mcp"
      ],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_PROJECT_URL",
        "SUPABASE_KEY": "YOUR_SUPABASE_ANON_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Local Storage Configuration (npx)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/mem0-mcp"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123"
      }
    }
  }
}
```

### 3. Running from Cloned Repository

**Note: This method requires you to git clone the repository first.**

Clone the repository, install dependencies, and build the server:

```bash
git clone https://github.com/pinkpixel-dev/mem0-mcp
cd mem0-mcp
npm install
npm run build
```

Then, configure your MCP client to run the built script directly using `node`:

#### Cloud Storage Configuration (Cloned Repository)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/mem0-mcp/build/index.js"
      ],
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Supabase Storage Configuration (Cloned Repository)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/mem0-mcp/build/index.js"
      ],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_PROJECT_URL",
        "SUPABASE_KEY": "YOUR_SUPABASE_ANON_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "DEFAULT_AGENT_ID": "your-agent-id",
        "DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

#### Local Storage Configuration (Cloned Repository)

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/mem0-mcp/build/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123"
      },
      "disabled": false,
      "alwaysAllow": [
        "add_memory",
        "search_memory",
        "delete_memory"
      ]
    }
  }
}
```

**Important Notes:**
1. Replace `/absolute/path/to/mem0-mcp/` with the actual absolute path to your cloned repository
2. Use the `build/index.js` file, not the `src/index.ts` file
3. The MCP server requires clean stdout for protocol communication - any libraries or code that writes to stdout may interfere with the protocol

## Supabase Setup 🗄️

If you choose to use Supabase storage mode, you'll need to set up your Supabase database with the required table.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from the project settings

### 2. Run SQL Migrations

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable the vector extension
create extension if not exists vector;

-- Create the memories table
create table if not exists memories (
  id text primary key,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Create the vector similarity search function
create or replace function match_vectors(
  query_embedding vector(1536),
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    t.id::text,
    1 - (t.embedding <=> query_embedding) as similarity,
    t.metadata
  from memories t
  where case
    when filter::text = '{}'::text then true
    else t.metadata @> filter
  end
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create the memory_history table for history tracking
create table if not exists memory_history (
  id text primary key,
  memory_id text not null,
  previous_value text,
  new_value text,
  action text not null,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone,
  is_deleted integer default 0
);
```

### 3. Set Environment Variables

Add these to your MCP configuration:

- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_KEY`: Your Supabase anon key
- `OPENAI_API_KEY`: Your OpenAI API key (for embeddings)

### Benefits of Supabase Mode

✅ **Persistent Storage** - Data survives server restarts
✅ **Free Tier Available** - Generous free tier for development
✅ **Self-Hostable** - Can run your own Supabase instance
✅ **Scalable** - Grows with your needs
✅ **SQL Access** - Direct database access for advanced queries
✅ **Real-time Features** - Built-in real-time subscriptions

## Parameter Configuration 🎯

### Understanding Mem0 Parameters

The server uses four key parameters to organize and scope memories:

1. **`userId`** - Identifies the user (required)
2. **`agentId`** - Identifies the LLM/agent making the tool call (optional)
3. **`appId`** - Identifies the user's project/application - **this controls project scope!** (optional)
4. **`sessionId`** - Identifies the conversation session (maps to `run_id` in Mem0) (optional)

### Environment Variable Fallbacks 🔄

The MCP server supports environment variable fallbacks for user identification and project settings:

- `DEFAULT_USER_ID`: Fallback user ID when not provided in tool calls
- `DEFAULT_AGENT_ID`: Fallback agent ID for identifying the LLM/agent
- `DEFAULT_APP_ID`: Fallback app ID for project scoping

#### **Priority Order (Important!)**
1. **Tool Parameters** (highest priority) - Values provided by the LLM in tool calls
2. **Environment Variables** (fallback) - Values from your MCP configuration

#### **Example Behavior:**
```json
// Your MCP config
"env": {
  "DEFAULT_USER_ID": "john-doe",
  "DEFAULT_AGENT_ID": "my-assistant",
  "DEFAULT_APP_ID": "my-project"
}
```

**If LLM provides parameters:**
```json
{
  "tool": "add_memory",
  "arguments": {
    "content": "Remember this",
    "userId": "session-123",        // ← Overrides DEFAULT_USER_ID
    "agentId": "different-agent",   // ← Overrides DEFAULT_AGENT_ID
    "appId": "special-project"      // ← Overrides DEFAULT_APP_ID
    // sessionId omitted           // ← No fallback, will be undefined
  }
}
```
**Result**: Uses `session-123`, `different-agent`, and `special-project`

**If LLM omits parameters:**
```json
{
  "tool": "add_memory",
  "arguments": {
    "content": "Remember this"
    // All IDs omitted - uses environment variables
  }
}
```
**Result**: Uses `john-doe`, `my-assistant`, and `my-project`

#### **Controlling LLM Behavior**
To ensure your environment variables are used, instruct your LLM:
- *"Use the default user ID configured in the environment"*
- *"Don't specify userId, agentId, or appId parameters"*
- *"Let the server use the configured defaults"*

#### **System Prompt Recommendation**
For best results, include instructions in your system prompt like:

```
When creating memories, use:
- agentId: "my-assistant"
- appId: "my-project"
- sessionId: "current-conversation-id"
```

Example configuration using `DEFAULT_USER_ID`:

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/mem0-mcp"
      ],
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123",
        "ORG_ID": "your-org-id",
        "PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

Or when running directly with `node`:

```bash
git clone https://github.com/pinkpixel-dev/mem0-mcp
cd mem0-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "path/to/mem0-mcp/build/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123"
      }
    }
  }
}
```

## Storage Mode Comparison 🔄

### Cloud Storage (Mem0 API) ☁️
* **Persistent by default** - Your memories remain available across sessions and server restarts
* **No local database required** - All data is stored on Mem0's servers
* **Higher retrieval quality** - Uses Mem0's optimized search algorithms
* **Additional fields** - Supports `agent_id` and `threshold` parameters
* **Fully managed** - No setup or maintenance required
* **Requires** - A Mem0 API key

### Supabase Storage 🗄️
* **Persistent storage** - Data is stored in your Supabase PostgreSQL database
* **Free tier available** - Generous free tier for development and small projects
* **Self-hostable** - Can run your own Supabase instance for complete control
* **SQL access** - Direct database access for advanced queries and analytics
* **Scalable** - Grows with your needs, from free tier to enterprise
* **Vector search** - Uses pgvector extension for efficient similarity search
* **Real-time features** - Built-in real-time subscriptions and webhooks
* **Requires** - Supabase project setup and OpenAI API key for embeddings

### Local Storage (OpenAI API) 💾
* **In-memory by default** - Data is stored only in RAM and is **not persistent long-term**. While some caching may occur, you should not rely on this for permanent storage.
* **Data loss risk** - Memory data will be lost on server restart, system reboot, or if the process is terminated
* **Recommended for** - Development, testing, or temporary use only
* **For persistent storage** - Use the Cloud Storage or Supabase options if you need reliable long-term memory
* **Uses OpenAI embeddings** - For vector search functionality
* **Self-contained** - All data stays on your machine
* **Requires** - An OpenAI API key

## Development 💻

Clone the repository and install dependencies:

```bash
git clone https://github.com/pinkpixel-dev/mem0-mcp
cd mem0-mcp
npm install
```

Build the server:

```bash
npm run build
```

For development with auto-rebuild on file changes:

```bash
npm run watch
```

## Debugging 🐞

Since MCP servers communicate over stdio, debugging can be challenging. Here are some approaches:

1. **Use the MCP Inspector**: This tool can monitor the MCP protocol communication:
```bash
npm run inspector
```

2. **Console Logging**: When adding console logs, always use `console.error()` instead of `console.log()` to avoid interfering with the MCP protocol

3. **Environment Files**: Use a `.env` file for local development to simplify setting API keys and other configuration options

## Technical Implementation Notes 🔧

### 1. Platform V3 Async Additions & Polling
Mem0 Cloud V3 addition is an asynchronous background task. When calling `add_memory`, the server submits the request to `/v3/memories/add/` and receives an `eventId`. 
* **Synchronous Polling (Default):** The server polls the event status endpoint (`/v1/event/{id}/`) every 500ms for up to `timeoutMs` (default `15000`ms) until the status becomes `SUCCEEDED` or `FAILED`. Once resolved, it returns the final outcome.
* **Asynchronous Execution:** Pass `"waitForCompletion": false` to bypass polling. The server will immediately return the `eventId` and a `PENDING` status.

### 2. Nested V3 Filter Normalization
The Mem0 Cloud V3 search and list endpoints reject top-level scope IDs (`user_id`, `agent_id`, `app_id`, `run_id`) and return an HTTP 400 error. V3 requires these fields inside the nested `filters` object.
To prevent breaking client configurations, this server automatically normalizes top-level scope variables (`userId`, `agentId`, `appId`, `runId`/`sessionId`) and merges them into the nested `filters` object under the hood before sending the API request.

### 3. Capability Gating
Different backends support different feature sets. Call `get_memory_capabilities` to get a structured capability matrix of the active backend.
* **Cloud Mode:** Fully supports all features (`apiVersion: "v3"`, async events, listing, audit histories, logical queries).
* **Supabase / Local Modes:** Standard V1 vector interfaces. Unsupported cloud-specific tools (like `get_memory_history` or `list_memories`) will fail gracefully with clear feature-unavailable messages.

### 4. Logging & Protocol Stability
MCP servers communicate using JSON-RPC over `stdout`. Any unexpected library logs printed to `stdout` will corrupt the protocol channel and cause clients to crash.
This server overrides the default `console` output methods (such as `console.log`) to redirect/mute standard logging, ensuring clean stdio communication.

---

Made with 💖 by Pink Pixel
