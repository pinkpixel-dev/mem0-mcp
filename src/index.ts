#!/usr/bin/env node

/**
 * MCP server for interacting with Mem0.ai memory storage.
 * Provides tools to add and search memories.
 *
 * Supports two modes:
 * 1. Cloud mode: Uses Mem0's hosted API with MEM0_API_KEY
 * 2. Local mode: Uses in-memory storage with OPENAI_API_KEY for embeddings
 */

// Create a wrapper around console to safely redirect logs from libraries
// This ensures MCP protocol communication is not affected
class SafeLogger {
  private originalConsoleLog: typeof console.log;

  constructor() {
    // Store the original console.log
    this.originalConsoleLog = console.log;

    // Redirect console.log to stderr only for our module
    console.log = (...args) => {
      // Check if it's from the mem0ai library or our code
      const stack = new Error().stack || '';
      if (stack.includes('mem0ai') || stack.includes('mem0-mcp')) {
        console.error('[redirected log]', ...args);
      } else {
        // Keep normal behavior for MCP protocol and other code
        this.originalConsoleLog.apply(console, args);
      }
    };
  }

  // Restore original behavior
  restore() {
    console.log = this.originalConsoleLog;
  }
}

// Apply the safe logger
const safeLogger = new SafeLogger();

// Disable debug logs in any libraries that respect these environment variables
process.env.DEBUG = '';  // Disable debug logs
process.env.NODE_DEBUG = ''; // Disable Node.js internal debugging
process.env.DEBUG_COLORS = 'no'; // Disable color output in logs
process.env.NODE_ENV = process.env.NODE_ENV || 'production'; // Use production mode by default
process.env.LOG_LEVEL = 'error'; // Set log level to error only
process.env.SILENT = 'true'; // Some libraries respect this
process.env.QUIET = 'true'; // Some libraries respect this
// Disable Mem0 telemetry to avoid network calls during initialization
process.env.MEM0_TELEMETRY = 'false';

// IMPORTANT: Don't globally override stdout as it breaks MCP protocol
// We'll use more targeted approaches in specific methods

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import type { Memory as MemoryType } from "mem0ai/oss";

// Load Mem0 library after configuring environment to avoid unwanted telemetry
let Memory: typeof import("mem0ai/oss").Memory;
// Using dynamic import for cloud API to avoid TypeScript issues
let MemoryClient: any = null;


async function initializeMemory() {
  const mod = await import("mem0ai/oss");
  Memory = mod.Memory;
}

// Immediately initialize Memory
initializeMemory();
// Type for the arguments received by the MCP tool handlers
interface Mem0AddToolArgs {
  content: string;
  userId?: string;
  sessionId?: string;  // This maps to run_id in Mem0 API
  agentId?: string;    // The LLM/agent making the tool call
  appId?: string;      // Application identifier (legacy parameter)
  projectId?: string;  // Project identifier (for mem0 Pro plan project organization)
  orgId?: string;      // Organization identifier (for mem0 organization-level management)
  metadata?: any;
  // Advanced Mem0 API parameters
  includes?: string;
  excludes?: string;
  infer?: boolean;
  outputFormat?: string;
  customCategories?: any;
  customInstructions?: string;
  immutable?: boolean;
  expirationDate?: string;
}

interface Mem0SearchToolArgs {
  query: string;
  userId?: string;
  sessionId?: string;  // This maps to run_id in Mem0 API
  agentId?: string;    // The LLM/agent making the tool call
  appId?: string;      // Application identifier (legacy parameter)
  projectId?: string;  // Project identifier (for mem0 Pro plan project organization)
  orgId?: string;      // Organization identifier (for mem0 organization-level management)
  filters?: any;
  threshold?: number;
  // Advanced Mem0 API search parameters
  topK?: number;
  fields?: string[];
  rerank?: boolean;
  keywordSearch?: boolean;
  filterMemories?: boolean;
}

interface Mem0DeleteToolArgs {
  memoryId: string;
  userId?: string;
  agentId?: string;    // The LLM/agent making the tool call
  appId?: string;      // Application identifier (legacy parameter)
  projectId?: string;  // Project identifier (for mem0 Pro plan project organization)
  orgId?: string;      // Organization identifier (for mem0 organization-level management)
}

