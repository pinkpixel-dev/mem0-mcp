# Changelog

All notable changes to this project will be documented in this file.

## [0.6.4-pereneo.2] - 2026-06-09

### ✨ send_mail Phase D — attachments + bcc

Le tool `send_mail` accepte désormais des pièces jointes et des destinataires en
copie cachée, en plus de `to` et `cc` déjà supportés. Avant ce patch, le COMEX
ne pouvait envoyer aucune PJ via Charli/Claude Desktop ni faire d'envoi multi-
destinataires masqués.

- **Schema** : ajout de `bcc: string[]` et `attachments: [{name, contentType, contentBytes}]`
- **Validation** : chaque attachment requiert `name` + `contentType` + `contentBytes` (base64).
  Plafond cumulé `SEND_MAIL_ATTACHMENT_BASE64_LIMIT = 3.5 MB` de base64 (≈ 2.6 MB de
  fichier brut) pour rester sous le cap Graph sendMail ~4 MB. Au-delà, retour
  `attachment_too_large` avec hint (pas d'`createUploadSession` implémenté).
- **Payload Graph** : injection de `message.bccRecipients` et `message.attachments[]`
  avec le `@odata.type` `#microsoft.graph.fileAttachment`.
- **Audit log** : `recipientsCount` inclut désormais les BCC ; ajout du champ
  `attachments` dans la ligne `[send_mail] sent`.
- **Retour** : `attachmentsCount` ajouté à la réponse `ok: true`.

Files changed : `src/index.ts`.

## [0.6.4-pereneo.1] - 2026-05-01

### 🔧 BL-47 — MCP HTTP spec §3 conformance fix

Server now returns HTTP 404 (per MCP HTTP spec 2025-03-26 §3) when receiving
requests with an unknown `Mcp-Session-Id` header (typical case: pod restart /
cold start = in-memory `transports` map lost). Client receiving 404 must
re-initialize without `Mcp-Session-Id` header (spec §4).

Before this patch, server silently created a fresh empty transport on unknown
session id, causing the next `tools/call` to return JSON-RPC
`Server not initialized` with no recovery path — blocking long-running clients
after pod recycling.

Affects HTTP transport added in 0.6.4-pereneo.0 only. Stdio transport unaffected.

Files changed: `src/index.ts` (POST /mcp + GET/DELETE handleSession).

## [0.6.4-pereneo.0] - 2026-04-28 to 2026-04-29

### 🚀 Streamable HTTP transport for Azure Container Apps

Pereneo fork of `@pinkpixel/mem0-mcp` 0.6.4 adding Streamable HTTP server
transport with OAuth 2.0 Resource Server pattern, suitable for deployment as
Azure Container App.

- **J1.0 (28/04/2026)** — Added Streamable HTTP transport (`StreamableHTTPServerTransport`)
- **J4.0 (29/04/2026)** — Added OAuth 2.0 Resource Server (MCP authorization spec 2025-11-25)
- **J4 fix (29/04/2026)** — Advertise fully-qualified OAuth scope in protected-resource metadata
- **J4 fix (29/04/2026)** — Accept both URI and GUID audience in JWT validation
- **Misc** — Added .dockerignore for minimal build context

## [0.6.1] - 2025-05-28

### 🔧 **PATCH - Supabase Configuration Fix**
- **Fixed embedder configuration** - Corrected OpenAI API key reference for Supabase mode
- **Published to npmjs** - Updated package available via npx for immediate testing
- **Confirmed functionality** - Supabase storage mode tested and working with vector search
- **Memory operations verified** - All tools (add_memory, search_memory, delete_memory) functional with Supabase

## [0.6.0] - 2025-05-28

### 🚀 **NEW FEATURE - Supabase Storage Mode**
- **Added Supabase as a third storage option** alongside Mem0 cloud and local storage
- **Persistent storage with free tier** - Supabase offers generous free tier for development
- **Self-hostable option** - Users can run their own Supabase instance for complete control
- **Vector search with pgvector** - Efficient similarity search using PostgreSQL's pgvector extension
- **SQL access** - Direct database access for advanced queries and analytics

### 🔧 **Implementation Details**
- **Storage mode priority**: Cloud (MEM0_API_KEY) > Supabase (SUPABASE_URL + SUPABASE_KEY) > Local (OPENAI_API_KEY)
- **Environment variables**: Added support for `SUPABASE_URL` and `SUPABASE_KEY`
- **Database setup**: Comprehensive SQL migrations for memories and memory_history tables
- **Vector search function**: Custom PostgreSQL function for similarity search with filtering
- **Full tool support**: All three tools (add_memory, search_memory, delete_memory) work with Supabase

### 📝 **Documentation Updates**
- **Comprehensive Supabase setup guide** with step-by-step SQL migrations
- **Configuration examples** for all three installation methods (global, npx, cloned repo)
- **Storage mode comparison** highlighting benefits of each option
- **Environment variable documentation** for Supabase credentials

### 🎯 **Benefits for Users**
- **Free persistent storage** - Alternative to paid Mem0 cloud service
- **Local control** - Self-hosted option for privacy and compliance
- **Scalability** - Grows from free tier to enterprise scale
- **Advanced features** - Real-time subscriptions, webhooks, direct SQL access
- **No vendor lock-in** - Open source PostgreSQL with standard SQL

## [0.5.5] - 2025-05-28

### ✅ **CONFIRMED WORKING** - `app_id` and `run_id` Parameters
- **SUCCESS**: Confirmed that `app_id` and `run_id` parameters are now working correctly!
- **Dashboard Behavior**: Parameters appear in individual memory details (Event Details panel) as expected
- **API Version**: Re-added `version="v2"` for add operations as recommended by Mem0 docs (v1 is deprecated)
- **UI Limitation**: Mem0 dashboard doesn't show `app_id`/`run_id` in main list view by design - this is normal behavior

### 📝 Research Findings
- Mem0 stores `app_id` and `run_id` as first-class fields, not in metadata
- Dashboard UI focuses on user/agent groupings; `app_id`/`run_id` appear in memory details and are fully queryable
- Parameters are working correctly - the "missing" display in main list was expected behavior
- All memory operations now use proper API versions and endpoints

### 🎯 Status
- ✅ Project scoping via `app_id` - **WORKING**
- ✅ Session tracking via `run_id` - **WORKING**
- ✅ Agent identification via `agent_id` - **WORKING**
- ✅ Memory organization and filtering - **WORKING**

## [0.5.3] - 2025-05-28

### 🔧 Fixed
- **API Endpoint Corrections**:
  - Add Memory: Uses `/v1/memories/`
  - Search Memory: Uses `/v1/memories/search/` with `version=v2` parameter
  - Delete Memory: Uses `/v1/memories/{id}/`
- Fixed delete endpoint URL from `/v2/memories/{id}` to `/v1/memories/{id}/`

## [0.5.2] - 2025-05-28

### 🔧 Fixed
- **API Call Priority**: Now prioritizes direct REST API calls over Node.js SDK when `app_id` or `run_id` parameters are provided
- **Enhanced Parameter Support**: Ensures `app_id` and `run_id` parameters are properly passed to Mem0 API for project scoping and session tracking
- **Better Debugging**: Added specific logging when using direct API calls for parameter-sensitive operations

### 📝 Technical Details
- Modified both `add_memory` and `search_memory` methods to use direct REST API calls when `app_id` or `sessionId` parameters are present
- The Node.js SDK appears to have limitations with certain parameters, so direct API calls ensure full parameter support
- Maintains backward compatibility while ensuring all parameters work correctly
- Added fallback logic to SDK if direct API calls fail

## [0.5.1] - 2025-05-28

### 📝 Documentation
- Updated README with comprehensive parameter configuration guide
- Added system prompt recommendations for LLM usage
- Enhanced examples showing correct parameter usage
- Clarified that org_id/project_id are auto-assigned by Mem0

## [0.5.0] - 2025-05-28

### 🎯 **BREAKING CHANGE - Correct Parameter Implementation**
- **MAJOR FIX**: Replaced incorrect `orgId`/`projectId` parameters with correct Mem0 API parameters
- **Parameter Mapping**:
  - `agentId` - The LLM/agent making the tool call
  - `userId` - The user's identifier
  - `appId` - The user's project/application (this controls project scope!)
  - `sessionId` - Maps to `run_id` for session tracking
- **Environment Fallbacks**: Added `DEFAULT_AGENT_ID` and `DEFAULT_APP_ID` environment variables
- **API Compliance**: Now uses correct Mem0 API parameters (`app_id`, `agent_id`, `run_id`) instead of non-functional org/project IDs

### 🔧 Fixed
- **Root Cause**: org_id and project_id are set by Mem0 automatically and cannot be changed by users
- **Correct Scope Control**: app_id is what actually controls the user's project scope in Mem0
- **Parameter Precedence**: Tool parameters take precedence over environment variable defaults
- **Enhanced Logging**: Added comprehensive parameter resolution logging for debugging

### 📝 Technical Details
- Removed all references to `orgId`/`projectId` (these are auto-assigned by Mem0)
- Implemented proper `app_id` parameter for project scoping
- Updated tool schemas to reflect correct parameter names and descriptions
- Added fallback logic for `DEFAULT_AGENT_ID` and `DEFAULT_APP_ID` environment variables
- Updated direct REST API calls to use correct parameter names

## [0.4.2] - 2025-05-28

### 🔧 Fixed
- **CRITICAL FIX**: Added fallback to direct REST API calls when Node.js SDK doesn't properly handle org_id/project_id parameters
- **SDK Limitation Workaround**: Node.js SDK appears to ignore org_id/project_id parameters, so we now use direct REST API calls as fallback
- **Enhanced Error Handling**: Added comprehensive error handling with automatic fallback from SDK to direct API calls
- **Better Debugging**: Added detailed logging for both SDK attempts and direct API calls to help identify issues

### 📝 Technical Details
- When `cloudClient.add()` or `cloudClient.search()` fails or ignores org/project parameters, automatically falls back to direct REST API calls
- Direct API calls use proper `https://api.mem0.ai/v1/memories/` endpoints with full parameter support
- Maintains backward compatibility while ensuring org_id and project_id parameters work correctly
- Added comprehensive request/response logging for debugging

## [0.4.1] - 2025-05-28

### 🔧 Fixed
- **CRITICAL FIX**: Removed organizationId and projectId from client-level initialization to fix environment variable fallbacks
- **Parameter Override Issue**: Client-level org/project settings were overriding per-request parameters, preventing environment variables and tool parameters from working
- **Enhanced Debugging**: Added comprehensive logging to track parameter resolution and API call options
- **Environment Variable Fallbacks**: ORG_ID and PROJECT_ID environment variables now work correctly when tool parameters are omitted

### 📝 Technical Details
- Removed `organizationId` and `projectId` from MemoryClient constructor options
- Client-level settings were preventing per-request `org_id` and `project_id` parameters from taking effect
- Added detailed logging to help debug parameter resolution issues
- Environment variable fallback logic now works as intended

## [0.4.0] - 2025-01-27

### 🔧 Fixed
- **BREAKING FIX**: Fixed client initialization issue where org_id and project_id set at client level were overriding per-request values
- **API Parameter Format**: Changed API method parameters from camelCase to snake_case to match Mem0 REST API specification
  - `userId` → `user_id`
  - `orgId` → `org_id`
  - `projectId` → `project_id`
  - `agentId` → `agent_id`
  - `sessionId` → `session_id`
  - `customCategories` → `custom_categories`
  - `customInstructions` → `custom_instructions`
  - `outputFormat` → `output_format`
  - `expirationDate` → `expiration_date`
  - `topK` → `top_k`
  - `keywordSearch` → `keyword_search`
  - `filterMemories` → `filter_memories`
- **Client Initialization**: Now properly sets organizationId and projectId at client level using camelCase (as expected by JavaScript SDK)
- **Environment Variable Fallbacks**: ORG_ID and PROJECT_ID environment variable fallbacks now work properly when explicit parameters are not provided

### 🚀 Improved
- Enhanced error messages to include API response details for better debugging
- Added comprehensive parameter validation and logging
- Improved client initialization logging to show which parameters are being used

### 📝 Notes
- This version fixes the core issue where organization and project IDs were not being properly passed to the Mem0 API
- Users should now see their memories properly scoped to their organization and project
- Environment variable fallbacks (ORG_ID, PROJECT_ID) will now work as expected when tool parameters are omitted

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.9] - 2025-01-27

