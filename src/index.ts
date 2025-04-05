#!/usr/bin/env node

/**
 * MCP server for interacting with Mem0.ai memory storage.
 * Provides tools to add and search memories.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { Memory } from "mem0ai/oss"; // Import Memory class from oss submodule

// Type definitions matching the expected options objects for mem0 methods
type Mem0AddOptions = {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
};
type Mem0SearchOptions = {
  userId?: string;
  sessionId?: string;
  filters?: Record<string, any>;
};

// Type for the arguments received by the MCP tool handlers
// Ensure properties match the inputSchema (camelCase)
type Mem0AddToolArgs = {
  content: string;
  userId: string; // Make userId required for the tool
  sessionId?: string;
  metadata?: Record<string, any>;
};
type Mem0SearchToolArgs = {
  query: string;
  userId?: string;
  sessionId?: string;
  filters?: Record<string, any>;
};

// Define the structure for messages array used by mem0Client.add
type Mem0Message = {
    role: "user" | "assistant"; // Add other roles if needed
    content: string;
};

class Mem0MCPServer {
  private server: Server; // Declare server property
  private mem0Client: Memory; // Declare mem0Client property

  constructor() {
    // Check for required environment variable for Mem0 internal LLM
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      process.exit(1); // Exit silently if key is missing
    }

    // Initialize Mem0 client with in-memory vector store
    this.mem0Client = new Memory({
      vectorStore: {
        provider: "memory",
        config: {
          collectionName: "mem0_default_collection"
        }
      }
    });

    // Initialize MCP Server
    this.server = new Server( // Initialize here
      {
        // These should match package.json
        name: "@pinkpixel/mem0-mcp", // Match updated package name
        version: "0.1.7",
      },
      {
        capabilities: {
          // Only tools capability needed for now
          tools: {},
        },
      }
    );

    this.setupToolHandlers(); // Call method setup

    // Basic error handling for the MCP server itself
    this.server.onerror = (_error: Error) => { }; // Silently handle errors
    process.on('SIGINT', async () => {
        await this.server.close();
        process.exit(0);
    });
  } // End of constructor

  /**
   * Sets up handlers for MCP tool-related requests.
   */
  private setupToolHandlers(): void { // Add return type void
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "add_memory", // Renamed
            description: "Stores a piece of text as a memory in Mem0.",
            inputSchema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "The text content to store as memory.",
                },
                userId: { // Use camelCase
                  type: "string",
                  description: "Optional user ID to associate with the memory.",
                },
                sessionId: { // Use camelCase
                  type: "string",
                  description: "Optional session ID to associate with the memory.",
                },
                metadata: {
                  type: "object",
                  description: "Optional key-value metadata.",
                },
              },
              required: ["content", "userId"], // Make userId required by the tool schema
            },
          },
          {
            name: "search_memory", // Renamed
            description: "Searches stored memories in Mem0 based on a query.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query.",
                },
                userId: { // Use camelCase
                  type: "string",
                  description: "Optional user ID to filter search.",
                },
                sessionId: { // Use camelCase
                  type: "string",
                  description: "Optional session ID to filter search.",
                },
                filters: {
                  type: "object",
                  description: "Optional key-value filters for metadata.",
                },
              },
              required: ["query", "userId"], // Make userId required again
            },
          },
        ],
      };
    });

    // Handler for executing tool calls
    // Add explicit type for request parameter
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => { // Let TS infer request type
      // Ensure arguments exist and provide a default empty object if not
      const args = request.params.arguments || {};

      try {
        switch (request.params.name) {
          case "add_memory": { // Renamed case
            // Extract args using the specific tool type
            const { content, userId, sessionId, metadata } = args as Mem0AddToolArgs; // userId is now guaranteed
            if (!content) {
              throw new McpError(ErrorCode.InvalidParams, "Missing required argument: content");
            }
            // Prepare arguments for mem0Client.add
            const messages: Mem0Message[] = [{ role: "user", content: content }]; // Wrap content in message array
            const options: Mem0AddOptions = { userId, sessionId, metadata }; // Pass the required userId

            // Call Mem0 add function
            const result = await this.mem0Client.add(messages, options);

            // Format result
            const resultText = typeof result === 'string' ? result : JSON.stringify(result);
            return {
              content: [{ type: "text", text: `Memory added successfully: ${resultText}` }],
            };
          }

          case "search_memory": { // Renamed case
             // Extract args using the specific tool type
             // Extract args using the specific tool type
            const { query, userId: argUserId, sessionId, filters } = args as Mem0SearchToolArgs; // Rename userId from args

            if (!query) {
              throw new McpError(ErrorCode.InvalidParams, "Missing required argument: query");
            }

            // Determine the effective userId
            const effectiveUserId = argUserId || process.env.DEFAULT_USER_ID; // Use arg first, then env var

            if (!effectiveUserId) {
              // Throw error if no userId is available from args or environment
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing user identifier. Provide 'userId' argument or set the DEFAULT_USER_ID environment variable."
              );
            }

             // Prepare arguments for mem0Client.search using the effectiveUserId
            const options: Mem0SearchOptions = { userId: effectiveUserId, sessionId, filters };

            // Call Mem0 search function
            const results = await this.mem0Client.search(query, options);

            // Format result
            return {
              content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error: any) { // Add explicit any type for caught error
          // Errors are handled by throwing McpError, no logging needed
          // Check if it's already an McpError
          if (error instanceof McpError) {
              throw error;
          }
          // Wrap other errors as InternalError
          throw new McpError(
              ErrorCode.InternalError,
              `Error executing tool ${request.params.name}: ${error.message || 'Unknown error'}`
          );
      }
    });
  } // End of setupToolHandlers

  /**
   * Connects the server to the transport and starts listening.
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Instantiate and run the server
const mem0Server = new Mem0MCPServer();
mem0Server.run().catch(() => process.exit(1));
