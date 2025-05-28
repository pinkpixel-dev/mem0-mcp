![Mem0 Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1741739911/mem0-logo_dlssjm.svg)

[![npm version](https://badge.fury.io/js/@pinkpixel%2Fmem0-mcp.svg)](https://badge.fury.io/js/@pinkpixel%2Fmem0-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-0.6.0-purple.svg)](https://modelcontextprotocol.io/)
[![Mem0](https://img.shields.io/badge/Mem0-2.1%2B-orange.svg)](https://mem0.ai)
[![Downloads](https://img.shields.io/npm/dm/@pinkpixel/mem0-mcp.svg)](https://www.npmjs.com/package/@pinkpixel/mem0-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/pinkpixel-dev/mem0-mcp.svg)](https://github.com/pinkpixel-dev/mem0-mcp)

# @pinkpixel/mem0-mcp MCP Server ✨

A Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for LLMs. It allows AI agents to store and retrieve information across sessions.

This server uses the `mem0ai` Node.js SDK for its core functionality.

## Features 🧠

### Tools
*   **`add_memory`**: Stores a piece of text content as a memory associated with a specific `userId`.
    *   **Required:** `content` (string), `userId` (string)
    *   **Optional:** `sessionId` (string), `agentId` (string), `appId` (string), `metadata` (object)
    *   **Advanced (Cloud API):** `includes` (string), `excludes` (string), `infer` (boolean), `outputFormat` (string), `customCategories` (object), `customInstructions` (string), `immutable` (boolean), `expirationDate` (string)
    *   Stores the provided text, enabling recall in future interactions.
*   **`search_memory`**: Searches stored memories based on a natural language query for a specific `userId`.
    *   **Required:** `query` (string), `userId` (string)
    *   **Optional:** `sessionId` (string), `agentId` (string), `appId` (string), `filters` (object), `threshold` (number)
    *   **Advanced (Cloud API):** `topK` (number), `fields` (array), `rerank` (boolean), `keywordSearch` (boolean), `filterMemories` (boolean)
    *   Retrieves relevant memories based on semantic similarity.
*   **`delete_memory`**: Deletes a specific memory from storage by its ID.
    *   **Required:** `memoryId` (string), `userId` (string)
    *   **Optional:** `agentId` (string), `appId` (string)
    *   Permanently removes the specified memory.

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

### Advanced Mem0 API Parameters

When using the Cloud Storage mode with the Mem0 API, you can leverage additional parameters for more sophisticated memory management. While not explicitly exposed in the tool schema, these can be included in the `metadata` object when adding memories:

#### Advanced Parameters for `add_memory`:

| Parameter | Type | Description |
|-----------|------|-------------|
| `metadata` | object | Store additional context about the memory (e.g., location, time, identifiers). This can be used for filtering during retrieval. |
| `includes` | string | Specific preferences to include in the memory. |
| `excludes` | string | Specific preferences to exclude from the memory. |
| `infer` | boolean | Whether to infer memories or directly store messages (default: true). |
| `output_format` | string | Format version, either v1.0 (default, deprecated) or v1.1 (recommended). |
| `custom_categories` | object | List of categories with names and descriptions. |
| `custom_instructions` | string | Project-specific guidelines for handling and organizing memories. |
| `immutable` | boolean | Whether the memory is immutable (default: false). |
| `expiration_date` | string | When the memory will expire (format: YYYY-MM-DD). |
| `org_id` | string | Organization ID associated with this memory. |
| `project_id` | string | Project ID associated with this memory. |
| `version` | string | Memory version (v1 is deprecated, v2 recommended for new applications). |

To use these parameters with the MCP server, include them in your metadata object when calling the `add_memory` tool. For example:

```json
{
  "content": "Important information to remember",
  "userId": "user123",
  "sessionId": "project-abc",
  "metadata": {
    "includes": "important context",
    "excludes": "sensitive data",
    "immutable": true,
    "expiration_date": "2025-12-31",
    "custom_instructions": "Prioritize this memory for financial questions",
    "version": "v2"
  }
}
```

#### Advanced Parameters for `search_memory`:

The Mem0 v2 search API offers powerful filtering capabilities that can be utilized through the `filters` parameter:

| Parameter | Type | Description |
|-----------|------|-------------|
| `filters` | object | Complex filters with logical operators and comparison conditions |
| `top_k` | integer | Number of top results to return (default: 10) |
| `fields` | string[] | Specific fields to include in the response |
| `rerank` | boolean | Whether to rerank the memories (default: false) |
| `keyword_search` | boolean | Whether to search based on keywords (default: false) |
| `filter_memories` | boolean | Whether to filter the memories (default: false) |
| `threshold` | number | Minimum similarity threshold for results (default: 0.3) |
| `org_id` | string | Organization ID for filtering memories |
| `project_id` | string | Project ID for filtering memories |

The `filters` parameter supports complex logical operations (AND, OR) and various comparison operators:

| Operator | Description |
|----------|-------------|
| `in` | Matches any of the values specified |
| `gte` | Greater than or equal to |
| `lte` | Less than or equal to |
| `gt` | Greater than |
| `lt` | Less than |
| `ne` | Not equal to |
| `icontains` | Case-insensitive containment check |

Example of using complex filters with the `search_memory` tool:

```json
{
  "query": "What are Alice's hobbies?",
  "userId": "user123",
  "filters": {
    "AND": [
      {
        "user_id": "alice"
      },
      {
        "agent_id": {"in": ["travel-agent", "sports-agent"]}
      }
    ]
  },
  "threshold": 0.5,
  "top_k": 5
}
```

This would search for memories related to Alice's hobbies where the user_id is "alice" AND the agent_id is either "travel-agent" OR "sports-agent", returning at most 5 results with a similarity score of at least 0.5.

For more detailed information on these parameters, refer to the [Mem0 API documentation](https://mem0.ai).

### SafeLogger

The MCP server implements a `SafeLogger` class that selectively redirects console.log calls from the mem0ai library to stderr without disrupting MCP protocol:

- Intercepts console.log calls and examines stack traces to determine source
- Only redirects log calls from mem0ai library or our own code
- Preserves clean stdout for MCP protocol communication
- Automatically cleans up resources on process exit

This allows proper functioning within MCP clients while maintaining useful debug information.

### Environment Variables

The server recognizes several environment variables that control its behavior:

- `MEM0_API_KEY`: API key for cloud storage mode
- `OPENAI_API_KEY`: API key for local storage mode (embeddings)
- `DEFAULT_USER_ID`: Default user ID for memory operations
- `DEFAULT_AGENT_ID`: Default agent ID for identifying the LLM/agent
- `DEFAULT_APP_ID`: Default app ID for project scoping

**Important Notes:**
- **Session IDs** are passed as tool parameters (e.g., `"sessionId": "my-session"`), not environment variables
- When using the tools, parameters provided directly (e.g., `agentId`, `appId`, `sessionId`) take precedence over environment variables, giving you maximum flexibility
- **org_id and project_id are set automatically by Mem0** and cannot be changed by users - use `appId` for project scoping instead

---

Made with ❤️ by Pink Pixel
