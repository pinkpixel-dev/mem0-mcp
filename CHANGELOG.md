# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-04-20

### Fixed
- Fixed issue with `threshold` parameter in `search_memory` tool when using cloud storage mode. The parameter is now properly handled to ensure it's never passed as null to the Mem0 API, which was causing errors for some users.

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

[Unreleased]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.2.7...v0.3.1
[0.2.7]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.2.5...v0.2.7
[0.2.5]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.7...v0.2.5
[0.1.7]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/pinkpixel-dev/mem0-mcp/compare/v0.1.0...v0.1.5
[0.1.0]: https://github.com/pinkpixel-dev/mem0-mcp/releases/tag/v0.1.0