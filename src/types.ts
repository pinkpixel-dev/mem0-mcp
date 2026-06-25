export interface MemoryRecord {
  id: string;
  memory: string;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryCapabilities {
  mode: 'cloud' | 'supabase' | 'local';
  apiVersion: 'v3' | 'v1';
  supportsAsyncEvents: boolean;
  supportsListMemories: boolean;
  supportsHistory: boolean;
  supportsAdvancedFilters: boolean;
  supportsBatchOperations: boolean;
}

export interface NormalizedAddInput {
  content?: string;
  messages?: Array<{ role: string; content: string }>;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  metadata?: Record<string, any>;
  infer?: boolean;
  customInstructions?: string;
  waitForCompletion?: boolean;
  timeoutMs?: number;
}

export interface NormalizedSearchInput {
  query: string;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  filters?: Record<string, any>;
  topK?: number;
  threshold?: number;
  rerank?: boolean;
  referenceDate?: string | number;
}

export interface ListInput {
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
}

export interface UpdateInput {
  memoryId: string;
  text?: string;
  metadata?: Record<string, any>;
}

export interface AddResult {
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  eventId: string;
  memories?: MemoryRecord[];
  error?: { message: string; code?: string };
  elapsedMs?: number;
}

export interface SearchResult {
  memories: MemoryRecord[];
}

export interface ListResult {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: MemoryRecord[];
}

export interface DeleteResult {
  success: boolean;
  message: string;
}
