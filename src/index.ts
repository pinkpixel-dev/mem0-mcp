#!/usr/bin/env node

/**
 * MCP server for interacting with Mem0.ai memory storage.
 * Provides tools to add and search memories.
 * 
 * Supports two modes:
 * 1. Cloud mode: Uses Mem0's hosted API with MEM0_API_KEY
 * 2. Local mode: Uses in-memory storage with OPENAI_API_KEY for embeddings
 */

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
    console.log("Initializing Mem0 MCP Server...");
    
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
      console.log("Using Mem0 cloud storage mode with MEM0_API_KEY");
      this.isCloudMode = true;
      
      // Dynamic import for cloud client
      import('mem0ai').then(module => {
        MemoryClient = module.default;
        // Get organization and project IDs
        const orgId = process.env.YOUR_ORG_ID || process.env.ORG_ID;
        const projectId = process.env.YOUR_PROJECT_ID || process.env.PROJECT_ID;
        
        // Initialize with all available options
        const clientOptions: any = { 
          apiKey: mem0ApiKey
        };
        
        // Add org and project IDs if available
        if (orgId) clientOptions.org_id = orgId;
        if (projectId) clientOptions.project_id = projectId;
        
        this.cloudClient = new MemoryClient(clientOptions);
        console.log("Cloud client initialized successfully with options:", { 
          hasApiKey: !!mem0ApiKey,
          hasOrgId: !!orgId, 
          hasProjectId: !!projectId 
        });
        this.isReady = true;
      }).catch(error => {
        console.error("Error initializing cloud client:", error);
        process.exit(1);
      });
    } else if (openaiApiKey) {
      console.log("Using local in-memory storage mode with OPENAI_API_KEY");
      this.isCloudMode = false;
      
      try {
        this.localClient = new Memory({
          vectorStore: {
            provider: "memory",
            config: {
              collectionName: "mem0_default_collection"
            }
          }
        });
        console.log("Local client initialized successfully");
        this.isReady = true;
      } catch (error) {
        console.error("Error initializing local client:", error);
        process.exit(1);
      }
    } else {
      console.error("Error: Either MEM0_API_KEY (for cloud storage) or OPENAI_API_KEY (for local storage) must be provided.");
      process.exit(1);
    }
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
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

    console.log(`Adding memory for user ${userId}`);
    
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
        
        // API call with correct parameters order
        const result = await this.cloudClient.add(messages, options);
        console.log("Memory added successfully using cloud API");
        
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
        
        // API call with correct parameters
        const result = await this.localClient.add(messages, options);
        
        console.log("Memory added successfully using local storage");
        
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

    console.log(`Searching memories for query "${query}" and user ${userId}`);
    
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
        
        if (agentId) options.agent_id = agentId;
        if (filters) options.filters = filters;
        if (threshold !== undefined) options.threshold = threshold;
        
        // API call with correct parameters order: query, options
        const results = await this.cloudClient.search(query, options);
        
        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];
        console.log(`Found ${resultsArray.length} memories using cloud API`);
        
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
        
        // API call with correct parameters: query, options
        const results = await this.localClient.search(query, options);
        
        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];
        console.log(`Found ${resultsArray.length} memories using local storage`);
        
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
   * Starts the MCP server.
   */
  public async start(): Promise<void> {
    console.log("Starting Mem0 MCP Server...");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Mem0 MCP Server is running.");
  }
}

// Start the server
const server = new Mem0MCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
