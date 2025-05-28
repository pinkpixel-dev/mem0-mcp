![Mem0 Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1741739911/mem0-logo_dlssjm.svg)

# @pinkpixel/mem0-mcp Project Overview ✨

**Current Version:** 0.3.5
**Last Updated:** 2025-05-28

## Project Summary

`@pinkpixel/mem0-mcp` is a Model Context Protocol (MCP) server that integrates with [Mem0.ai](https://mem0.ai/) to provide persistent memory capabilities for Large Language Models (LLMs). It allows AI agents to store and retrieve information across sessions, enhancing their ability to maintain context and remember important information.

## Purpose

The primary purpose of this project is to bridge the gap between LLMs and persistent memory storage. LLMs typically have limited context windows and no built-in ability to remember information across sessions. This MCP server solves that problem by providing tools that allow LLMs to:

1. Store important information as memories
2. Search for relevant memories based on semantic similarity
3. Delete specific memories when they're no longer needed

## Architecture

The project follows a simple architecture:

1. **MCP Server Layer**: Implements the Model Context Protocol using the `@modelcontextprotocol/sdk` package
2. **Memory Management Layer**: Interfaces with Mem0.ai's API for cloud storage or uses local in-memory storage
3. **Tool Handlers**: Implements the functionality for adding, searching, and deleting memories

### Key Components

- **Mem0MCPServer Class**: The main class that initializes the server, sets up tool handlers, and implements the core functionality
- **SafeLogger Class**: An innovative utility class that selectively redirects console.log calls from the mem0ai library to stderr without disrupting MCP protocol communication. This solves a critical issue where library output could break the MCP protocol.
- **Tool Handlers**: Functions that handle the `add_memory`, `search_memory`, and `delete_memory` tools with comprehensive error handling
- **Configuration Generator**: A sophisticated 403-line bash script with colorful ASCII art, interactive menus, and multiple configuration options
- **Dynamic Client Initialization**: Smart detection of available API keys to automatically choose between cloud and local storage modes

## Storage Modes

The server supports two storage modes:

1. **Cloud Storage Mode** ☁️ (Recommended)
   * Uses Mem0's hosted API with a MEM0_API_KEY environment variable
   * Memories are persistently stored on Mem0's cloud servers
   * No local database needed
   * Supports additional features like filtering, thresholds, and metadata

2. **Local Storage Mode** 💾
   * Uses in-memory storage with an OPENAI_API_KEY environment variable for embeddings
   * Memories are stored in an in-memory vector database (non-persistent by default)
   * Data is lost when the server restarts unless configured for persistent storage
   * Useful for development or testing purposes

## Tools Provided

The server provides three main tools:

1. **add_memory**: Stores a piece of text as a memory in Mem0
   * Required parameters: `content`, `userId`
   * Optional parameters: `sessionId`, `agentId`, `metadata`

2. **search_memory**: Searches for memories based on a query
   * Required parameters: `query`, `userId`
   * Optional parameters: `sessionId`, `agentId`, `filters`, `threshold`

3. **delete_memory**: Deletes a specific memory by ID
   * Required parameters: `memoryId`, `userId`
   * Optional parameters: `agentId`

## Dependencies

The project has the following key dependencies:

- **@modelcontextprotocol/sdk (1.12.0)**: For implementing the MCP server
- **mem0ai (^2.1.27)**: The Node.js SDK for Mem0.ai

Development dependencies:
- **@types/node (^22.15.23)**: TypeScript type definitions for Node.js
- **typescript (^5.8.3)**: For TypeScript compilation

## File Structure

```
mem0-mcp/
├── src/
│   └── index.ts         # Main TypeScript file implementing the MCP server (763 lines)
├── build/               # Compiled JavaScript files (generated)
├── vsce/                # VS Code extension files (if applicable)
├── config_generator.sh  # Interactive bash script for MCP configuration (461 lines)
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Dependency lock file
├── tsconfig.json        # TypeScript configuration
├── mem0-logo.svg        # Project logo
├── README.md            # Comprehensive project documentation (479 lines)
├── CHANGELOG.md         # Detailed version history and changes (105 lines)
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
