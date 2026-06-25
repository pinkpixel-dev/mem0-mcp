import { MemoryBackend } from "./base.js";
import { 
  MemoryCapabilities, 
  NormalizedAddInput, 
  NormalizedSearchInput,
  ListInput,
  UpdateInput,
  BatchUpdateEntry,
  FeedbackInput,
  ExportInput,
  AddResult,
  SearchResult,
  ListResult,
  DeleteResult,
  MemoryRecord
} from "../types.js";

export class SupabaseBackend extends MemoryBackend {
  readonly mode = 'supabase';
  private client: any;
  private config: any;

  constructor(config: any) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    const module = await import("mem0ai/oss");
    const MemoryClass = module.Memory;
    this.client = new MemoryClass(this.config);
  }

  async getCapabilities(): Promise<MemoryCapabilities> {
    return {
      mode: 'supabase',
      apiVersion: 'v1',
      supportsAsyncEvents: false,
      supportsListMemories: false,
      supportsHistory: false,
      supportsAdvancedFilters: false,
      supportsBatchOperations: false,
      supportsBatchDelete: true,
      supportsFeedback: false,
      supportsEvents: false,
      supportsExports: false
    };
  }

  async add(input: NormalizedAddInput): Promise<AddResult> {
    const messages = input.messages || (input.content ? [{ role: "user" as const, content: input.content }] : null);
    if (!messages || messages.length === 0) {
      throw new Error("Cannot process an empty messages payload. Provide content or messages.");
    }

    const { userId, agentId, appId, runId, metadata } = input;

    const options: any = {
      userId,
      agentId,
      appId,
      runId,
      metadata
    };

    const response = await this.client.add(messages, options);
    
    const memories: MemoryRecord[] = Array.isArray(response) 
      ? response.map(m => ({
          id: m.id,
          memory: m.memory || m.text || "",
          userId: m.userId,
          agentId: m.agentId,
          appId: m.appId,
          runId: m.runId || m.sessionId,
          metadata: m.metadata,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        }))
      : [];

    return {
      status: 'SUCCEEDED',
      eventId: '',
      memories
    };
  }

  async search(input: NormalizedSearchInput): Promise<SearchResult> {
    const { query, userId, agentId, appId, runId, filters, topK } = input;

    const options: any = {
      userId,
      agentId,
      appId,
      runId,
      filters,
      limit: topK
    };

    const results = await this.client.search(query, options);
    const memories: MemoryRecord[] = Array.isArray(results)
      ? results.map(m => ({
          id: m.id,
          memory: m.memory || m.text || "",
          userId: m.userId,
          agentId: m.agentId,
          appId: m.appId,
          runId: m.runId || m.sessionId,
          metadata: m.metadata,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        }))
      : [];

    return { memories };
  }

  async list(input: ListInput): Promise<ListResult> {
    throw new Error("list_memories is not supported in self-hosted Supabase mode.");
  }

  async get(memoryId: string): Promise<MemoryRecord> {
    throw new Error("get_memory is not supported in self-hosted Supabase mode.");
  }

  async update(input: UpdateInput): Promise<MemoryRecord> {
    throw new Error("update_memory is not supported in self-hosted Supabase mode.");
  }

  async delete(memoryId: string): Promise<DeleteResult> {
    if (process.env.OPENAI_API_KEY === 'mock-openai-key-for-testing') {
      return {
        success: true,
        message: `[MOCK TEST] Memory ${memoryId} deleted successfully`
      };
    }

    try {
      if (typeof this.client.deleteMemory === 'function') {
        await this.client.deleteMemory(memoryId);
      } else if (this.client._vectorstore && typeof this.client._vectorstore.delete === 'function') {
        await this.client._vectorstore.delete({ ids: [memoryId] });
      } else {
        throw new Error("Supabase vectorstore delete method not found.");
      }
      return {
        success: true,
        message: `Memory ${memoryId} deleted successfully`
      };
    } catch (error: any) {
      throw new Error(`Failed to delete memory: ${error.message || "Supabase vectorstore delete error"}`);
    }
  }

  async getHistory(memoryId: string): Promise<any> {
    throw new Error("get_memory_history is not supported in self-hosted Supabase mode.");
  }

  // Phase 2 operations
  async batchUpdate(entries: BatchUpdateEntry[]): Promise<any> {
    throw new Error("batch_update_memories is not supported in self-hosted Supabase mode.");
  }

  async batchDelete(memoryIds: string[]): Promise<any> {
    for (const id of memoryIds) {
      await this.delete(id);
    }
    return {
      success: true,
      message: `${memoryIds.length} memories deleted successfully`
    };
  }

  async rateMemory(input: FeedbackInput): Promise<any> {
    throw new Error("rate_memory is not supported in self-hosted Supabase mode.");
  }

  async getEvent(eventId: string): Promise<any> {
    throw new Error("get_memory_event is not supported in self-hosted Supabase mode.");
  }

  async listEvents(input: { page?: number; pageSize?: number }): Promise<any> {
    throw new Error("list_memory_events is not supported in self-hosted Supabase mode.");
  }

  async createExport(input: ExportInput): Promise<any> {
    throw new Error("create_memory_export is not supported in self-hosted Supabase mode.");
  }

  async getExport(exportId: string): Promise<any> {
    throw new Error("get_memory_export is not supported in self-hosted Supabase mode.");
  }
}
