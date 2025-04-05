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

import { Memory } from "mem0ai/oss"; // For local in-memory storage
// Using dynamic import for cloud API to avoid TypeScript issues
let MemoryClient: any = null;

// Type for the arguments received by the MCP tool handlers
type Mem0AddToolArgs = {
  content: string;
  userId: string;
  sessionId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
};

type Mem0SearchToolArgs = {
  query: string;
  userId: string;
  sessionId?: string;
  agentId?: string;
  filters?: Record<string, any>;
  threshold?: number;
};

type Mem0DeleteToolArgs = {
  memoryId: string;
  userId: string;
  sessionId?: string;
  agentId?: string;
};

type Mem0CreateExportToolArgs = {
  userId: string;
  sessionId?: string;
  runId?: string;
  appId?: string;
  agentId?: string;
  schema?: Record<string, any>;
  orgId?: string;
  projectId?: string;
};

type Mem0GetExportToolArgs = {
  userId: string;
  sessionId?: string;
  runId?: string;
  appId?: string;
  agentId?: string;
  orgId?: string;
  projectId?: string;
};

// Message type for Mem0 API
type Mem0Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

class Mem0MCPServer {
  private server: Server;
  private isCloudMode: boolean = false;
  private localClient?: Memory;
  private cloudClient?: any;
  private isReady: boolean = false;