// Message type for Mem0 API
type Mem0Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

class Mem0MCPServer {
  private server: Server;
  private isCloudMode: boolean = false;
  private isSupabaseMode: boolean = false;
  private localClient?: MemoryType;
  private cloudClient?: any;
  private supabaseClient?: MemoryType;
  private isReady: boolean = false;

  constructor() {
    console.error("Initializing Mem0 MCP Server...");

    // Check for Mem0 API key first (for cloud mode)
    const mem0ApiKey = process.env.MEM0_API_KEY;

    // Check for Supabase credentials (for Supabase mode)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    // Check for OpenAI API key (for local mode)
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Initialize MCP Server
    this.server = new Server(
      {
        // These should match package.json
        name: "@pinkpixel/mem0-mcp",
        version: "0.6.1",
      },
      {
        capabilities: {
          // Only tools capability needed for now
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Determine the mode based on available keys (priority: Cloud > Supabase > Local)
    if (mem0ApiKey) {
      console.error("Using Mem0 cloud storage mode with MEM0_API_KEY");
      this.isCloudMode = true;

      // Dynamic import for cloud client
      import('mem0ai').then(module => {
        try {
          MemoryClient = module.default;
          // Get default app_id and agent_id for fallbacks
          const defaultAppId = process.env.DEFAULT_APP_ID;
          const defaultAgentId = process.env.DEFAULT_AGENT_ID;

          // Initialize with basic options ONLY - DO NOT set org/project IDs at client level
          // as they would override per-request parameters
          const clientOptions: any = {
            apiKey: mem0ApiKey,
            // Disable debug logs in the client if possible
            debug: false,
            verbose: false,
            silent: true
          };

          // NOTE: We intentionally do NOT set organizationId/projectId at client level
          // because client-level settings override per-request parameters, preventing
          // environment variable fallbacks and tool parameter overrides from working

          this.cloudClient = new MemoryClient(clientOptions);
          console.error("Cloud client initialized successfully with options:", {
            hasApiKey: !!mem0ApiKey,
            hasDefaultAppId: !!defaultAppId,
            hasDefaultAgentId: !!defaultAgentId
          });
          this.isReady = true;
        } catch (error) {
          console.error("Error in cloud client initialization:", error);
        }
      }).catch(error => {
        console.error("Error initializing cloud client:", error);
        process.exit(1);
      });
    } else if (supabaseUrl && supabaseKey) {
      console.error("Using Supabase storage mode with SUPABASE_URL and SUPABASE_KEY");
      this.isSupabaseMode = true;

      try {
        // Initialize Supabase client with vector store and history store
        // Using exact configuration format from mem0 docs
        const supabaseConfig = {
          vectorStore: {
            provider: "supabase",
            config: {
              collectionName: "memories",
              embeddingModelDims: 1536,
              supabaseUrl: supabaseUrl,
              supabaseKey: supabaseKey,
              tableName: "memories",
            },
          },
          historyStore: {
            provider: 'supabase',
            config: {
              supabaseUrl: supabaseUrl,
              supabaseKey: supabaseKey,
              tableName: 'memory_history',
            },
          },
          // Embedder configuration for OpenAI
          embedder: {
            provider: 'openai',
            config: {
              apiKey: process.env.OPENAI_API_KEY,
              model: 'text-embedding-3-small',
            },
          },
        };

        this.supabaseClient = new Memory(supabaseConfig);
        console.error("Supabase client initialized successfully");
        this.isReady = true;
      } catch (error) {
        console.error("Error initializing Supabase client:", error);
        process.exit(1);
      }
    } else if (openaiApiKey) {
      console.error("Using local in-memory storage mode with OPENAI_API_KEY");
      this.isCloudMode = false;

      try {
        // Initialize with silent options if available
        this.localClient = new Memory({
          vectorStore: {
            provider: "memory",
            config: {
              collectionName: "mem0_default_collection"
            }
          }
          // Add silent options if supported by the mem0ai library
          // Options like debug, silent, verbose don't exist in the type but might be supported at runtime
        });
        console.error("Local client initialized successfully");
        this.isReady = true;
      } catch (error) {
        console.error("Error initializing local client:", error);
        process.exit(1);
      }
    } else {
      console.error("Error: One of the following must be provided:");
      console.error("  - MEM0_API_KEY (for Mem0 cloud storage)");
      console.error("  - SUPABASE_URL + SUPABASE_KEY (for Supabase storage)");
      console.error("  - OPENAI_API_KEY (for local in-memory storage)");
      process.exit(1);
    }

    process.on('SIGINT', async () => {
      console.error("Received SIGINT signal, shutting down...");
      // Restore original console.log before exit
      safeLogger.restore();
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error("Received SIGTERM signal, shutting down...");
      // Restore original console.log before exit
      safeLogger.restore();
      await this.server.close();
      process.exit(0);
    });

    // Cleanup on uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error("Uncaught exception:", error);
      // Restore original console.log before exit
      safeLogger.restore();
      process.exit(1);
    });
  }

  /**
   * Sets up handlers for MCP tool-related requests.
   */
  private setupToolHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "add_memory",
            description: "Stores a piece of text as a memory in Mem0.",
            inputSchema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "The text content to store as memory.",
                },
                userId: {
                  type: "string",
                  description: "User ID to associate with the memory. If not provided, uses DEFAULT_USER_ID environment variable.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to associate with the memory.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID - identifies the LLM/agent making the tool call. If not provided, uses DEFAULT_AGENT_ID environment variable.",
                },
                appId: {
                  type: "string",
                  description: "Optional app ID - application identifier (legacy parameter). If not provided, uses DEFAULT_APP_ID environment variable.",
                },
                projectId: {
                  type: "string",
                  description: "Optional project ID - for mem0 Pro plan project organization (e.g., proj_ABC123). If not provided, uses DEFAULT_PROJECT_ID environment variable.",
                },
                orgId: {
                  type: "string",
                  description: "Optional organization ID - for mem0 organization-level management. If not provided, uses DEFAULT_ORG_ID environment variable.",
                },
                metadata: {
                  type: "object",
                  description: "Optional key-value metadata.",
                },
                includes: {
                  type: "string",
                  description: "Optional specific preferences to include in the memory (for cloud API).",
                },
                excludes: {
                  type: "string",
                  description: "Optional specific preferences to exclude from the memory (for cloud API).",
                },
                infer: {
                  type: "boolean",
                  description: "Optional whether to infer memories or directly store messages (default: true, for cloud API).",
                },
                outputFormat: {
                  type: "string",
                  description: "Optional format version, either v1.0 (deprecated) or v1.1 (recommended, for cloud API).",
                },
                customCategories: {
                  type: "object",
                  description: "Optional list of categories with names and descriptions (for cloud API).",
                },
                customInstructions: {
                  type: "string",
                  description: "Optional project-specific guidelines for handling and organizing memories (for cloud API).",
                },
                immutable: {
                  type: "boolean",
                  description: "Optional whether the memory is immutable (default: false, for cloud API).",
                },
                expirationDate: {
                  type: "string",
                  description: "Optional when the memory will expire (format: YYYY-MM-DD, for cloud API).",
                },
              },
              required: ["content"],
            },
          },
          {
            name: "search_memory",
            description: "Searches stored memories in Mem0 based on a query.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query.",
                },
                userId: {
                  type: "string",
                  description: "User ID to filter search. If not provided, uses DEFAULT_USER_ID environment variable.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to filter search.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID - identifies the LLM/agent making the tool call. If not provided, uses DEFAULT_AGENT_ID environment variable.",
                },
                appId: {
                  type: "string",
                  description: "Optional app ID - application identifier (legacy parameter). If not provided, uses DEFAULT_APP_ID environment variable.",
                },
                projectId: {
                  type: "string",
                  description: "Optional project ID - for mem0 Pro plan project organization (e.g., proj_ABC123). If not provided, uses DEFAULT_PROJECT_ID environment variable.",
                },
                orgId: {
                  type: "string",
                  description: "Optional organization ID - for mem0 organization-level management. If not provided, uses DEFAULT_ORG_ID environment variable.",
                },
                filters: {
                  type: "object",
                  description: "Optional key-value filters for metadata.",
                },
                threshold: {
                  type: "number",
                  description: "Optional similarity threshold for results (for cloud API).",
                },
                topK: {
                  type: "number",
                  description: "Optional number of top results to return (default: 10, for cloud API).",
                },
                fields: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional specific fields to include in the response (for cloud API).",
                },
                rerank: {
                  type: "boolean",
                  description: "Optional whether to rerank the memories (default: false, for cloud API).",
                },
                keywordSearch: {
                  type: "boolean",
                  description: "Optional whether to search based on keywords (default: false, for cloud API).",
                },
                filterMemories: {
                  type: "boolean",
                  description: "Optional whether to filter the memories (default: false, for cloud API).",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "delete_memory",
            description: "Deletes a specific memory by ID from Mem0.",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: {
                  type: "string",
                  description: "The unique ID of the memory to delete.",
                },
                userId: {
                  type: "string",
                  description: "User ID associated with the memory. If not provided, uses DEFAULT_USER_ID environment variable.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID - identifies the LLM/agent making the tool call. If not provided, uses DEFAULT_AGENT_ID environment variable.",
                },
                appId: {
                  type: "string",
                  description: "Optional app ID - application identifier (legacy parameter). If not provided, uses DEFAULT_APP_ID environment variable.",
                },
                projectId: {
                  type: "string",
                  description: "Optional project ID - for mem0 Pro plan project organization (e.g., proj_ABC123). If not provided, uses DEFAULT_PROJECT_ID environment variable.",
                },
                orgId: {
                  type: "string",
                  description: "Optional organization ID - for mem0 organization-level management. If not provided, uses DEFAULT_ORG_ID environment variable.",
                },
              },
              required: ["memoryId"],
            },
          },
        ],
      };
    });

    // Handler for call tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.isReady) {
        throw new McpError(ErrorCode.InternalError, "Memory client is still initializing. Please try again in a moment.");
      }

      try {
        const { name } = request.params;
        const args = request.params.arguments || {};

        if (name === "add_memory") {
          const toolArgs = args as unknown as Mem0AddToolArgs;
          return await this.handleAddMemory(toolArgs);
        } else if (name === "search_memory") {
          const toolArgs = args as unknown as Mem0SearchToolArgs;
          return await this.handleSearchMemory(toolArgs);
        } else if (name === "delete_memory") {
          const toolArgs = args as unknown as Mem0DeleteToolArgs;
          return await this.handleDeleteMemory(toolArgs);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }

        console.error(`Error executing tool:`, error);
        throw new McpError(ErrorCode.InternalError, `Error executing tool: ${error.message || 'Unknown error'}`);
      }
    });
  }

  /**
   * Handles adding a memory using either local or cloud client.
   */
  private async handleAddMemory(args: Mem0AddToolArgs): Promise<any> {
    const {
      content, userId, sessionId, agentId, appId, projectId, orgId, metadata,
      includes, excludes, infer, outputFormat, customCategories,
      customInstructions, immutable, expirationDate
    } = args;

    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: content");
    }

    // Use DEFAULT_USER_ID as fallback if userId is not provided
    const finalUserId = userId || process.env.DEFAULT_USER_ID;
    if (!finalUserId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId (and no DEFAULT_USER_ID environment variable set)");
    }

    console.error(`Adding memory for user ${finalUserId}`);

    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get all parameters - parameter takes precedence over environment
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;

        console.error(`Parameter resolution:`);
        console.error(`  Input: agentId=${agentId}, appId=${appId}, projectId=${projectId}, orgId=${orgId}`);
        console.error(`  Environment: DEFAULT_AGENT_ID=${process.env.DEFAULT_AGENT_ID}, DEFAULT_APP_ID=${process.env.DEFAULT_APP_ID}, DEFAULT_PROJECT_ID=${process.env.DEFAULT_PROJECT_ID}, DEFAULT_ORG_ID=${process.env.DEFAULT_ORG_ID}`);
        console.error(`  Final: finalAgentId=${finalAgentId}, finalAppId=${finalAppId}, finalProjectId=${finalProjectId}, finalOrgId=${finalOrgId}`);

        // Format message for the cloud API
        const messages: Mem0Message[] = [{
          role: "user",
          content
        }];

        // Cloud API options - using snake_case for API parameters
        // Note: Mem0 docs recommend version="v2" for add operations (v1 is deprecated)
        const options: any = {
          user_id: finalUserId,
          version: "v2"
        };

        // Add all parameters if available (using snake_case for API)
        if (finalAppId) options.app_id = finalAppId;
        if (finalAgentId) options.agent_id = finalAgentId;
        if (finalProjectId) options.project_id = finalProjectId;
        if (finalOrgId) options.org_id = finalOrgId;

        // Map sessionId to run_id (using snake_case)
        if (sessionId) options.run_id = sessionId;
        if (metadata) options.metadata = metadata;

        console.error(`API call options:`, JSON.stringify(options, null, 2));

        // Add advanced Mem0 API parameters (using snake_case)
        if (includes) options.includes = includes;
        if (excludes) options.excludes = excludes;
        if (infer !== undefined) options.infer = infer;
        if (outputFormat) options.output_format = outputFormat;
        if (customCategories) options.custom_categories = customCategories;
        if (customInstructions) options.custom_instructions = customInstructions;
        if (immutable !== undefined) options.immutable = immutable;
        if (expirationDate) options.expiration_date = expirationDate;

        // API call - try direct REST API approach first for better parameter support
        let result;
        let usedDirectAPI = false;

        // Always try direct REST API first when app_id or run_id are provided
        if (finalAppId || sessionId) {
          console.error("Using direct REST API due to app_id or run_id parameters");
          try {
            const apiUrl = 'https://api.mem0.ai/v1/memories/';
            const requestBody = {
              messages: messages,
              ...options
            };

            console.error("Making direct API call with body:", JSON.stringify(requestBody, null, 2));

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${process.env.MEM0_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Direct API call failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            result = await response.json();
            usedDirectAPI = true;
            console.error("Memory added successfully using direct REST API");
          } catch (directError: any) {
            console.error("Direct API call failed, falling back to SDK:", directError.message);
            // Fall through to SDK attempt
          }
        }

        // Try SDK if direct API wasn't used or failed
        if (!usedDirectAPI) {
          try {
            result = await this.cloudClient.add(messages, options);
            console.error("Memory added successfully using cloud API SDK");
          } catch (sdkError: any) {
            console.error("SDK method failed:", sdkError.message);
            throw sdkError;
          }
        }

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
        console.error("Error adding memory using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error adding memory: ${error.message}`);
      }
    } else if (this.isSupabaseMode && this.supabaseClient) {
      try {
        // Format message for the Supabase storage API
        const messages: Mem0Message[] = [{
          role: "user",
          content
        }];

        // Supabase storage options - using camelCase for local SDK
        const options: any = {
          userId: finalUserId,
          sessionId,
          metadata
        };

        // Add all parameters if available
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;
        if (finalAppId) options.appId = finalAppId;
        if (finalAgentId) options.agentId = finalAgentId;
        if (finalProjectId) options.projectId = finalProjectId;
        if (finalOrgId) options.orgId = finalOrgId;

        console.error(`Adding memory to Supabase for user ${finalUserId}`);

        // API call
        const result = await this.supabaseClient.add(messages, options);

        console.error("Memory added successfully using Supabase storage");

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
        console.error("Error adding memory using Supabase storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error adding memory: ${error.message}`);
      }
    } else if (this.localClient) {
      try {
        // Format message for the local storage API
        const messages: Mem0Message[] = [{
          role: "user",
          content
        }];

        // Local storage options - using camelCase
        const options: any = {
          userId: finalUserId,
          sessionId,
          metadata
        };

        // API call
        const result = await this.localClient.add(messages, options);

        console.error("Memory added successfully using local storage");

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
        console.error("Error adding memory using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error adding memory: ${error.message}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }

  /**
   * Handles searching memories using either local or cloud client.
   */
  private async handleSearchMemory(args: Mem0SearchToolArgs): Promise<any> {
    const {
      query, userId, sessionId, agentId, appId, projectId, orgId, filters, threshold,
      topK, fields, rerank, keywordSearch, filterMemories
    } = args;

    if (!query) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: query");
    }

    // Use DEFAULT_USER_ID as fallback if userId is not provided
    const finalUserId = userId || process.env.DEFAULT_USER_ID;
    if (!finalUserId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId (and no DEFAULT_USER_ID environment variable set)");
    }

    console.error(`Searching memories for query "${query}" and user ${finalUserId}`);

    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get all parameters - parameter takes precedence over environment
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;

        // Cloud API options - using snake_case for API parameters
        // Note: Search operations don't use version parameter (only for add operations)
        const options: any = {
          user_id: finalUserId
        };

        // Add all parameters if available (using snake_case)
        if (finalAppId) options.app_id = finalAppId;
        if (finalAgentId) options.agent_id = finalAgentId;
        if (finalProjectId) options.project_id = finalProjectId;
        if (finalOrgId) options.org_id = finalOrgId;

        // Map sessionId to run_id and other parameters (using snake_case)
        if (sessionId) options.run_id = sessionId;
        if (filters) options.filters = filters;

        // Only add threshold if it's a valid number (not null or undefined)
        if (threshold !== undefined && threshold !== null) {
          options.threshold = threshold;
        }
        // Don't set a default threshold - let the API use its own defaults

        // Add advanced search parameters (using snake_case)
        if (topK !== undefined) options.top_k = topK;
        if (fields) options.fields = fields;
        if (rerank !== undefined) options.rerank = rerank;
        if (keywordSearch !== undefined) options.keyword_search = keywordSearch;
        if (filterMemories !== undefined) options.filter_memories = filterMemories;

        // API call - try direct REST API approach first for better parameter support
        let results;
        let usedDirectAPI = false;

        // Always try direct REST API first when app_id or run_id are provided
        if (finalAppId || sessionId) {
          console.error("Using direct REST API for search due to app_id or run_id parameters");
          try {
            const apiUrl = 'https://api.mem0.ai/v1/memories/search';
            const requestBody = {
              query: query,
              ...options
            };

            console.error("Making direct search API call with body:", JSON.stringify(requestBody, null, 2));

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${process.env.MEM0_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Direct search API call failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            results = await response.json();
            usedDirectAPI = true;
            console.error("Search completed successfully using direct REST API");
          } catch (directError: any) {
            console.error("Direct search API call failed, falling back to SDK:", directError.message);
            // Fall through to SDK attempt
          }
        }

        // Try SDK if direct API wasn't used or failed
        if (!usedDirectAPI) {
          try {
            results = await this.cloudClient.search(query, options);
            console.error("Search completed successfully using cloud API SDK");
          } catch (sdkError: any) {
            console.error("SDK search method failed:", sdkError.message);
            throw sdkError;
          }
        }

        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];
        console.error(`Found ${resultsArray.length} memories using cloud API`);

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
        console.error("Error searching memories using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error searching memories: ${error.message}`);
      }
    } else if (this.isSupabaseMode && this.supabaseClient) {
      try {
        // Get all parameters - parameter takes precedence over environment
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;

        // Supabase storage options - using camelCase for local SDK
        const options: any = {
          userId: finalUserId,
          sessionId,
          filters
        };

        // Add all parameters if available
        if (finalAppId) options.appId = finalAppId;
        if (finalAgentId) options.agentId = finalAgentId;
        if (finalProjectId) options.projectId = finalProjectId;
        if (finalOrgId) options.orgId = finalOrgId;

        console.error(`Searching Supabase memories for query "${query}" and user ${finalUserId}`);

        // API call
        const results = await this.supabaseClient.search(query, options);

        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];
        console.error(`Found ${resultsArray.length} memories using Supabase storage`);

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
        console.error("Error searching memories using Supabase storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error searching memories: ${error.message}`);
      }
    } else if (this.localClient) {
      try {
        // Local storage options
        const options: any = {
          userId: finalUserId,
          sessionId,
          filters
        };

        // API call
        const results = await this.localClient.search(query, options);

        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];
        console.error(`Found ${resultsArray.length} memories using local storage`);

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
        console.error("Error searching memories using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error searching memories: ${error.message}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }

  /**
   * Handles deleting a memory using either local or cloud client.
   */
  private async handleDeleteMemory(args: Mem0DeleteToolArgs): Promise<any> {
    const { memoryId, userId, agentId, appId, projectId, orgId } = args;

    if (!memoryId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: memoryId");
    }

    // Use DEFAULT_USER_ID as fallback if userId is not provided
    const finalUserId = userId || process.env.DEFAULT_USER_ID;
    if (!finalUserId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId (and no DEFAULT_USER_ID environment variable set)");
    }

    console.error(`Attempting to delete memory with ID ${memoryId} for user ${finalUserId}`);

    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get all parameters - parameter takes precedence over environment
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;

        // Cloud API options - using snake_case for API parameters
        // Note: Delete memory uses v1 API, no version parameter needed
        const options: any = {
          memory_id: memoryId,
          user_id: finalUserId
        };

        // Add all parameters if available (using snake_case)
        if (finalAppId) options.app_id = finalAppId;
        if (finalAgentId) options.agent_id = finalAgentId;
        if (finalProjectId) options.project_id = finalProjectId;
        if (finalOrgId) options.org_id = finalOrgId;

        // Try to use the API's deleteMemory method through the client
        try {
          // @ts-ignore - We'll try to access this method even if TypeScript doesn't recognize it
          await this.cloudClient.deleteMemory(memoryId);
          console.error(`Memory ${memoryId} deleted successfully using cloud API's deleteMemory`);
        } catch (innerError) {
          // If that fails, try to use a generic request method
          console.error("Using fallback delete method for cloud API");
          await fetch(`https://api.mem0.ai/v1/memories/${memoryId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Token ${process.env.MEM0_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
          });
          console.error(`Memory ${memoryId} deleted successfully using direct API request`);
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        console.error("Error deleting memory using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message}`);
      }
    } else if (this.isSupabaseMode && this.supabaseClient) {
      try {
        // For Supabase storage, try to use the deleteMemory method
        try {
          // @ts-ignore - We'll try to access this method even if TypeScript doesn't recognize it
          await this.supabaseClient.deleteMemory(memoryId);
          console.error(`Memory ${memoryId} deleted successfully using Supabase storage deleteMemory`);
        } catch (innerError) {
          // If direct method fails, try to access through any internal methods
          console.error("Using fallback delete method for Supabase storage");

          // @ts-ignore - Accessing potentially private properties
          if (this.supabaseClient._vectorstore && typeof this.supabaseClient._vectorstore.delete === 'function') {
            // @ts-ignore
            await this.supabaseClient._vectorstore.delete({ ids: [memoryId] });
            console.error(`Memory ${memoryId} deleted successfully using Supabase vectorstore delete`);
          } else {
            throw new Error("Supabase client does not support memory deletion");
          }
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        console.error("Error deleting memory using Supabase storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message || "Supabase client does not support memory deletion"}`);
      }
    } else if (this.localClient) {
      try {
        // For local storage, we need to find a way to delete the memory
        // Since we don't have direct access to deleteMemory, we'll try to access it indirectly

        try {
          // @ts-ignore - We'll try to access this method even if TypeScript doesn't recognize it
          await this.localClient.deleteMemory(memoryId);
          console.error(`Memory ${memoryId} deleted successfully using local storage deleteMemory`);
        } catch (innerError) {
          // If direct method fails, try to access through any internal methods
          console.error("Using fallback delete method for local storage");

          // @ts-ignore - Accessing potentially private properties
          if (this.localClient._vectorstore && typeof this.localClient._vectorstore.delete === 'function') {
            // @ts-ignore
            await this.localClient._vectorstore.delete({ ids: [memoryId] });
            console.error(`Memory ${memoryId} deleted successfully using vectorstore delete`);
          } else {
            throw new Error("Local client does not support memory deletion");
          }
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        console.error("Error deleting memory using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message || "Local client does not support memory deletion"}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }

  /**
   * Starts the MCP server.
   */
  public async start(): Promise<void> {
    console.error("Starting Mem0 MCP Server...");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Mem0 MCP Server is running.");
  }
}

// Start the server
const server = new Mem0MCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  // Restore original console.log before exit
  safeLogger.restore();
  process.exit(1);
});
