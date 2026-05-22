#!/usr/bin/env node

/**
 * MCP server for interacting with Mem0.ai memory storage.
 * Provides tools to add and search memories.
 *
 * Supports two modes:
 * 1. Cloud mode: Uses Mem0's hosted API with MEM0_API_KEY
 * 2. Local mode: Uses in-memory storage with OPENAI_API_KEY for embeddings
 */
// Console suppression is required only for stdio MCP transport (logs would pollute the JSON-RPC channel).
// HTTP transport (default for this Pereneo fork) keeps console enabled for Container App log capture.
if (process.env.MCP_TRANSPORT === 'stdio') {
  const noOp = () => {};
  console.log = noOp;
  console.error = noOp;
  console.warn = noOp;
  console.info = noOp;
  console.debug = noOp;
  console.trace = noOp;
}

// Environment variables to disable logging in various libraries
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
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import type { Memory as MemoryType } from "mem0ai/oss";
import express from "express";
import { randomUUID } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Load Mem0 library after configuring environment to avoid unwanted telemetry
let Memory: typeof import("mem0ai/oss").Memory;
// Using dynamic import for cloud API to avoid TypeScript issues
let MemoryClient: any = null;

// Initialize Memory synchronously to avoid race conditions
let memoryInitialized = false;
async function initializeMemory() {
  if (memoryInitialized) return;
  try {
    const mod = await import("mem0ai/oss");
    Memory = mod.Memory;
    memoryInitialized = true;
  } catch (error) {
    // Silent failure - let the constructor handle missing dependencies
  }
}
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

// Tool send_mail — multi-mailbox outbound mail via Microsoft Graph.
// See BRIEF_MAIL_TOOL_MCP_v1.md (SharePoint TECHNIQUE/CLAUDE/1. PERENEO/) for full design.
// Env vars (required for Phase B implementation, not Phase A skeleton):
//   OUTBOUND_MAILER_TENANT_ID    : Entra tenant id
//   OUTBOUND_MAILER_CLIENT_ID    : App Reg appId (Pereneo Charli Outbound Mailer)
//   OUTBOUND_MAILER_CLIENT_SECRET: client_credentials secret (Key Vault ref recommended)
//   FROM_WHITELIST               : comma-separated UPNs (e.g. charli@pereneo.eu,paul.rudler@oseys.fr)
interface SendMailToolArgs {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  saveToSentItems?: boolean;
}

// Message type for Mem0 API
type Mem0Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

// Outbound Mailer Graph token cache (in-memory, TTL capped 60s) for send_mail tool.
// Reset on process restart; Container App rotates the underlying secret externally.
let _outboundTokenCache: { token: string; expiresAt: number } | null = null;

