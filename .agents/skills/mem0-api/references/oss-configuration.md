# Mem0 OSS Configuration Reference

Use `from mem0 import Memory` (Python) or `import { Memory } from "mem0ai/oss"` (Node).

---

## Python OSS Config

```python
from mem0 import Memory

config = {
    "vector_store": { ... },
    "llm": { ... },
    "embedder": { ... },
    "reranker": { ... },       # optional
    "graph_store": { ... },    # optional, for graph memory
}

memory = Memory.from_config(config)

# Or from YAML file
memory = Memory.from_config_file("config.yaml")
```

### YAML format

```yaml
vector_store:
  provider: qdrant
  config:
    host: localhost
    port: 6333

llm:
  provider: openai
  config:
    model: gpt-4.1-mini
    temperature: 0.1

embedder:
  provider: openai
  config:
    model: text-embedding-3-small

reranker:
  provider: cohere
  config:
    model: rerank-english-v3.0
    api_key: ${COHERE_API_KEY}
```

---

## Node OSS

```ts
import { Memory } from "mem0ai/oss";

const memory = new Memory();  // defaults to OpenAI

await memory.add("I love hiking", { userId: "alice" });
const results = await memory.search("hobbies", { userId: "alice" });
await memory.getAll({ userId: "alice" });
await memory.get("<memory_id>");
await memory.update("<memory_id>", "Alice loves mountain hiking");
await memory.delete("<memory_id>");
await memory.deleteAll({ userId: "alice" });
```

Note: Node OSS uses camelCase (`userId`) vs Python Platform's snake_case (`user_id`).

---

## LLM Providers

| Provider       | `provider` key    | Required env var / notes |
|----------------|-------------------|--------------------------|
| OpenAI         | `openai`          | `OPENAI_API_KEY` |
| Anthropic      | `anthropic`       | `ANTHROPIC_API_KEY` |
| Azure OpenAI   | `azure_openai`    | `AZURE_OPENAI_KEY`, `deployment_name` |
| AWS Bedrock    | `aws_bedrock`     | AWS credentials, `model` |
| Google AI      | `google_AI`       | `GOOGLE_API_KEY` |
| Groq           | `groq`            | `GROQ_API_KEY` |
| DeepSeek       | `deepseek`        | `DEEPSEEK_API_KEY` |
| Mistral        | `mistral_AI`      | `MISTRAL_API_KEY` |
| Ollama         | `ollama`          | Local, `model`, `ollama_base_url` |
| LM Studio      | `lmstudio`        | Local, `base_url` |
| LiteLLM        | `litellm`         | Multiplexer, `model` prefix with provider |
| vLLM           | `vllm`            | Self-hosted, `openai_api_base` |
| Together       | `together`        | `TOGETHER_API_KEY` |
| xAI            | `xAI`             | `XAI_API_KEY` |

**OpenAI example:**
```python
"llm": {
    "provider": "openai",
    "config": {
        "model": "gpt-4.1-mini",
        "temperature": 0.1,
        "max_tokens": 2000
    }
}
```

**Anthropic example:**
```python
"llm": {
    "provider": "anthropic",
    "config": {
        "model": "claude-sonnet-4-6",
        "temperature": 0.0
    }
}
```

**Ollama example:**
```python
"llm": {
    "provider": "ollama",
    "config": {
        "model": "llama3.2",
        "ollama_base_url": "http://localhost:11434"
    }
}
```

---

## Embedding Providers

| Provider           | `provider` key      | Notes |
|--------------------|---------------------|-------|
| OpenAI             | `openai`            | Default: text-embedding-3-small |
| Azure OpenAI       | `azure_openai`      | `deployment_name` required |
| Google AI          | `google_AI`         | textembedding-gecko@003 |
| Vertex AI          | `vertexai`          | GCP project required |
| Hugging Face       | `huggingface`       | `model` = HF model ID |
| Ollama             | `ollama`            | Local, `model` = embedding model name |
| LM Studio          | `lmstudio`          | Local |
| Together           | `together`          | `together_api_key` |
| AWS Bedrock        | `aws_bedrock`       | `model` = bedrock model id |

**OpenAI example:**
```python
"embedder": {
    "provider": "openai",
    "config": {
        "model": "text-embedding-3-large",
        "embedding_dims": 3072
    }
}
```

**HuggingFace example:**
```python
"embedder": {
    "provider": "huggingface",
    "config": {
        "model": "sentence-transformers/all-MiniLM-L6-v2"
    }
}
```

---

## Vector Store Providers

