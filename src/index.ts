#!/usr/bin/env node

/**
 * MCP server for interacting with Mem0.ai memory storage.
 * Provides tools to add, search, list, update, and manage memories.
 *
 * Supports three modes:
 * 1. Cloud mode: Uses Mem0's hosted API with MEM0_API_KEY
 * 2. Supabase mode: Uses self-hosted Supabase with SUPABASE_URL & SUPABASE_KEY
 * 3. Local mode: Uses in-memory storage with OPENAI_API_KEY for embeddings
 */

// Suppress library console logging to avoid breaking the MCP stdio protocol
const noOp = () => {};
console.log = noOp;
console.error = noOp;
console.warn = noOp;
console.info = noOp;
console.debug = noOp;
console.trace = noOp;

process.env.DEBUG = '';
process.env.NODE_DEBUG = '';
process.env.DEBUG_COLORS = 'no';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.LOG_LEVEL = 'silent';
process.env.SILENT = 'true';
process.env.QUIET = 'true';
process.env.MEM0_TELEMETRY = 'false';
process.env.DISABLE_LOGGING = 'true';
process.env.NO_COLOR = 'true';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import { MemoryBackend } from "./backends/base.js";
import { CloudBackend } from "./backends/cloud.js";
import { SupabaseBackend } from "./backends/supabase.js";
import { LocalBackend } from "./backends/local.js";

