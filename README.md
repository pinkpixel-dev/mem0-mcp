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
    *   **Optional:** `sessionId` (string), `agentId` (string), `orgId` (string), `projectId` (string), `metadata` (object)
    *   **Advanced (Cloud API):** `includes` (string), `excludes` (string), `infer` (boolean), `outputFormat` (string), `customCategories` (object), `customInstructions` (string), `immutable` (boolean), `expirationDate` (string)
    *   Stores the provided text, enabling recall in future interactions.
*   **`search_memory`**: Searches stored memories based on a natural language query for a specific `userId`.
    *   **Required:** `query` (string), `userId` (string)
    *   **Optional:** `sessionId` (string), `agentId` (string), `orgId` (string), `projectId` (string), `filters` (object), `threshold` (number)
    *   **Advanced (Cloud API):** `topK` (number), `fields` (array), `rerank` (boolean), `keywordSearch` (boolean), `filterMemories` (boolean)
    *   Retrieves relevant memories based on semantic similarity.
*   **`delete_memory`**: Deletes a specific memory from storage by its ID.
    *   **Required:** `memoryId` (string), `userId` (string)
    *   **Optional:** `agentId` (string), `orgId` (string), `projectId` (string)
    *   Permanently removes the specified memory.

## Prerequisites 🔑

This server supports two storage modes:

1. **Cloud Storage Mode** ☁️ (Recommended)
   * Requires a **Mem0 API key** (provided as `MEM0_API_KEY` environment variable)
   * Memories are persistently stored on Mem0's cloud servers
   * No local database needed

2. **Local Storage Mode** 💾
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
        "ORG_ID": "your-org-id",
        "PROJECT_ID": "your-project-id"
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
        "ORG_ID": "your-org-id",
        "PROJECT_ID": "your-project-id"
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
        "ORG_ID": "your-org-id",
        "PROJECT_ID": "your-project-id"
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

### Default User ID (Optional Fallback)

Both the `add_memory` and `search_memory` tools require a `userId` argument to associate memories with a specific user.

For convenience during testing or in single-user scenarios, you can optionally set the `DEFAULT_USER_ID` environment variable when launching the server. If this variable is set, and the `userId` argument is *omitted* when calling the `search_memory` tool, the server will use the value of `DEFAULT_USER_ID` for the search.

**Note:** While this fallback exists, it's generally recommended that the calling agent (LLM) explicitly provides the correct `userId` for both adding and searching memories to avoid ambiguity.

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

## Cloud vs. Local Storage 🔄

### Cloud Storage (Mem0 API)
* **Persistent by default** - Your memories remain available across sessions and server restarts
* **No local database required** - All data is stored on Mem0's servers
* **Higher retrieval quality** - Uses Mem0's optimized search algorithms
* **Additional fields** - Supports `agent_id` and `threshold` parameters
* **Requires** - A Mem0 API key

### Local Storage (OpenAI API)
* **In-memory by default** - Data is stored only in RAM and is **not persistent long-term**. While some caching may occur, you should not rely on this for permanent storage.
* **Data loss risk** - Memory data will be lost on server restart, system reboot, or if the process is terminated
* **Recommended for** - Development, testing, or temporary use only
* **For persistent storage** - Use the Cloud Storage option with Mem0 API if you need reliable long-term memory
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
- `ORG_ID` / `YOUR_ORG_ID`: Default organization ID for cloud storage mode
- `PROJECT_ID` / `YOUR_PROJECT_ID`: Default project ID for cloud storage mode

**Important Notes:**
- **Session IDs** are passed as tool parameters (e.g., `"sessionId": "my-session"`), not environment variables
- When using the tools, parameters provided directly (e.g., `orgId`, `projectId`, `sessionId`) take precedence over environment variables, giving you maximum flexibility

---

Made with ❤️ by Pink Pixel
