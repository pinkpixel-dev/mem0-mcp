import { 
  MemoryCapabilities, 
  NormalizedAddInput, 
  NormalizedSearchInput,
  ListInput,
  UpdateInput,
  AddResult,
  SearchResult,
  ListResult,
  DeleteResult,
  MemoryRecord
} from "../types.js";

export abstract class MemoryBackend {
  abstract readonly mode: 'cloud' | 'supabase' | 'local';
  abstract getCapabilities(): Promise<MemoryCapabilities>;
  abstract add(input: NormalizedAddInput): Promise<AddResult>;
  abstract search(input: NormalizedSearchInput): Promise<SearchResult>;
  abstract list(input: ListInput): Promise<ListResult>;
  abstract get(memoryId: string): Promise<MemoryRecord>;
  abstract update(input: UpdateInput): Promise<MemoryRecord>;
  abstract delete(memoryId: string): Promise<DeleteResult>;
  abstract getHistory?(memoryId: string): Promise<any>;
}