async function getOutboundGraphToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (_outboundTokenCache && _outboundTokenCache.expiresAt > now + 5000) {
    return _outboundTokenCache.token;
  }
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  }).toString();
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Graph token acquisition failed: ${resp.status} ${text.slice(0, 300)}`);
  }
  const json: any = await resp.json();
  if (!json.access_token) {
    throw new Error("Graph token acquisition: no access_token in response");
  }
  const expiresInSec = typeof json.expires_in === "number" ? json.expires_in : 3600;
  _outboundTokenCache = {
    token: json.access_token,
    expiresAt: now + Math.min(expiresInSec * 1000, 60_000),
  };
  return json.access_token;
}

class Mem0MCPServer {
  private server: Server;
  private isCloudMode: boolean = false;
  private isSupabaseMode: boolean = false;
  private localClient?: MemoryType;
  private cloudClient?: any;
  private supabaseClient?: MemoryType;
  private isReady: boolean = false;

  constructor() {
    // Initialize MCP Server
    this.server = new Server(
      {
        // These should match package.json
        name: "@pinkpixel/mem0-mcp",
        version: "0.6.4",
      },
      {
        capabilities: {
          // Only tools capability needed for now
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Initialize clients asynchronously but don't block constructor
    this.initializeClients();

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.server.close();
      process.exit(0);
    });

    // Cleanup on uncaught exceptions
    process.on('uncaughtException', (error) => {
      process.exit(1);
    });
  }

  private async initializeClients(): Promise<void> {
    // Check for environment variables
    const mem0ApiKey = process.env.MEM0_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Ensure Memory is initialized
    await initializeMemory();

    // Determine the mode based on available keys (priority: Cloud > Supabase > Local)
    if (mem0ApiKey) {
      this.isCloudMode = true;

      // Dynamic import for cloud client
      try {
        const module = await import('mem0ai');
        MemoryClient = module.default;
        
        const clientOptions: any = {
          apiKey: mem0ApiKey,
          debug: false,
          verbose: false,
          silent: true
        };

        this.cloudClient = new MemoryClient(clientOptions);
        this.isReady = true;
      } catch (error) {
        process.exit(1);
      }
    } else if (supabaseUrl && supabaseKey) {
      this.isSupabaseMode = true;

      try {
        // Initialize Supabase client with vector store and history store
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
        this.isReady = true;
      } catch (error) {
        process.exit(1);
      }
    } else if (openaiApiKey) {
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
        });
        this.isReady = true;
      } catch (error) {
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
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
          {
            name: "send_mail",
            description: "Envoie un mail depuis une boite du tenant Pereneo via Microsoft Graph. La boite expeditrice (from) doit etre dans la whitelist FROM_WHITELIST (cote serveur). Charli redige le bodyHtml en respectant la DA Pereneo (skill local CLI ou knowledge file DAPERENNE_v1.md Project Charli). Pas de confirmation utilisateur bloquante cote tool: l'envoi se fait immediatement a l'appel.",
            inputSchema: {
              type: "object",
              properties: {
                from: {
                  type: "string",
                  description: "Adresse UPN de la boite expeditrice (ex: charli@pereneo.eu, paul.rudler@oseys.fr). Doit etre dans la whitelist FROM_WHITELIST sinon erreur from_not_whitelisted.",
                },
                to: {
                  type: "array",
                  items: { type: "string" },
                  description: "Destinataires principaux (au moins un).",
                },
                cc: {
                  type: "array",
                  items: { type: "string" },
                  description: "Destinataires en copie (optionnel).",
                },
                subject: {
                  type: "string",
                  description: "Sujet du mail.",
                },
                bodyHtml: {
                  type: "string",
                  description: "Corps HTML du mail. Charli applique la DA Pereneo (palette, typo Inter, ton COMEX tutoiement / externe vouvoiement, signature contextualisee) en amont de l'appel.",
                },
                saveToSentItems: {
                  type: "boolean",
                  description: "Si true (defaut), le mail est enregistre dans les Elements envoyes de la boite from.",
                },
              },
              required: ["from", "to", "subject", "bodyHtml"],
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
        } else if (name === "send_mail") {
          const toolArgs = args as unknown as SendMailToolArgs;
          return await this.handleSendMail(toolArgs);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
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

    if (this.isCloudMode && this.cloudClient) {
      try {
        // Get all parameters - parameter takes precedence over environment
        const finalAppId = appId || process.env.DEFAULT_APP_ID;
        const finalAgentId = agentId || process.env.DEFAULT_AGENT_ID;
        const finalProjectId = projectId || process.env.DEFAULT_PROJECT_ID;
        const finalOrgId = orgId || process.env.DEFAULT_ORG_ID;

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
          try {
            const apiUrl = 'https://api.mem0.ai/v1/memories/';
            const requestBody = {
              messages: messages,
              ...options
            };

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
          } catch (directError: any) {
            // Fall through to SDK attempt
          }
        }

        // Try SDK if direct API wasn't used or failed
        if (!usedDirectAPI) {
          try {
            result = await this.cloudClient.add(messages, options);
          } catch (sdkError: any) {
            throw sdkError;
          }
        }

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
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

        // API call
        const result = await this.supabaseClient.add(messages, options);

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
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

        return {
          content: [{ type: "text", text: `Memory added successfully. Result: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
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

        // Always use direct REST API for search. The SDK mem0ai 2.x calls v2 which
        // requires `filters` and silently returns empty if missing (BL-55 root cause,
        // diagnosed 12 May 2026 PM). v1 endpoint accepts user_id flat, still supported.
        let results;
        const apiUrl = 'https://api.mem0.ai/v1/memories/search/';
        const requestBody = {
          query: query,
          ...options
        };
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
          throw new Error(`Mem0 search API call failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        results = await response.json();

        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
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

        // API call
        const results = await this.supabaseClient.search(query, options);

        // Handle potential array or object result
        const resultsArray = Array.isArray(results) ? results : [results];

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
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

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
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
        } catch (innerError) {
          // If that fails, try to use a generic request method
          await fetch(`https://api.mem0.ai/v1/memories/${memoryId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Token ${process.env.MEM0_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
          });
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message}`);
      }
    } else if (this.isSupabaseMode && this.supabaseClient) {
      try {
        // For Supabase storage, try to use the deleteMemory method
        try {
          // @ts-ignore - We'll try to access this method even if TypeScript doesn't recognize it
          await this.supabaseClient.deleteMemory(memoryId);
        } catch (innerError) {
          // If direct method fails, try to access through any internal methods

          // @ts-ignore - Accessing potentially private properties
          if (this.supabaseClient._vectorstore && typeof this.supabaseClient._vectorstore.delete === 'function') {
            // @ts-ignore
            await this.supabaseClient._vectorstore.delete({ ids: [memoryId] });
          } else {
            throw new Error("Supabase client does not support memory deletion");
          }
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message || "Supabase client does not support memory deletion"}`);
      }
    } else if (this.localClient) {
      try {
        // For local storage, we need to find a way to delete the memory
        // Since we don't have direct access to deleteMemory, we'll try to access it indirectly

        try {
          // @ts-ignore - We'll try to access this method even if TypeScript doesn't recognize it
          await this.localClient.deleteMemory(memoryId);
        } catch (innerError) {


          // @ts-ignore - Accessing potentially private properties
          if (this.localClient._vectorstore && typeof this.localClient._vectorstore.delete === 'function') {
            // @ts-ignore
            await this.localClient._vectorstore.delete({ ids: [memoryId] });
          } else {
            throw new Error("Local client does not support memory deletion");
          }
        }

        return {
          content: [{ type: "text", text: `Memory ${memoryId} deleted successfully` }],
        };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, `Error deleting memory: ${error.message || "Local client does not support memory deletion"}`);
      }
    } else {
      throw new McpError(ErrorCode.InternalError, "No memory client is available");
    }
  }

  /**
   * Handles sending a mail via Microsoft Graph sendMail.
   *
   * Phase A skeleton (commit initial): validates required fields, parses FROM_WHITELIST,
   * checks `from` is whitelisted. Returns not_implemented on success path to signal that
   * the Graph token + POST flow is not wired yet.
   *
   * Phase B (separate commit): acquire client_credentials token, POST /v1.0/users/{from}/sendMail,
   * audit log (timestamp, from, to/cc counts, subject, caller identity from JWT), return
   * { ok: true, sentAt, from, recipientsCount } or { ok: false, error }.
   *
   * Phase C (separate commit): ApplicationAccessPolicy via Exchange Online + smoke test plan.
   *
   * Mandate: Paul 21 May 2026 PM. Brief: BRIEF_MAIL_TOOL_MCP_v1.md (SharePoint TECHNIQUE/CLAUDE/1. PERENEO/).
   */
  private async handleSendMail(args: SendMailToolArgs): Promise<any> {
    const { from, to, cc, subject, bodyHtml } = args;

    if (!from || typeof from !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "send_mail: 'from' is required (UPN string)");
    }
    if (!Array.isArray(to) || to.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, "send_mail: 'to' must be a non-empty array of UPN strings");
    }
    if (!subject || typeof subject !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "send_mail: 'subject' is required (string)");
    }
    if (!bodyHtml || typeof bodyHtml !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "send_mail: 'bodyHtml' is required (HTML string)");
    }

    const rawWhitelist = process.env.FROM_WHITELIST || "";
    const whitelist = new Set(
      rawWhitelist
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
    );

    if (whitelist.size === 0) {
      throw new McpError(
        ErrorCode.InternalError,
        "send_mail: FROM_WHITELIST env var is not configured on the server. Tool is unavailable."
      );
    }

    if (!whitelist.has(from.toLowerCase())) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: "from_not_whitelisted",
              from,
              hint: "The sender address is not in FROM_WHITELIST. Contact Paul to extend the whitelist if legitimate.",
            }),
          },
        ],
      };
    }

    // Phase B: acquire Graph token (client_credentials), POST sendMail, audit log.
    const tenantId = process.env.OUTBOUND_MAILER_TENANT_ID;
    const clientId = process.env.OUTBOUND_MAILER_CLIENT_ID;
    const clientSecret = process.env.OUTBOUND_MAILER_CLIENT_SECRET;
    if (!tenantId || !clientId || !clientSecret) {
      throw new McpError(
        ErrorCode.InternalError,
        "send_mail: OUTBOUND_MAILER_TENANT_ID / CLIENT_ID / CLIENT_SECRET env vars are required on the server."
      );
    }

    let token: string;
    try {
      token = await getOutboundGraphToken(tenantId, clientId, clientSecret);
    } catch (e: any) {
      console.error(`[send_mail] token_error from=${from}: ${e.message || e}`);
      return {
        content: [
          { type: "text", text: JSON.stringify({ ok: false, error: "graph_token_error", detail: String(e.message || e).slice(0, 300) }) },
        ],
      };
    }

    const recipientsToArr = to.map((addr) => ({ emailAddress: { address: addr } }));
    const recipientsCcArr = Array.isArray(cc) && cc.length > 0
      ? cc.map((addr) => ({ emailAddress: { address: addr } }))
      : undefined;

    const graphBody: any = {
      message: {
        subject,
        body: { contentType: "HTML", content: bodyHtml },
        toRecipients: recipientsToArr,
      },
      saveToSentItems: args.saveToSentItems !== false,
    };
    if (recipientsCcArr) graphBody.message.ccRecipients = recipientsCcArr;

    const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`;
    const sentAt = new Date().toISOString();
    const recipientsCount = to.length + (cc?.length ?? 0);

    let graphResp: Response;
    try {
      graphResp = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphBody),
      });
    } catch (e: any) {
      console.error(`[send_mail] network_error from=${from} subject="${subject}": ${e.message || e}`);
      return {
        content: [
          { type: "text", text: JSON.stringify({ ok: false, error: "graph_network_error", detail: String(e.message || e).slice(0, 300) }) },
        ],
      };
    }

    if (!graphResp.ok) {
      let detail = "";
      try { detail = await graphResp.text(); } catch { /* ignore */ }
      console.error(`[send_mail] graph_error from=${from} status=${graphResp.status} subject="${subject}" recipients=${recipientsCount} detail=${detail.slice(0, 500)}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: "graph_error",
              status: graphResp.status,
              detail: detail.slice(0, 500),
            }),
          },
        ],
      };
    }

    console.log(`[send_mail] sent at=${sentAt} from=${from} subject="${subject}" recipients=${recipientsCount} status=${graphResp.status}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: true,
            sentAt,
            from,
            recipientsCount,
            subject,
          }),
        },
      ],
    };
  }

  /**
   * Starts the MCP server.
   * Default: Streamable HTTP transport on PORT (default 8080), suitable for remote use behind a reverse proxy.
   * Set MCP_TRANSPORT=stdio for legacy stdio mode (local Claude Desktop usage).
   */
  public async start(): Promise<void> {
    if (process.env.MCP_TRANSPORT === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      return;
    }

    const port = parseInt(process.env.PORT || '8080', 10);

    // OAuth 2.0 Resource Server configuration (MCP authorization spec 2025-11-25 / RFC 9728 / RFC 8707)
    const tenantId = process.env.ENTRA_TENANT_ID;
    const audience = process.env.ENTRA_AUDIENCE;            // identifierUri (advertised in /.well-known)
    const audienceGuid = process.env.ENTRA_AUDIENCE_GUID;   // appId GUID (Entra v2 emits this in aud claim)
    const audienceExtra = process.env.ENTRA_AUDIENCE_EXTRA; // secondary identifierUri accepted in aud (transition / multi-domain)
    const resourceUrl = process.env.RESOURCE_URL;
    if (!tenantId || !audience || !resourceUrl) {
      process.stderr.write('FATAL: ENTRA_TENANT_ID, ENTRA_AUDIENCE, and RESOURCE_URL env vars are required in HTTP mode.\n');
      process.exit(1);
    }
    // Per Microsoft docs (entra/identity-platform/access-token-claims-reference): v2 tokens carry
    // aud = client ID GUID of the web API; v1 tokens carry aud = appID URI. We accept both for
    // robustness across delegated and client_credentials flows.
    const acceptedAudiences: string[] = [audience, audienceGuid, audienceExtra].filter((x): x is string => !!x);
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    const JWKS = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: 3600 * 1000,
      cooldownDuration: 30 * 1000,
    });
    const protectedResourceMetadata = {
      resource: resourceUrl,
      authorization_servers: [issuer],
      // Entra v2 requires fully-qualified scope (api://<resource>/<scope>) for cross-resource resolution.
      // Short scope ("mcp.access") falls back to Microsoft Graph and triggers AADSTS650053.
      scopes_supported: [`${audience}/mcp.access`],
      bearer_methods_supported: ['header'],
      resource_documentation: 'https://github.com/GroupePerenne/mem0-mcp-pereneo',
    };
    const metadataUrl = new URL('/.well-known/oauth-protected-resource', resourceUrl).toString();
    const wwwAuthHeader = (errorCode?: string, description?: string) => {
      let header = `Bearer resource_metadata="${metadataUrl}"`;
      if (errorCode) header += `, error="${errorCode}"`;
      if (description) header += `, error_description="${description.replace(/"/g, "'")}"`;
      return header;
    };
    const jwtMiddleware: express.RequestHandler = async (req, res, next) => {
      const authHeader = req.header('authorization') || req.header('Authorization');
      if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        res.set('WWW-Authenticate', wwwAuthHeader());
        res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token required' });
        return;
      }
      const token = authHeader.slice(7).trim();
      try {
        await jwtVerify(token, JWKS, { issuer, audience: acceptedAudiences, algorithms: ['RS256'] });
        next();
      } catch (err: any) {
        const description = err?.code || err?.message || 'invalid_token';
        res.set('WWW-Authenticate', wwwAuthHeader('invalid_token', description));
        res.status(401).json({ error: 'invalid_token', error_description: description });
      }
    };

    const app = express();
    app.use(express.json({ limit: '4mb' }));

    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', ready: this.isReady });
    });

    app.get('/health/deep', async (_req, res) => {
      if (!this.isReady) {
        res.status(503).json({ status: 'not_ready', ready: false });
        return;
      }
      const client = this.cloudClient || this.supabaseClient || this.localClient;
      if (!client) {
        res.status(503).json({ status: 'no_client', ready: false });
        return;
      }
      const timeoutMs = Number(process.env.HEALTH_DEEP_TIMEOUT_MS || 3000);
      try {
        await Promise.race([
          client.search('healthcheck-ping', { user_id: '_healthcheck_charli_deep', limit: 1 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('healthcheck_timeout')), timeoutMs))
        ]);
        res.status(200).json({ status: 'ok', ready: true });
      } catch (err: any) {
        res.status(503).json({ status: 'unhealthy', error: err?.message || 'unknown' });
      }
    });

    app.get('/.well-known/oauth-protected-resource', (_req, res) => {
      res.status(200).json(protectedResourceMetadata);
    });

    app.use('/mcp', jwtMiddleware);

    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.post('/mcp', async (req, res) => {
      const sessionId = req.header('mcp-session-id');
      let transport = sessionId ? transports[sessionId] : undefined;

      // SPEC MCP HTTP 2025-03-26 §3 (Session Management) :
      // Si le client envoie un mcp-session-id que le serveur ne reconnaît pas
      // (cas typique : pod restart / cold start = perte de la map transports
      // tenue en mémoire process), le serveur DOIT répondre HTTP 404. Le client
      // DOIT alors redo initialize sans Mcp-Session-Id (spec §4).
      // Avant ce patch, le serveur créait un nouveau transport vide et lui
      // transmettait directement la requête, ce qui résultait en
      // "Server not initialized" côté client (BL-47).
      if (sessionId && !transport) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Session terminated',
            data: { hint: 'Re-initialize without Mcp-Session-Id header' },
          },
          id: null,
        });
        return;
      }

      // Pas de mcp-session-id côté requête = nouveau handshake initialize attendu.
      if (!transport) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport!;
          },
        });
        transport.onclose = () => {
          const sid = transport!.sessionId;
          if (sid) delete transports[sid];
        };
        await this.server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    });

    const handleSession = async (req: express.Request, res: express.Response) => {
      const sessionId = req.header('mcp-session-id');
      // Header manquant = 400 Bad Request (input client invalide).
      if (!sessionId) {
        res.status(400).send('Missing Mcp-Session-Id header');
        return;
      }
      // SPEC MCP HTTP §3 : session inconnue côté serveur → 404 (cf. POST handler).
      if (!transports[sessionId]) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Session terminated',
            data: { hint: 'Re-initialize without Mcp-Session-Id header' },
          },
          id: null,
        });
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    };
    app.get('/mcp', handleSession);
    app.delete('/mcp', handleSession);

    app.listen(port, '0.0.0.0', () => {
      process.stderr.write(`mem0-mcp HTTP listening on :${port}\n`);
    });
  }
}

// Start the server
const server = new Mem0MCPServer();
server.start().catch((error) => {
  process.exit(1);
});