  constructor() {
    console.error("Initializing Mem0 MCP Server...");
    
    // Check for Mem0 API key first (for cloud mode)
    const mem0ApiKey = process.env.MEM0_API_KEY;
    
    // Check for OpenAI API key (for local mode)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Initialize MCP Server
    this.server = new Server(
      {
        // These should match package.json
        name: "@pinkpixel/mem0-mcp",
        version: "0.1.7",
      },
      {
        capabilities: {
          // Only tools capability needed for now
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Determine the mode based on available keys
    if (mem0ApiKey) {
      console.error("Using Mem0 cloud storage mode with MEM0_API_KEY");
      this.isCloudMode = true;
      
      // Dynamic import for cloud client
      import('mem0ai').then(module => {
        try {
          MemoryClient = module.default;
          // Get organization and project IDs
          const orgId = process.env.YOUR_ORG_ID || process.env.ORG_ID;
          const projectId = process.env.YOUR_PROJECT_ID || process.env.PROJECT_ID;
          
          // Initialize with all available options
          const clientOptions: any = { 
            apiKey: mem0ApiKey,
            // Disable debug logs in the client if possible
            debug: false,
            verbose: false,
            silent: true
          };
          
          // Add org and project IDs if available
          if (orgId) clientOptions.org_id = orgId;
          if (projectId) clientOptions.project_id = projectId;
          
          this.cloudClient = new MemoryClient(clientOptions);
          console.error("Cloud client initialized successfully with options:", { 
            hasApiKey: !!mem0ApiKey,
            hasOrgId: !!orgId, 
            hasProjectId: !!projectId 
          });
          this.isReady = true;
        } catch (error) {
          console.error("Error in cloud client initialization:", error);
        }
      }).catch(error => {
        console.error("Error initializing cloud client:", error);
        process.exit(1);
      });
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
      } catch (error: any) {
        console.error("Error initializing local client:", error);
        process.exit(1);
      }
    } else {
      console.error("Error: Either MEM0_API_KEY (for cloud storage) or OPENAI_API_KEY (for local storage) must be provided.");
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
                  description: "User ID to associate with the memory.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to associate with the memory.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID to associate with the memory (for cloud API).",
                },
                metadata: {
                  type: "object",
                  description: "Optional key-value metadata.",
                },
              },
              required: ["content", "userId"],
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
                  description: "User ID to filter search.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to filter search.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID to filter search (for cloud API).",
                },
                filters: {
                  type: "object",
                  description: "Optional key-value filters for metadata.",
                },
                threshold: {
                  type: "number",
                  description: "Optional similarity threshold for results (for cloud API).",
                },
              },
              required: ["query", "userId"],
            },
          },
          {
            name: "delete_memory",
            description: "Deletes a specific memory from Mem0 by ID.",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: {
                  type: "string",
                  description: "The unique ID of the memory to delete.",
                },
                userId: {
                  type: "string",
                  description: "User ID associated with the memory.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID associated with the memory.",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID associated with the memory (for cloud API).",
                },
              },
              required: ["memoryId", "userId"],
            },
          },
          {
            name: "create_memory_export",
            description: "Creates a structured export of memories based on filters.",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID to filter memories for export.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to filter memories for export.",
                },
                runId: {
                  type: "string",
                  description: "Optional run ID to filter memories for export (alias for sessionId in cloud API).",
                },
                appId: {
                  type: "string",
                  description: "Optional app ID to filter memories for export (cloud API only).",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID to filter memories for export (cloud API only).",
                },
                schema: {
                  type: "object",
                  description: "Optional schema definition for the export (cloud API only).",
                },
                orgId: {
                  type: "string", 
                  description: "Optional organization ID for filtering memories (cloud API only)."
                },
                projectId: {
                  type: "string",
                  description: "Optional project ID for filtering memories (cloud API only)."
                }
              },
              required: ["userId"],
            },
          },
          {
            name: "get_memory_export",
            description: "Retrieves the latest memory export based on filters.",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID to filter the export.",
                },
                sessionId: {
                  type: "string",
                  description: "Optional session ID to filter the export.",
                },
                runId: {
                  type: "string",
                  description: "Optional run ID to filter the export (alias for sessionId in cloud API).",
                },
                appId: {
                  type: "string",
                  description: "Optional app ID to filter the export (cloud API only).",
                },
                agentId: {
                  type: "string",
                  description: "Optional agent ID to filter the export (cloud API only).",
                },
                orgId: {
                  type: "string", 
                  description: "Optional organization ID for filtering the export (cloud API only)."
                },
                projectId: {
                  type: "string",
                  description: "Optional project ID for filtering the export (cloud API only)."
                }
              },
              required: ["userId"],
            },
          }
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
        } else if (name === "create_memory_export") {
          const toolArgs = args as unknown as Mem0CreateExportToolArgs;
          return await this.handleCreateMemoryExport(toolArgs);
        } else if (name === "get_memory_export") {
          const toolArgs = args as unknown as Mem0GetExportToolArgs;
          return await this.handleGetMemoryExport(toolArgs);
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
    const { content, userId, sessionId, agentId, metadata } = args;

    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: content");
    }

    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId");
    }

    console.error(`Adding memory for user ${userId}`);
    
    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get organization and project IDs
        const orgId = process.env.YOUR_ORG_ID || process.env.ORG_ID;
        const projectId = process.env.YOUR_PROJECT_ID || process.env.PROJECT_ID;
        
        // Format message for the cloud API
        const messages: Mem0Message[] = [{ 
          role: "user", 
          content 
        }];
        
        // Cloud API options - using snake_case
        const options: any = {
          user_id: userId,
          version: "v2"
        };
        
        // Add organization and project IDs if available
        if (orgId) options.org_id = orgId;
        if (projectId) options.project_id = projectId;
        
        if (sessionId) options.run_id = sessionId;
        if (agentId) options.agent_id = agentId;
        if (metadata) options.metadata = metadata;
        
        // API call
        const result = await this.cloudClient.add(messages, options);
        console.error("Memory added successfully using cloud API");
        
        return {
          content: [{ type: "text", text: `Memory added successfully` }],
        };
      } catch (error: any) {
        console.error("Error adding memory using cloud API:", error);
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
          userId,
          sessionId,
          metadata
        };
        
        // API call
        const result = await this.localClient.add(messages, options);
        
        console.error("Memory added successfully using local storage");
        
        return {
          content: [{ type: "text", text: `Memory added successfully` }],
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
    const { query, userId, sessionId, agentId, filters, threshold } = args;

    if (!query) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: query");
    }

    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId");
    }

    console.error(`Searching memories for query "${query}" and user ${userId}`);
    
    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get organization and project IDs
        const orgId = process.env.YOUR_ORG_ID || process.env.ORG_ID;
        const projectId = process.env.YOUR_PROJECT_ID || process.env.PROJECT_ID;
        
        // Cloud API options
        const options: any = {
          user_id: userId,
          version: "v2"
        };
        
        // Add organization and project IDs if available
        if (orgId) options.org_id = orgId;
        if (projectId) options.project_id = projectId;
        
        // Map sessionId to run_id for Mem0 API compatibility
        if (sessionId) options.run_id = sessionId;
        if (agentId) options.agent_id = agentId;
        if (filters) options.filters = filters;
        if (threshold !== undefined) options.threshold = threshold;
        
        // API call
        const results = await this.cloudClient.search(query, options);
        
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
    } else if (this.localClient) {
      try {
        // Local storage options
        const options: any = {
          userId,
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
   * Handles deleting a memory by ID using either local or cloud client.
   */
  private async handleDeleteMemory(args: Mem0DeleteToolArgs): Promise<any> {
    const { memoryId, userId, sessionId, agentId } = args;

    if (!memoryId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: memoryId");
    }

    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId");
    }

    console.error(`Deleting memory with ID ${memoryId} for user ${userId}`);
    
    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get organization and project IDs
        const orgId = process.env.YOUR_ORG_ID || process.env.ORG_ID;
        const projectId = process.env.YOUR_PROJECT_ID || process.env.PROJECT_ID;
        
        // Cloud API options - using snake_case
        const options: any = {
          user_id: userId,
          version: "v2"
        };
        
        // Add organization and project IDs if available
        if (orgId) options.org_id = orgId;
        if (projectId) options.project_id = projectId;
        
        // Map sessionId to run_id for Mem0 API compatibility
        if (sessionId) options.run_id = sessionId;
        if (agentId) options.agent_id = agentId;
        
        // API call - pass memoryId as first parameter and options as second
        await this.cloudClient.delete(memoryId, options);
        console.error(`Memory ${memoryId} deleted successfully using cloud API`);
        
        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        console.error("Error deleting memory using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message}`);
      }
    } else if (this.localClient) {
      try {
        // The local client's delete method only takes memoryId as a parameter
        await this.localClient.delete(memoryId);
        
        console.error(`Memory ${memoryId} deleted successfully using local storage`);
        
        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        console.error("Error deleting memory using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }

  /**
   * Handles creating a memory export using cloud or local client.
   */
  private async handleCreateMemoryExport(args: Mem0CreateExportToolArgs): Promise<any> {
    const { userId, sessionId, runId, appId, agentId, schema, orgId, projectId } = args;

    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId");
    }

    console.error(`Creating memory export for user ${userId}`);
    
    if (this.isCloudMode && this.cloudClient) {
      try {
        // Cloud API options
        const requestBody: any = {
          // Default schema if none provided
          schema: schema || {
            type: "object",
            properties: {
              memory: { type: "string" },
              user_id: { type: "string" },
              created_at: { type: "string" },
              updated_at: { type: "string" },
              metadata: { type: "object" }
            }
          },
          user_id: userId
        };
        
        // Add IDs if available
        if (orgId) requestBody.org_id = orgId;
        if (projectId) requestBody.project_id = projectId;
        
        // Handle session/run ID (prefer runId for cloud API, but use sessionId as fallback)
        if (runId) requestBody.run_id = runId;
        else if (sessionId) requestBody.session_id = sessionId;
        
        if (appId) requestBody.app_id = appId;
        
        // API call to create export - Use the base client, not assuming .exports exists
        // Try different approaches as the API might be accessed differently
        let result;
        try {
          // Try method 1: exports as a separate method
          if (typeof this.cloudClient.createExport === 'function') {
            result = await this.cloudClient.createExport(requestBody);
          } 
          // Try method 2: exports as a property with methods
          else if (this.cloudClient.exports && typeof this.cloudClient.exports.create === 'function') {
            result = await this.cloudClient.exports.create(requestBody);
          }
          // Try method 3: Direct HTTP request to /exports endpoint
          else {
            result = await this.cloudClient.request('POST', '/v1/exports', requestBody);
          }
        } catch (innerError: any) {
          console.error("First export method failed, trying alternate approach:", innerError);
          // Fallback: Try alternate method to invoke export creation
          result = await this.cloudClient.request('POST', '/v1/exports', requestBody);
        }
        
        console.error("Memory export created successfully using cloud API");
        
        return {
          content: [{ type: "text", text: `Memory export created successfully. ${result && result.message ? result.message : ''}` }],
          exportId: result && result.id ? result.id : null
        };
      } catch (error: any) {
        console.error("Error creating memory export using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error creating memory export: ${error.message}`);
      }
    } else if (this.localClient) {
      try {
        // Local storage implementation - attempt to create an export from in-memory data
        // This is a simplified version as the local client doesn't support exports natively
        
        // Options for local search
        const options: any = {
          userId,
        };
        
        if (sessionId) options.sessionId = sessionId;
        
        // Use search with empty query to get all memories matching filters
        let memories;
        try {
          memories = await this.localClient.get("");
        } catch (searchError) {
          // Fallback: Try using search instead if get is not available
          memories = await this.localClient.search("", options);
        }
        
        const memoryCount = Array.isArray(memories) ? memories.length : 0;
        console.error(`Memory export created successfully using local storage - found ${memoryCount} memories`);
        
        const exportId = `local-export-${userId}-${Date.now()}`;
        
        return {
          content: [{ 
            type: "text", 
            text: `Memory export created with ${memoryCount} memories. Note: In local storage mode, exports are created on-demand and not persisted.` 
          }],
          // Include export ID for retrieval
          exportId: exportId,
          id: exportId // Match cloud API response format
        };
      } catch (error: any) {
        console.error("Error creating memory export using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error creating memory export: ${error.message}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }
  
  /**
   * Handles retrieving a memory export using cloud or local client.
   */
  private async handleGetMemoryExport(args: Mem0GetExportToolArgs): Promise<any> {
    const { userId, sessionId, runId, appId, agentId, orgId, projectId } = args;

    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: userId");
    }

    console.error(`Retrieving memory export for user ${userId}`);
    
    if (this.isCloudMode && this.cloudClient) {
      try {
        // Cloud API options
        const params: any = {
          user_id: userId
        };
        
        // Add IDs if available
        if (orgId) params.org_id = orgId;
        if (projectId) params.project_id = projectId;
        
        // Handle session/run ID (prefer runId for cloud API, but use sessionId as fallback)
        if (runId) params.run_id = runId;
        else if (sessionId) params.session_id = sessionId;
        
        if (appId) params.app_id = appId;
        
        // API call to get latest export - Try different approaches as the API might be accessed differently
        let exportData;
        try {
          // Try method 1: getExport as a method
          if (typeof this.cloudClient.getExport === 'function') {
            exportData = await this.cloudClient.getExport(params);
          } 
          // Try method 2: exports as a property with methods
          else if (this.cloudClient.exports && typeof this.cloudClient.exports.get === 'function') {
            exportData = await this.cloudClient.exports.get(params);
          }
          // Try method 3: Direct HTTP request to /exports endpoint
          else {
            // Convert params to query string for GET request
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              queryParams.append(key, String(value));
            });
            exportData = await this.cloudClient.request('GET', `/v1/exports?${queryParams.toString()}`);
          }
        } catch (innerError: any) {
          console.error("First export retrieval method failed, trying alternate approach:", innerError);
          // Fallback: Try alternate method to retrieve export
          const queryParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            queryParams.append(key, String(value));
          });
          exportData = await this.cloudClient.request('GET', `/v1/exports?${queryParams.toString()}`);
        }
        
        const exportSize = Array.isArray(exportData) ? exportData.length : 0;
        console.error("Memory export retrieved successfully using cloud API");
        
        return {
          content: [{ 
            type: "text", 
            text: `Memory export retrieved successfully. Contains ${exportSize} memories.` 
          }],
          memories: exportData
        };
      } catch (error: any) {
        console.error("Error retrieving memory export using cloud API:", error);
        throw new McpError(ErrorCode.InternalError, `Error retrieving memory export: ${error.message}`);
      }
    } else if (this.localClient) {
      try {
        // Local storage implementation - recreate the export on-demand
        
        // Options for local search
        const options: any = {
          userId,
        };
        
        if (sessionId) options.sessionId = sessionId;
        
        // Use search with empty query to get all memories matching filters
        let memories;
        try {
          memories = await this.localClient.get("");
        } catch (searchError) {
          // Fallback: Try using search instead if get is not available
          memories = await this.localClient.search("", options);
        }
        
        const memoryCount = Array.isArray(memories) ? memories.length : 0;
        console.error(`Memory export retrieved successfully using local storage - found ${memoryCount} memories`);
        
        return {
          content: [{ 
            type: "text", 
            text: `Memory export retrieved with ${memoryCount} memories. Note: In local storage mode, exports are generated on-demand.` 
          }],
          memories: memories
        };
      } catch (error: any) {
        console.error("Error retrieving memory export using local storage:", error);
        throw new McpError(ErrorCode.InternalError, `Error retrieving memory export: ${error.message}`);
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
