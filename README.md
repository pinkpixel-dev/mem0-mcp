![Mem0 Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1741739911/mem0-logo_dlssjm.svg)


# @pinkpixel/mem0-mcp MCP Server ✨

A Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for LLMs. It allows AI agents to store and retrieve information across sessions.

This server uses the `mem0ai` Node.js SDK for its core functionality.

## Features 🧠

### Tools

*   **`add_memory`**: Stores a piece of text content as a memory associated with a specific `userId`.
    *   **Input:** `content` (string, required), `userId` (string, required), `sessionId` (string, optional), `agentId` (string, optional), `metadata` (object, optional)
    *   Stores the provided text, enabling recall in future interactions.
*   **`search_memory`**: Searches stored memories based on a natural language query for a specific `userId`.
    *   **Input:** `query` (string, required), `userId` (string, required), `sessionId` (string, optional), `agentId` (string, optional), `filters` (object, optional), `threshold` (number, optional)
    *   Retrieves relevant memories based on semantic similarity.

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

You can run this server in two main ways:

### 1. Using `npx` (Recommended for quick use)

Install the package globally using npm:

```bash
npm install -g @pinkpixel/mem0-mcp
```

Configure your MCP client (e.g., Claude Desktop, Cursor, Cline, Roo Code, etc.) to run the server using `npx`:

#### Cloud Storage Configuration (Recommended)

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
        "DEFAULT_USER_ID": "user123"
      },
      "disabled": false,
      "alwaysAllow": [
        "add_memory",
        "search_memory"
      ]
    }
  }
}
```

**Note:** Replace `"YOUR_MEM0_API_KEY_HERE"` with your actual Mem0 API key.

#### Local Storage Configuration (Alternative)

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
        "search_memory"
      ]
    }
  }
}
```

**Note:** Replace `"YOUR_OPENAI_API_KEY_HERE"` with your actual OpenAI API key.

### 2. Running from Cloned Repository

Clone the repository, install dependencies, and build the server (see [Development](#development-) section below). Then, configure your MCP client to run the built script directly using `node`:

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "/path/to/your/cloned/mem0-mcp/build/index.js" 
      ],
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE"
        // OR use "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE" for local storage
      },
      "disabled": false,
      "alwaysAllow": [
        "add_memory",
        "search_memory"
      ]
    }
  }
}
```

**Note:** Replace `/path/to/your/cloned/mem0-mcp/` with the actual absolute path to where you cloned the repository.

### Default User ID (Optional Fallback)

Both the `add_memory` and `search_memory` tools require a `userId` argument to associate memories with a specific user.

For convenience during testing or in single-user scenarios, you can optionally set the `DEFAULT_USER_ID` environment variable when launching the server. If this variable is set, and the `userId` argument is *omitted* when calling the `search_memory` tool, the server will use the value of `DEFAULT_USER_ID` for the search.

**Note:** While this fallback exists, it's generally recommended that the calling agent (LLM) explicitly provides the correct `userId` for both adding and searching memories to avoid ambiguity.

Example configuration using `DEFAULT_USER_ID`:

```json
{
  "mcpServers": {
    "mem0-mcp": {
      // ... command and args ...
      "env": {
        "MEM0_API_KEY": "YOUR_MEM0_API_KEY_HERE",
        "DEFAULT_USER_ID": "user123" // Example default user
      },
      // ... rest of config ...
    }
  }
}
```

Or when running directly with `node`:

```bash
DEFAULT_USER_ID="user123" MEM0_API_KEY="YOUR_KEY" node /path/to/mem0-mcp/build/index.js
```

## Cloud vs. Local Storage 🔄

### Cloud Storage (Mem0 API)
* **Persistent by default** - Your memories remain available across server restarts
* **No local database required** - All data is stored on Mem0's servers
* **Higher retrieval quality** - Uses Mem0's optimized search algorithms
* **Additional fields** - Supports `agent_id` and `threshold` parameters
* **Requires** - A Mem0 API key

### Local Storage (OpenAI API)
* **In-memory by default** - Data is lost on server restart unless configured for persistence
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

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

---

Made with ❤️ by Pink Pixel
