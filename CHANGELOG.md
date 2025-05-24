# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2025-05-23

### Added
- ✨ Added support for `orgId` and `projectId` as parameters in all tools (add_memory, search_memory, delete_memory)
- 🚀 Added comprehensive support for advanced Mem0 API parameters:
  - **add_memory**: `includes`, `excludes`, `infer`, `outputFormat`, `customCategories`, `customInstructions`, `immutable`, `expirationDate`
  - **search_memory**: `topK`, `fields`, `rerank`, `keywordSearch`, `filterMemories`
- 📊 Parameter-provided `orgId` and `projectId` now take precedence over environment variables for better user control
- 🔧 Enhanced configuration generator with `ORG_ID` and `PROJECT_ID` prompts for easier setup
- 🌟 Added global installation support with `mem0-mcp` command
- 📚 Added comprehensive installation documentation with three methods: global install, npx, and local build
- 🎯 Enhanced configuration generator with global install option
- 📋 Updated all README configuration examples to show complete environment variables

### Changed
- 🔧 Updated TypeScript interfaces to include all new parameters
- 📝 Enhanced tool schemas with detailed descriptions for all new parameters
- 🏗️ Improved parameter handling logic with proper fallbacks

### Removed
- 🧹 Removed unused `tiktoken-node` dependency to clean up the project

## ## [0.3.3] - 2025-04-22

### Fixed
- ✅ Resolved version mismatch between package.json and source code (now both 0.3.3)
- 🔧 Fixed configuration generator indentation issues and removed unused session ID environment variables
- 📝 Clarified that session IDs are tool parameters, not environment variables

## [0.3.2] - 2025-04-20

### Fixed
- Fixed issue with `threshold` parameter in `search_memory` tool when using cloud storage mode. The parameter is now properly handled to ensure it's never passed as null to the Mem0 API, which was causing errors for some users.

## [0.3.0] - 2025-04-05

### Added
- ✨ Added `delete_memory` tool to remove specific memories by ID.
- ☁️ Implemented support for Mem0 Cloud API using `MEM0_API_KEY`.
- 🏢 Added optional support for `ORG_ID` and `PROJECT_ID` environment variables for Cloud API scoping.
- 🔄 Added dynamic switching between Cloud API (if `MEM0_API_KEY` is present) and local in-memory storage (if `OPENAI_API_KEY` is present).

## [0.2.7] - 2025-04-08

### Added
- New MCP tool: `delete_memory` for removing specific memories by ID
- Comprehensive documentation for advanced Mem0 API parameters
- Detailed explanation of filters and comparison operators for the search functionality

### Fixed
- Fixed mapping between `sessionId` and `run_id` in search functionality for cloud API
- Clarified in-memory storage limitations in documentation

## [0.2.5] - 2025-04-05

### Fixed
- Implemented `SafeLogger` class to selectively redirect console.log calls from mem0ai library to stderr without breaking MCP protocol
- Fixed critical issue where stdout writes from internal libraries were disrupting the MCP communication protocol
- Added environment variable configurations to minimize debug logging from libraries
- Improved error handling and cleanup on process exit

## [0.1.7] - 2025-04-05

### Fixed
- Fixed MCP communication by removing all `console` logging that was interfering with the stdout protocol channel.

## [0.1.6] - 2025-04-05

### Changed
- Reverted `search_memory` tool description and schema to explicitly require `userId`, removing misleading "optional" phrasing related to the `DEFAULT_USER_ID` fallback.
- Added documentation to `README.md` explaining the `DEFAULT_USER_ID` environment variable and its use as a server-side fallback for `search_memory` if the `userId` argument is omitted (though providing `userId` in the call is recommended).


## [0.1.5]- 2025-04-05

### Fixed
- Resolved issue where memories were not being stored correctly due to unconfigured default database (Qdrant). Explicitly configured `mem0ai` client to use the in-memory vector store by default, ensuring basic functionality works out-of-the-box.

## [0.1.0] - 2025-04-05

### Added
- Initial functional Node.js/TypeScript implementation of `@pinkpixel/mem0-mcp`.
- Integration with `mem0ai` Node.js SDK.
- MCP tools: `mem0_add_memory` and `mem0_search_memory`.
- Requires `OPENAI_API_KEY` environment variable.
- Configuration for npm publishing under `@pinkpixel` scope.
- `README.md` with description, features, prerequisites, and installation instructions.
- Standard `LICENSE` (MIT), `CHANGELOG.md`, and `.gitignore`.

[Unreleased]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.3.0...v0.3.2
[0.3.0]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.2.7...v0.3.0
[0.2.7]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.2.5...v0.2.7
[0.2.5]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.7...v0.2.5
[0.1.7]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.0...v0.1.5
[0.1.0]: https://github.com/pinkpixel-dev/mem0-mcp/releases/tag/v0.1.0