![Mem0 Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1741739911/mem0-logo_dlssjm.svg)


# @pinkpixel/mem0-mcp MCP Server ✨

A Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for LLMs. It allows AI agents to store and retrieve information across sessions.

This server uses the `mem0ai` Node.js SDK for its core functionality.

## Features 🧠

### Tools

*   **`add_memory`**: Stores a piece of text content as a memory associated with a specific `userId`.
    *   **Input:** `content` (string, required), `userId` (string, required), `sessionId` (string, optional), `metadata` (object, optional)
    *   Stores the provided text, enabling recall in future interactions.
*   **`search_memory`**: Searches stored memories based on a natural language query for a specific `userId`.
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
       "mem0-mcp": {
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

**2. Running from Cloned Repository:**

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
           "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE",
           "DEFAULT_USER_ID": "user" // Example default user
         },
         // ... rest of config ...
       }
     }
   }
```

Or when running directly with `node`:

```bash
DEFAULT_USER_ID="user" OPENAI_API_KEY="YOUR_KEY" node /path/to/mem0-mcp/build/index.js
```

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