class Mem0MCPServer {
  private server: Server;
  private backend?: MemoryBackend;
  private isReady: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: "@pinkpixel/mem0-mcp",
        version: "0.8.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.initializeBackend();

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      process.exit(1);
    });
  }

  private async initializeBackend(): Promise<void> {
    const mem0ApiKey = process.env.MEM0_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    try {
      if (mem0ApiKey) {
        const cloudBackend = new CloudBackend(mem0ApiKey);
        await cloudBackend.initialize();
        this.backend = cloudBackend;
        this.isReady = true;
      } else if (supabaseUrl && supabaseKey) {
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
          embedder: {
            provider: 'openai',
            config: {
              apiKey: openaiApiKey,
              model: 'text-embedding-3-small',
            },
          },
        };

        const supabaseBackend = new SupabaseBackend(supabaseConfig);
        await supabaseBackend.initialize();
        this.backend = supabaseBackend;
        this.isReady = true;
      } else if (openaiApiKey) {
        const localConfig = {
          vectorStore: {
            provider: "memory",
            config: {
              collectionName: "mem0_default_collection"
            }
          }
        };

        const localBackend = new LocalBackend(localConfig);
        await localBackend.initialize();
        this.backend = localBackend;
        this.isReady = true;
      } else {
        process.exit(1);
      }
    } catch (error) {
      process.exit(1);
    }
  }

  private getEntityParams(args: any): { userId?: string; agentId?: string; appId?: string; runId?: string } {
    const userId = args.userId || process.env.DEFAULT_USER_ID;
    const agentId = args.agentId || process.env.DEFAULT_AGENT_ID;
    const appId = args.appId || process.env.DEFAULT_APP_ID;
    const runId = args.runId || args.sessionId || process.env.DEFAULT_RUN_ID; // support runId, sessionId fallback

    return {
      userId: userId || undefined,
      agentId: agentId || undefined,
      appId: appId || undefined,
      runId: runId || undefined
    };
  }

  private setupToolHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "add_memory",
            description: "Stores a piece of text or structural messages as a memory in Mem0.",
            inputSchema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "Shorthand: The text content to store as a memory.",
                },
                messages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      role: { type: "string", enum: ["user", "assistant", "system"] },
                      content: { type: "string" }
                    },
                    required: ["role", "content"]
                  },
                  description: "V3 Preferred: Array of messages to extract memories from.",
                },
                userId: {
                  type: "string",
                  description: "User ID to associate with the memory. Fallback: DEFAULT_USER_ID environment variable.",
                },
                sessionId: {
                  type: "string",
                  description: "Backward compatible alias for runId. Session ID to associate with the memory.",
                },
                runId: {
                  type: "string",
                  description: "Run ID/Session ID to associate with the memory.",
                },
                agentId: {
                  type: "string",
                  description: "Agent ID to associate with the memory.",
                },
                appId: {
                  type: "string",
                  description: "App ID to associate with the memory.",
                },
                metadata: {
                  type: "object",
                  description: "Optional key-value metadata to attach.",
                },
                infer: {
                  type: "boolean",
                  description: "Whether to infer/extract memories (default: true). Set false to store message verbatim (cloud only).",
                },
                customInstructions: {
                  type: "string",
                  description: "Instructions to guide memory extraction behavior (cloud only).",
                },
                waitForCompletion: {
                  type: "boolean",
                  description: "Default true. Wait and poll for memory extraction completion (cloud only).",
                },
                timeoutMs: {
                  type: "number",
                  description: "Polling timeout in milliseconds (default: 15000, cloud only).",
                }
              }
            },
          },
          {
            name: "search_memories",
            description: "Searches stored memories based on a query.",
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
                  description: "Backward compatible alias for runId. Session ID to filter search.",
                },
                runId: {
                  type: "string",
                  description: "Run ID/Session ID to filter search.",
                },
                agentId: {
                  type: "string",
                  description: "Agent ID to filter search.",
                },
                appId: {
                  type: "string",
                  description: "App ID to filter search.",
                },
                filters: {
                  type: "object",
                  description: "Optional key-value filters for custom logical query composition.",
                },
                threshold: {
                  type: "number",
                  description: "Similarity threshold (0 to 1, default: 0.1).",
                },
                topK: {
                  type: "number",
                  description: "Number of top results to return (default: 10).",
                },
                rerank: {
                  type: "boolean",
                  description: "Enable reranking for better result ordering (adds latency, cloud only).",
                },
                referenceDate: {
                  type: "string",
                  description: "Anchor date/time for temporal reasoning relative queries (e.g. YYYY-MM-DD, cloud only).",
                }
              },
              required: ["query"],
            },
          },
          {
            name: "search_memory",
            description: "Backward-compatible alias for search_memories.",
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
                  description: "Session ID to filter search.",
                },
                runId: {
                  type: "string",
                  description: "Run ID/Session ID to filter search.",
                },
                agentId: {
                  type: "string",
                  description: "Agent ID to filter search.",
                },
                appId: {
                  type: "string",
                  description: "App ID to filter search.",
                },
                filters: {
                  type: "object",
                  description: "Optional key-value filters.",
                },
                threshold: {
                  type: "number",
                  description: "Similarity threshold.",
                },
                topK: {
                  type: "number",
                  description: "Number of top results.",
                }
              },
              required: ["query"],
            },
          },
          {
            name: "list_memories",
            description: "Lists all memories scoped to specific identifiers with pagination.",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string" },
                sessionId: { type: "string" },
                runId: { type: "string" },
                agentId: { type: "string" },
                appId: { type: "string" },
                filters: { type: "object" },
                page: { type: "number", default: 1 },
                pageSize: { type: "number", default: 25 }
              }
            }
          },
          {
            name: "get_memory",
            description: "Gets a single memory by its ID.",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: { type: "string", description: "The ID of the memory." }
              },
              required: ["memoryId"]
            }
          },
          {
            name: "update_memory",
            description: "Updates a specific memory record.",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: { type: "string", description: "The memory ID to update." },
                text: { type: "string", description: "New text content for the memory." },
                metadata: { type: "object", description: "Updated metadata object." }
              },
              required: ["memoryId"]
            }
          },
          {
            name: "delete_memory",
            description: "Deletes a specific memory record by ID.",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: { type: "string", description: "The ID of the memory to delete." }
              },
              required: ["memoryId"]
            }
          },
          {
            name: "get_memory_history",
            description: "Gets the audit trail and revision log of a memory (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: { type: "string", description: "The ID of the memory." }
              },
              required: ["memoryId"]
            }
          },
          {
            name: "get_memory_capabilities",
            description: "Returns the features and APIs supported by the current storage mode backend.",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          // Phase 2 tools
          {
            name: "batch_update_memories",
            description: "Performs bulk updates of text contents for multiple memories (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                updates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      memoryId: { type: "string", description: "The memory record ID." },
                      text: { type: "string", description: "The updated memory text." }
                    },
                    required: ["memoryId", "text"]
                  },
                  description: "Array of update records."
                }
              },
              required: ["updates"]
            }
          },
          {
            name: "batch_delete_memories",
            description: "Performs bulk deletions of multiple memories.",
            inputSchema: {
              type: "object",
              properties: {
                memoryIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of memory record IDs to delete."
                },
                confirm: {
                  type: "boolean",
                  description: "Must be set to true to execute the bulk deletion."
                }
              },
              required: ["memoryIds", "confirm"]
            }
          },
          {
            name: "rate_memory",
            description: "Submits quality feedback evaluation for a memory record (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                memoryId: { type: "string", description: "The memory record ID." },
                feedback: {
                  type: "string",
                  enum: ["positive", "negative", "very_negative"],
                  description: "Quality evaluation rating."
                },
                reason: {
                  type: "string",
                  description: "Optional details describing the reasoning for the score."
                }
              },
              required: ["memoryId", "feedback"]
            }
          },
          {
            name: "get_memory_event",
            description: "Manually retrieves detail logs of a specific background event job (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                eventId: { type: "string", description: "The event identifier." }
              },
              required: ["eventId"]
            }
          },
          {
            name: "list_memory_events",
            description: "Lists history logs of background memory processing events (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                page: { type: "number", default: 1 },
                pageSize: { type: "number", default: 25 }
              }
            }
          },
          {
            name: "create_memory_export",
            description: "Kicks off an async memory export query job (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                schema: {
                  type: "object",
                  description: "JSON schema describing the desired structured shape of the export."
                },
                filters: {
                  type: "object",
                  description: "Entity/metadata scope filters to constrain target memories."
                },
                exportInstructions: {
                  type: "string",
                  description: "Optional custom natural language guidance for the export structure."
                }
              },
              required: ["schema"]
            }
          },
          {
            name: "get_memory_export",
            description: "Retrieves status and downloads of a memory export job (cloud only).",
            inputSchema: {
              type: "object",
              properties: {
                exportId: { type: "string", description: "The export job identifier." }
              },
              required: ["exportId"]
            }
          }
        ]
      };
    });

    // Handler for call tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      if (!this.isReady || !this.backend) {
        throw new McpError(ErrorCode.InternalError, "Memory backend client is still initializing.");
      }

      try {
        const { name } = request.params;
        const args = request.params.arguments || {};

        switch (name) {
          case "add_memory": {
            const scopes = this.getEntityParams(args);
            const result = await this.backend.add({
              content: args.content as string,
              messages: args.messages as any,
              ...scopes,
              metadata: args.metadata as any,
              infer: args.infer as boolean,
              customInstructions: args.customInstructions as string,
              waitForCompletion: args.waitForCompletion as boolean,
              timeoutMs: args.timeoutMs as number
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "search_memory":
          case "search_memories": {
            const scopes = this.getEntityParams(args);
            const result = await this.backend.search({
              query: args.query as string,
              ...scopes,
              filters: args.filters as any,
              topK: args.topK as number,
              threshold: args.threshold as number,
              rerank: args.rerank as boolean,
              referenceDate: args.referenceDate as any
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "list_memories": {
            const scopes = this.getEntityParams(args);
            const result = await this.backend.list({
              ...scopes,
              filters: args.filters as any,
              page: args.page as number,
              pageSize: args.pageSize as number
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "get_memory": {
            const result = await this.backend.get(args.memoryId as string);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "update_memory": {
            const result = await this.backend.update({
              memoryId: args.memoryId as string,
              text: args.text as string,
              metadata: args.metadata as any
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "delete_memory": {
            const result = await this.backend.delete(args.memoryId as string);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "get_memory_history": {
            if (!this.backend.getHistory) {
              throw new McpError(ErrorCode.MethodNotFound, `get_memory_history is not supported in the active backend mode.`);
            }
            const result = await this.backend.getHistory(args.memoryId as string);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "get_memory_capabilities": {
            const result = await this.backend.getCapabilities();
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          // Phase 2 operations
          case "batch_update_memories": {
            const result = await this.backend.batchUpdate(args.updates as any[]);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "batch_delete_memories": {
            if (args.confirm !== true) {
              throw new McpError(ErrorCode.InvalidParams, "Bulk deletion aborted. Parameter 'confirm' must be explicitly set to true.");
            }
            const result = await this.backend.batchDelete(args.memoryIds as string[]);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "rate_memory": {
            const result = await this.backend.rateMemory({
              memoryId: args.memoryId as string,
              feedback: args.feedback as any,
              reason: args.reason as string
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "get_memory_event": {
            const result = await this.backend.getEvent(args.eventId as string);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "list_memory_events": {
            const result = await this.backend.listEvents({
              page: args.page as number,
              pageSize: args.pageSize as number
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "create_memory_export": {
            const result = await this.backend.createExport({
              schema: args.schema as any,
              filters: args.filters as any,
              exportInstructions: args.exportInstructions as string
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          case "get_memory_export": {
            const result = await this.backend.getExport(args.exportId as string);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, error.message || "Unknown error during tool execution");
      }
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start the server
const server = new Mem0MCPServer();
server.start().catch((error) => {
  process.exit(1);
});
