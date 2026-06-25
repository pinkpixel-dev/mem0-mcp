![Mem0 Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1741739911/mem0-logo_dlssjm.svg)

# @pinkpixel/mem0-mcp Project Overview ✨

**Current Version:** 1.0.0
**Last Updated:** 2026-06-24T21:00:00Z

## Project Summary

`@pinkpixel/mem0-mcp` is a Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for Large Language Models (LLMs). It allows AI agents to store and retrieve information across sessions, supporting the modern **Mem0 Platform API V3** pipeline.

## Purpose

The primary purpose of this project is to bridge the gap between LLMs and persistent memory storage. This MCP server solves that problem by providing tools that allow LLMs to:

1. Store important information as memories via V3's additive pipeline.
2. Search for relevant memories based on hybrid vector and keyword retrieval.
3. List, fetch, update, delete, and audit memory histories cleanly.

## Architecture

The project follows a modular, provider-adapter architecture:

1. **MCP Server Layer**: Implements the Model Context Protocol using the `@modelcontextprotocol/sdk` package.
2. **Backend Adapter Interface**: Defines a common contract interface (`MemoryBackend`) for all data interactions.
3. **Backend Adapters**: Implements individual adapter classes for Cloud API V3, Supabase, and Local in-memory modes.

### Key Components

- **Mem0MCPServer Class**: The main orchestrator that registers standard schemas and handles JSON-RPC tool callbacks.
- **MemoryBackend Class**: The parent abstract contract class for backend isolation.
- **CloudBackend Class**: Maps scope query params into nested filters, handles async background polling for additions, and queries the Mem0 Cloud V3 API.
- **SupabaseBackend Class**: Connects to pgvector-enabled PostgreSQL for custom database self-hosting.
- **LocalBackend Class**: Simple in-memory collection vector store for testing and quick local usage.
- **Capability Gating**: Provides structured capability details indicating which tools are supported by the active backend.

## Storage Modes

The server supports three storage modes:

1. **Cloud Storage Mode** ☁️ (Recommended for production)
   * Uses Mem0's hosted API with a MEM0_API_KEY environment variable.
   * Memories are persistently stored on Mem0's cloud servers.
   * Supports advanced filters, async additions, memory history logs, and batch operations.

2. **Supabase Storage Mode** 🗄️ (Recommended for self-hosting)
   * Uses Supabase PostgreSQL with pgvector for persistent storage.
   * Requires SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY environment variables.
   * Standard SQL access with vector similarity functions.

3. **Local Storage Mode** 💾 (Development/testing only)
   * Uses in-memory storage with an OPENAI_API_KEY environment variable for embeddings.
   * Memories are stored in an in-memory vector database (non-persistent).

## Tools Provided

The server provides 9 modernized tools:

1. **add_memory**: Stores memories from a text string or structured message arrays (handles async polling).
2. **search_memories**: Searches memories using semantic and BM25 hybrid filters.
3. **search_memory**: Backward-compatible alias for search_memories.
4. **list_memories**: Paginated retrieval of stored memory records under specific scopes.
5. **get_memory**: Retrieves a single memory record by its ID.
6. **update_memory**: Modifies the text or metadata of a memory.
7. **delete_memory**: Deletes a memory by ID.
8. **get_memory_history**: Retrieves the audit trail of memory revisions (cloud only).
9. **get_memory_capabilities**: Reports the capabilities and API features of the active backend.

## Dependencies

The project has the following key dependencies:

- **@modelcontextprotocol/sdk (1.29.0)**: For implementing the MCP server.
- **mem0ai (^3.0.10)**: The modern Node.js SDK for Mem0.ai.

## File Structure

```
mem0-mcp/
├── src/
│   ├── index.ts         # Main entry point and MCP Server definition
│   ├── types.ts         # Shared typescript contracts and capabilities
│   └── backends/
│       ├── base.ts      # Base abstract adapter class
│       ├── cloud.ts     # Platform V3 Cloud adapter
│       ├── supabase.ts  # Self-hosted Supabase adapter
│       └── local.ts     # In-memory local adapter
├── build/               # Compiled JavaScript files (generated)
├── vsce/                # VS Code extension files (if applicable)
├── config_generator.sh  # Interactive bash script for MCP configuration
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Dependency lock file
├── tsconfig.json        # TypeScript configuration
├── mem0-logo.svg        # Project logo
├── README.md            # Comprehensive project documentation (548 lines)
├── CHANGELOG.md         # Detailed version history and changes (256 lines)
├── CONTRIBUTING.md      # Guidelines for contributing to the project
├── LICENSE              # MIT License
└── OVERVIEW.md          # This file - project overview
```

## Installation & Usage

The server can be installed and used in two main ways:

1. **Using `npx` (Recommended for quick use)**
   * Install globally: `npm install -g @pinkpixel/mem0-mcp`
   * Configure MCP client to run the server using `npx`

2. **Running from Cloned Repository**
   * Clone the repository: `git clone https://github.com/pinkpixel-dev/mem0-mcp`
   * Install dependencies: `npm install`
   * Build the server: `npm run build`
   * Configure MCP client to run the built script directly using `node`

## Configuration

The server requires configuration in the MCP client's configuration file (e.g., `mcp.json`). The configuration includes:

- Command and arguments to run the server
- Environment variables for API keys and default user ID
- Tool permissions

### Interactive Configuration Generator

The project includes a sophisticated bash script (`config_generator.sh`) that provides an interactive menu for:

