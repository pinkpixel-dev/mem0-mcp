Vector Databases
Overview
Mem0 includes built-in support for various popular databases. Memory can utilize the database provided by the user, ensuring efficient use for specific needs.

​
Supported Vector Databases
See the list of supported vector databases below.

The following vector databases are supported in the Python implementation. The TypeScript implementation currently only supports Qdrant, Redis and in-memory vector database.

Qdrant
Chroma
Pgvector
Milvus
Pinecone
Azure
Redis
Elasticsearch
OpenSearch
Supabase
Vertex AI
Weaviate
FAISS
​
Usage
To utilize a vector database, you must provide a configuration to customize its usage. If no configuration is supplied, a default configuration will be applied, and Qdrant will be used as the vector database.

For a comprehensive list of available parameters for vector database configuration, please refer to Config.

​
Common issues
​
Using model with different dimensions
If you are using customized model, which is having different dimensions other than 1536 for example 768, you may encounter below error:

ValueError: shapes (0,1536) and (768,) not aligned: 1536 (dim 1) != 768 (dim 0)

you could add "embedding_model_dims": 768, to the config of the vector_store to overcome this issue.

Vector Databases
Configurations
​
How to define configurations?
The config is defined as an object with two main keys:

vector_store: Specifies the vector database provider and its configuration
provider: The name of the vector database (e.g., “chroma”, “pgvector”, “qdrant”, “milvus”,“azure_ai_search”, “vertex_ai_vector_search”)
config: A nested dictionary containing provider-specific settings
​
How to Use Config
Here’s a general example of how to use the config with mem0:


Python

TypeScript

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "sk-xx"

config = {
    "vector_store": {
        "provider": "your_chosen_provider",
        "config": {
            # Provider-specific settings go here
        }
    }
}

m = Memory.from_config(config)
m.add("Your text here", user_id="user", metadata={"category": "example"})
The in-memory vector database is only supported in the TypeScript implementation.

​
Why is Config Needed?
Config is essential for:

Specifying which vector database to use.
Providing necessary connection details (e.g., host, port, credentials).
Customizing database-specific settings (e.g., collection name, path).
Ensuring proper initialization and connection to your chosen vector store.
​
Master List of All Params in Config
Here’s a comprehensive list of all parameters that can be used across different vector databases:

Python
TypeScript
Parameter	Description
collectionName	Name of the collection
embeddingModelDims	Dimensions of the embedding model
dimension	Dimensions of the embedding model (for memory provider)
host	Host where the server is running
port	Port where the server is running
url	URL for the server
apiKey	API key for the server
path	Path for the database
onDisk	Enable persistent storage
redisUrl	URL for the Redis server
username	Username for database connection
password	Password for database connection
​
