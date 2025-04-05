# @pinkpixel/mem0-mcp MCP Server ✨

A Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for LLMs. It allows AI agents to store and retrieve information across sessions.

This server uses the `mem0ai` Node.js SDK for its core functionality.

## Features 🧠

### Tools

*   **`mem0_add_memory`**: Stores a piece of text content as a memory associated with a specific `userId`.
    *   **Input:** `content` (string, required), `userId` (string, required), `sessionId` (string, optional), `metadata` (object, optional)
    *   Stores the provided text, enabling recall in future interactions.
*   **`mem0_search_memory`**: Searches stored memories based on a natural language query for a specific `userId`.
    *   **Input:** `query` (string, required), `userId` (string, optional), `sessionId` (string, optional), `filters` (object, optional)
    *   Retrieves relevant memories based on semantic similarity.

## Prerequisites 🔑

This server requires an **OpenAI API key** for the internal operations of the `mem0ai` library (used for embedding and processing memories). This key must be provided as an environment variable (`OPENAI_API_KEY`) in your MCP client configuration.

## Installation & Configuration ⚙️

You can run this server in two main ways:

**1. Using `npx` (Recommended for quick use):**

   Install the package globally using npm:

   ```bash
   npm install -g @pinkpixel/mem0-mcp
   ```

Configure your MCP client (e.g., Claude Desktop, Cursor, Cline, Roo Code, etc.) to run the server using `npx`:

   ```json
   {
     "mcpServers": {
       "mem0-server": {
         "command": "npx",
         "args": [
           "-y",
           "@pinkpixel/mem0-mcp"
           ],
         "env": {
           "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE"
         },
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```
   **Note:** Replace `"YOUR_OPENAI_API_KEY_HERE"` with your actual OpenAI API key.  

**2. Running from Cloned Repository (for Development/Contribution):**

   Clone the repository, install dependencies, and build the server (see [Development](#development-) section below). Then, configure your MCP client to run the built script directly using `node`:

   ```json
   {
     "mcpServers": {
       "mem0-dev": { // Use a different name like 'mem0-dev' to avoid conflicts
         "command": "node",
         "args": [
           "/path/to/your/cloned/mem0-mcp/build/index.js" // Use absolute path
         ],
         "env": {
           "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE"
         },
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```
   **Note:** Replace `/path/to/your/cloned/mem0-mcp/` with the actual absolute path to where you cloned the repository.



**Important:** Replace `"YOUR_OPENAI_API_KEY_HERE"` with your actual OpenAI API key in the `env` section of the configuration.

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
