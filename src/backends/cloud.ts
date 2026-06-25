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

export class CloudBackend extends MemoryBackend {
  readonly mode = 'cloud';
  private client: any;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    const module = await import("mem0ai");
    const MemoryClientClass = (module.MemoryClient || module.default) as any;
    this.client = new MemoryClientClass({
      apiKey: this.apiKey
    });
  }

  async getCapabilities(): Promise<MemoryCapabilities> {
    return {
      mode: 'cloud',
      apiVersion: 'v3',
      supportsAsyncEvents: true,
      supportsListMemories: true,
      supportsHistory: true,
      supportsAdvancedFilters: true,
      supportsBatchOperations: true,
      supportsBatchDelete: true,
      supportsFeedback: true,
      supportsEvents: true,
      supportsExports: true
    };
  }

  private mapRawRecord(raw: any): MemoryRecord {
    return {
      id: raw.id || raw.memoryId,
      memory: raw.memory || raw.text || "",
      userId: raw.userId || raw.user_id,
      agentId: raw.agentId || raw.agent_id,
      appId: raw.appId || raw.app_id,
      runId: raw.runId || raw.run_id,
      metadata: raw.metadata,
      createdAt: raw.createdAt || raw.created_at,
      updatedAt: raw.updatedAt || raw.updated_at
    };
  }

  private mergeFiltersSafely(scopeFilters: Record<string, any>, userFilters?: Record<string, any>): Record<string, any> {
    if (!userFilters) return scopeFilters;
    if (userFilters.AND && Array.isArray(userFilters.AND)) {
      return {
        ...userFilters,
        AND: [...userFilters.AND, ...Object.entries(scopeFilters).map(([k, v]) => ({ [k]: v }))]
      };
    }
    return {
      ...scopeFilters,
      ...userFilters
    };
  }

  async add(input: NormalizedAddInput): Promise<AddResult> {
    const messages = input.messages || (input.content ? [{ role: "user" as const, content: input.content }] : null);
    if (!messages || messages.length === 0) {
      throw new Error("Cannot process an empty messages payload. Provide content or messages.");
    }

    const {
      userId, agentId, appId, runId, metadata, infer, customInstructions,
      waitForCompletion = true, timeoutMs = 15000
    } = input;

    // Build entity option parameters for the add method (CamelCase as expected by TypeScript index.d.ts)
    const options: Record<string, any> = {};
    if (userId) options.userId = userId;
    if (agentId) options.agentId = agentId;
    if (appId) options.appId = appId;
    if (runId) options.runId = runId;
    if (metadata) options.metadata = metadata;
    if (infer !== undefined) options.infer = infer;
    if (customInstructions) options.customInstructions = customInstructions;

    const start = Date.now();
    const response = await this.client.add(messages, options);
    
    // SDK returns snakeToCamelKeys(jsonResponse)
    const eventId = response.eventId;
    const status = response.status || 'PENDING';

    if (waitForCompletion && status === 'PENDING' && eventId) {
      const timeout = timeoutMs;
      const host = this.client.host || "https://api.mem0.ai";
      
      while (Date.now() - start < timeout) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const eventRes = await fetch(`${host}/v1/event/${eventId}/`, {
            headers: {
              'Authorization': `Token ${this.apiKey}`,
              'Accept': 'application/json'
            }
          });
          
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            if (eventData.status === 'SUCCEEDED') {
              // Try to retrieve recent memories for this scope if we can
              let memories: MemoryRecord[] = [];
              try {
                const listRes = await this.list({ userId, agentId, appId, runId });
                memories = listRes.results;
              } catch (e) {
                // Ignore failure to fetch recent list
              }

              return {
                status: 'SUCCEEDED',
                eventId,
                memories,
                elapsedMs: Date.now() - start
              };
            } else if (eventData.status === 'FAILED') {
              return {
                status: 'FAILED',
                eventId,
                error: { message: `Memory processing failed on Mem0 platform` },
                elapsedMs: Date.now() - start
              };
            }
          }
        } catch (e: any) {
          // Ignore transient fetch errors and continue polling
        }
      }

      return {
        status: 'PENDING',
        eventId,
        error: { message: `Memory processing timed out after ${timeout}ms` },
        elapsedMs: Date.now() - start
      };
    }

    return {
      status: status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PENDING',
      eventId: eventId || '',
      elapsedMs: Date.now() - start
    };
  }

  async search(input: NormalizedSearchInput): Promise<SearchResult> {
    const {
      query, userId, agentId, appId, runId, filters: userFilters,
      topK, threshold, rerank, referenceDate
    } = input;

    // Map top-level scope variables into the filters object (V3 requires this)
    const scopeFilters: Record<string, any> = {};
    if (userId) scopeFilters.user_id = userId;
    if (agentId) scopeFilters.agent_id = agentId;
    if (appId) scopeFilters.app_id = appId;
    if (runId) scopeFilters.run_id = runId;

    const filters = this.mergeFiltersSafely(scopeFilters, userFilters);

    if (Object.keys(filters).length === 0) {
      throw new Error("Mem0 V3 search requires at least one entity scope (userId, agentId, appId, or runId).");
    }

    const options: Record<string, any> = { filters };
    if (topK !== undefined) options.topK = topK;
    if (threshold !== undefined) options.threshold = threshold;
    if (rerank !== undefined) options.rerank = rerank;
    if (referenceDate !== undefined) options.referenceDate = referenceDate;

    const response = await this.client.search(query, options);
    const results = response.results || [];

    return {
      memories: results.map((m: any) => this.mapRawRecord(m))
    };
  }

  async list(input: ListInput): Promise<ListResult> {
    const { userId, agentId, appId, runId, filters: userFilters, page, pageSize } = input;

    const scopeFilters: Record<string, any> = {};
    if (userId) scopeFilters.user_id = userId;
    if (agentId) scopeFilters.agent_id = agentId;
    if (appId) scopeFilters.app_id = appId;
    if (runId) scopeFilters.run_id = runId;

    const filters = this.mergeFiltersSafely(scopeFilters, userFilters);

    const options: Record<string, any> = { filters };
    if (page !== undefined) options.page = page;
    if (pageSize !== undefined) options.pageSize = pageSize;

    const response = await this.client.getAll(options);
    const results = response.results || [];

    return {
      count: response.count || results.length,
      next: response.next,
      previous: response.previous,
      results: results.map((m: any) => this.mapRawRecord(m))
    };
  }

  async get(memoryId: string): Promise<MemoryRecord> {
    const response = await this.client.get(memoryId);
    return this.mapRawRecord(response);
  }

  async update(input: UpdateInput): Promise<MemoryRecord> {
    const { memoryId, text, metadata } = input;
    // Map text to body. The SDK Client expects update(memoryId, { text, metadata })
    const response = await this.client.update(memoryId, { text, metadata });
    // In SDK, update returns Array<Memory> or single Memory
    const raw = Array.isArray(response) ? response[0] : response;
    return this.mapRawRecord(raw);
  }

  async delete(memoryId: string): Promise<DeleteResult> {
    const response = await this.client.delete(memoryId);
    return {
      success: true,
      message: response.message || `Memory ${memoryId} deleted successfully`
    };
  }

  async getHistory(memoryId: string): Promise<any> {
    const response = await this.client.history(memoryId);
    return response;
  }

  // Phase 2 operations
  async batchUpdate(entries: BatchUpdateEntry[]): Promise<any> {
    const memories = entries.map(e => ({
      memoryId: e.memoryId,
      text: e.text
    }));
    const response = await this.client.batchUpdate(memories);
    return { message: response };
  }

  async batchDelete(memoryIds: string[]): Promise<any> {
    const response = await this.client.batchDelete(memoryIds);
    return { message: response };
  }

  async rateMemory(input: FeedbackInput): Promise<any> {
    const { memoryId, feedback, reason } = input;
    
    let sdkFeedback: any;
    switch (feedback.toUpperCase()) {
      case 'POSITIVE':
        sdkFeedback = 'POSITIVE';
        break;
      case 'NEGATIVE':
        sdkFeedback = 'NEGATIVE';
        break;
      case 'VERY_NEGATIVE':
        sdkFeedback = 'VERY_NEGATIVE';
        break;
      default:
        throw new Error(`Invalid feedback value: ${feedback}. Must be 'positive', 'negative', or 'very_negative'.`);
    }

    const response = await this.client.feedback({
      memoryId,
      feedback: sdkFeedback,
      feedbackReason: reason
    });
    return response;
  }

  async getEvent(eventId: string): Promise<any> {
    const host = this.client.host || "https://api.mem0.ai";
    const res = await fetch(`${host}/v1/event/${eventId}/`, {
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get event details: ${res.statusText} - ${errorText}`);
    }
    return await res.json();
  }

  async listEvents(input: { page?: number; pageSize?: number }): Promise<any> {
    const host = this.client.host || "https://api.mem0.ai";
    const params = new URLSearchParams();
    if (input.page !== undefined) params.append("page", input.page.toString());
    if (input.pageSize !== undefined) params.append("page_size", input.pageSize.toString());

    const url = `${host}/v1/events/${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to list events: ${res.statusText} - ${errorText}`);
    }
    return await res.json();
  }

  async createExport(input: ExportInput): Promise<any> {
    const { schema, filters = {} } = input;
    const response = await this.client.createMemoryExport({
      schema,
      filters,
      exportInstructions: input.exportInstructions
    });
    return response;
  }

  async getExport(exportId: string): Promise<any> {
    const response = await this.client.getMemoryExport({
      memoryExportId: exportId
    });
    return response;
  }
}