- 🔧 **Generating mcp.json configurations** with guided setup
- 📖 **Viewing README.md** documentation
- 🔄 **Restarting the Mem0-MCP server** with environment variables
- 🎨 **Colorful ASCII banner** and styled output
- 💾 **Multiple save options** (Cursor IDE, custom file, clipboard)
- ⚙️ **Support for both installation methods** (local build vs npm package)

Example configuration for cloud storage mode:

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
        "search_memory"
      ]
    }
  }
}
```

## Development

For development:

1. Clone the repository: `git clone https://github.com/pinkpixel-dev/mem0-mcp`
2. Install dependencies: `npm install`
3. Build the server: `npm run build`
4. For auto-rebuild on file changes: `npm run watch`
5. For debugging: `npm run inspector`

## Technical Challenges & Solutions

### MCP Protocol Communication

**Challenge**: MCP servers communicate over stdout, and any libraries or code that writes to stdout may interfere with the protocol.

**Solution**: The project implements an innovative `SafeLogger` class that:
- Intercepts console.log calls and examines stack traces to determine source
- Only redirects log calls from mem0ai library or project code to stderr
- Preserves clean stdout for MCP protocol communication
- Automatically cleans up resources on process exit

### Storage Mode Selection

**Challenge**: Supporting both cloud and local storage modes with different requirements and capabilities.

**Solution**: The server dynamically selects the storage mode based on available environment variables and initializes the appropriate client using dynamic imports to handle TypeScript compatibility issues.

### Memory Deletion Complexity

**Challenge**: The mem0ai library doesn't expose consistent delete methods across cloud and local modes.

**Solution**: Implements fallback strategies using direct API calls for cloud mode and accessing internal vectorstore methods for local mode, with proper error handling for unsupported operations.

### Parameter Handling Evolution (v0.5.0)

**Challenge**: Critical issues with organization and project ID parameters not working properly, and incorrect parameter usage.

**Solution**: Major breaking change in v0.5.0 that:
- **BREAKING CHANGE**: Replaced incorrect `orgId`/`projectId` parameters with correct Mem0 API parameters
- **New Parameter Mapping**: `agentId` (LLM identifier), `userId` (user), `appId` (project scope), `sessionId` (session tracking)
- **Root Cause Fix**: org_id and project_id are auto-assigned by Mem0 and cannot be changed by users
- **Correct Scope Control**: app_id is what actually controls the user's project scope in Mem0
- **Enhanced Environment Fallbacks**: Added `DEFAULT_AGENT_ID` and `DEFAULT_APP_ID` environment variables
- **API Compliance**: Now uses correct Mem0 API parameters instead of non-functional org/project IDs

## Current Status & Quality Assessment

### Project Maturity
This is a **production-ready, high-quality MCP server** that demonstrates excellent software engineering practices:

✅ **Comprehensive Documentation**: 548-line README with multiple installation methods, configuration examples, and troubleshooting
✅ **Active Maintenance**: Regular updates addressing security vulnerabilities and user feedback
✅ **Innovative Technical Solutions**: SafeLogger class solving MCP protocol compatibility issues
✅ **Robust Error Handling**: Comprehensive try-catch blocks with detailed error messages
✅ **Security Conscious**: Recent updates addressing CVEs in axios and undici dependencies
✅ **User-Focused**: Environment variable fallbacks and multiple installation methods for ease of use

### Recent Improvements (v0.5.0-0.6.1)
- 🚀 **NEW FEATURE (v0.6.0-0.6.1)**: Added Supabase as a third storage option with persistent storage, free tier, and self-hosting capabilities
- 🗄️ **Supabase Integration**: Full vector search with pgvector, SQL access, and comprehensive setup documentation
- 🎯 **BREAKING CHANGE**: Fixed incorrect parameter implementation by replacing `orgId`/`projectId` with correct `agentId`/`appId` parameters
- 🔧 **Root Cause Resolution**: Addressed fundamental misunderstanding of Mem0 API parameter usage
- ✅ **Parameter Functionality Confirmed**: app_id and run_id parameters now working correctly (v0.5.4)
- 📊 **Dashboard Integration**: Parameters appear in Mem0 dashboard Event Details as expected
- 📝 **Enhanced Documentation**: Comprehensive parameter configuration guide with system prompt recommendations
- 🚀 **Improved API Compliance**: Now uses correct Mem0 API parameters for proper project scoping
- 🛡️ **Security updates** addressing high-severity vulnerabilities

### Minor Areas for Enhancement
- **Testing Framework**: Could benefit from unit and integration tests
- **Batch Operations**: Potential for batch memory operations for efficiency
- **Monitoring & Analytics**: Could add comprehensive logging and usage analytics

## Future Improvements

Potential areas for future improvement include:

1. **Advanced Filtering**: Expand support for more complex filtering options and search capabilities
2. **Batch Operations**: Implement batch operations for adding or deleting multiple memories efficiently
3. **Memory Versioning**: Add support for memory versioning and history tracking
4. **Enhanced Error Handling**: Improve error handling and recovery mechanisms with more detailed error messages
5. **Monitoring & Analytics**: Add comprehensive logging, monitoring, and usage analytics capabilities
6. **Performance Optimization**: Optimize memory search performance and implement caching strategies
7. **Testing Framework**: Add comprehensive unit and integration tests
8. **Documentation**: Expand API documentation with more examples and use cases

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ by Pink Pixel