### Fixed
- **CRITICAL FIX**: Fixed organization and project ID parameters not working properly
  - Changed from snake_case (`org_id`, `project_id`) to camelCase (`organizationId`, `projectId`) for JavaScript client compatibility
  - Fixed environment variable fallbacks (`ORG_ID`, `PROJECT_ID`) not working due to incorrect parameter names
  - Updated all API calls to use correct JavaScript/Node.js parameter naming convention
  - This resolves issues where explicit org/project parameters were ignored and environment defaults weren't applied

### Technical Details
- Updated `add_memory`, `search_memory`, and `delete_memory` methods to use camelCase parameters
- Fixed parameter mapping: `userId`, `organizationId`, `projectId`, `sessionId`, `agentId`
- Fixed advanced parameters: `outputFormat`, `customCategories`, `customInstructions`, `expirationDate`, `topK`, `keywordSearch`, `filterMemories`
- Maintains backward compatibility with environment variable names

## [0.3.8] - 2025-05-28

### Fixed

- 🐛 **CRITICAL BUG FIX**: Fixed DEFAULT_USER_ID environment variable not being used as fallback when userId parameter is omitted
- - 🐛 Also fixed issue with PROJECT_ID and ORG_ID variables not being used as fallback when projectId and orgId parameters are omitted during tool use