| Provider           | `provider` key    | Best for |
|--------------------|-------------------|----------|
| Qdrant             | `qdrant`          | Default self-hosted (best tested) |
| Chroma             | `chroma`          | Lightweight embedded |
| PGVector           | `pgvector`        | Postgres stack |
| Pinecone           | `pinecone`        | Managed cloud |
| MongoDB Atlas      | `mongodb`         | Atlas Vector Search |
| Redis Stack        | `redis`           | In-memory + persistence |
| Supabase           | `supabase`        | Postgres + pgvector on Supabase |
| Neon               | `neon`            | Serverless Postgres |
| Weaviate           | `weaviate`        | Enterprise graph+vector |
| Milvus             | `milvus`          | Large-scale |
| Elasticsearch      | `elasticsearch`   | Existing ES stack |
| OpenSearch         | `opensearch`      | Existing OS stack |
| FAISS              | `faiss`           | Local, no infra |
| Upstash Vector     | `upstash-vector`  | Serverless |
| Cloudflare         | `vectorize`       | Cloudflare Workers stack |
| Vertex AI          | `vertex_ai`       | GCP |
| Databricks         | `databricks`      | Delta Lake |
| S3 Vectors         | `s3_vectors`      | AWS S3 |
| Azure AI Search    | `azure`           | Azure stack |
| Cassandra          | `cassandra`       | Wide-column |
| Turbopuffer        | `turbopuffer`     | Serverless |

**Qdrant (local) example:**
```python
"vector_store": {
    "provider": "qdrant",
    "config": {
        "host": "localhost",
        "port": 6333,
        "collection_name": "my_memories",
        "embedding_model_dims": 1536
    }
}
```

**Qdrant (cloud) example:**
```python
"vector_store": {
    "provider": "qdrant",
    "config": {
        "url": "https://your-cluster.cloud.qdrant.io",
        "api_key": "your-qdrant-api-key",
        "collection_name": "memories"
    }
}
```

**PGVector example:**
```python
"vector_store": {
    "provider": "pgvector",
    "config": {
        "dbname": "mem0",
        "user": "postgres",
        "password": "your-password",
        "host": "localhost",
        "port": 5432
    }
}
```

**Pinecone example:**
```python
"vector_store": {
    "provider": "pinecone",
    "config": {
        "api_key": "your-pinecone-api-key",
        "index_name": "mem0-memories",
        "embedding_model_dims": 1536
    }
}
```

---

## Reranker Providers

| Provider             | `provider` key       | Notes |
|----------------------|----------------------|-------|
| Cohere               | `cohere`             | `COHERE_API_KEY`, best quality |
| Sentence Transformer | `sentence_transformer`| Local cross-encoder |
| Hugging Face         | `huggingface`        | HF-hosted rerankers |
| LLM (prompted)       | `llm`                | Use an LLM as reranker |
| Zero Entropy         | `zero_entropy`       | `ZERO_ENTROPY_API_KEY` |

**Cohere example:**
```python
"reranker": {
    "provider": "cohere",
    "config": {
        "model": "rerank-english-v3.0",
        "api_key": "your-cohere-api-key",
        "top_n": 5
    }
}
```

**Local (Sentence Transformer) example:**
```python
"reranker": {
    "provider": "sentence_transformer",
    "config": {
        "model": "cross-encoder/ms-marco-MiniLM-L-6-v2"
    }
}
```

---

## Full Self-Hosted Stack Example

```python
import os
from mem0 import Memory

config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": os.getenv("QDRANT_HOST", "localhost"),
            "port": 6333,
            "api_key": os.getenv("QDRANT_API_KEY"),
            "collection_name": "agent_memories",
            "embedding_model_dims": 1536,
        },
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4.1-mini",
            "temperature": 0.1,
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    },
    "reranker": {
        "provider": "cohere",
        "config": {
            "model": "rerank-english-v3.0",
            "api_key": os.getenv("COHERE_API_KEY"),
        },
    },
}

memory = Memory.from_config(config)
```

---

## REST API Server (Self-Hosted)

Mem0 OSS includes a FastAPI server + dashboard via Docker Compose:

```bash
git clone https://github.com/mem0ai/mem0.git
cd mem0
docker compose up -d
```

Dashboard: `http://localhost:3000`  
API: `http://localhost:8000`

The self-hosted server exposes the same REST interface as the Platform API, minus Platform-only features (advanced retrieval, webhooks, organizations).

---

## OSS vs Platform Feature Comparison

| Feature                    | OSS | Platform |
|----------------------------|-----|----------|
| Core CRUD                  | ✅  | ✅ |
| Semantic search            | ✅  | ✅ |
| Custom LLM/embedder/vector | ✅  | ❌ (managed) |
| Metadata filtering         | ✅  | ✅ |
| Reranker                   | ✅  | ✅ (managed) |
| Advanced hybrid retrieval  | ❌  | ✅ |
| Custom categories          | ✅  | ✅ |
| Webhooks                   | ❌  | ✅ |
| Organizations/Projects     | ❌  | ✅ |
| MCP server (hosted)        | ❌  | ✅ |
| Dashboard                  | Self-hosted | ✅ |
| Graph memory               | ✅  | Coming soon |
| Memory decay               | ❌  | ✅ |
| Temporal reasoning         | ❌  | ✅ |
| Async client               | ✅ (AsyncMemory) | ✅ |
| Multimodal (images/PDFs)   | ✅  | ✅ |

**Choose Platform when:** you want managed infra, sub-50ms retrieval, webhooks, orgs/projects  
**Choose OSS when:** you need full data control, custom providers, on-prem, or no API cost

Migration guide: https://docs.mem0.ai/migration/oss-to-platform