## [0.3.7] - 2025-05-28

### Documentation
- 📚 **Enhanced README**: Added comprehensive section explaining environment variable fallback behavior
- 🎯 Clarified priority order: Tool parameters override environment variables
- 📝 Added detailed examples showing when defaults are used vs. overridden
- 💡 Provided guidance on instructing LLMs to use configured defaults
- 🔍 Added GitHub issue comment explaining fallback behavior to user

### Changed
- 📖 Improved documentation clarity for environment variable usage patterns

## [0.3.6] - 2025-05-28

### Fixed
- 🐛 **CRITICAL BUG FIX**: Fixed DEFAULT_USER_ID environment variable not being used as fallback when userId parameter is omitted
- ✅ All three tools (add_memory, search_memory, delete_memory) now properly use DEFAULT_USER_ID as fallback
- 🔧 Updated tool schemas to make userId parameter optional with clear fallback documentation
- 📝 Improved error messages to indicate when DEFAULT_USER_ID environment variable is missing
- 🎯 Resolves GitHub issue #3 where environment variables were not taking effect

### Changed
- 📋 Made userId parameter optional in all tool schemas since DEFAULT_USER_ID provides fallback
- 🔄 Enhanced parameter validation logic to use environment variable fallbacks consistently

## [0.3.5] - 2025-05-28

### Security
- 🔒 **CRITICAL**: Fixed high severity security vulnerabilities in dependencies
- 🛡️ Updated axios from 1.7.7 to 1.9.0 to address SSRF and credential leakage vulnerability (GHSA-jr5f-v2jv-69x6)
- 🛡️ Updated undici from 5.28.5 to 7.10.0 to address denial of service vulnerability (GHSA-cxrh-j4jr-qwg3)
- ⚙️ Added npm overrides in package.json to ensure secure dependency versions
- ✅ All security vulnerabilities resolved - npm audit now shows 0 vulnerabilities

### Changed
- 📦 Added dependency overrides for axios and undici to maintain security compliance
- 🔧 Enhanced package.json with security-focused dependency management

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