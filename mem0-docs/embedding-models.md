Embedding Models
Overview
Mem0 offers support for various embedding models, allowing users to choose the one that best suits their needs.

​
Supported Embedders
See the list of supported embedders below.

The following embedders are supported in the Python implementation. The TypeScript implementation currently only supports OpenAI.

OpenAI
Azure OpenAI
Ollama
Hugging Face
Gemini
Vertex AI
Together
LM Studio
​
Usage
To utilize a embedder, you must provide a configuration to customize its usage. If no configuration is supplied, a default configuration will be applied, and OpenAI will be used as the embedder.

Embedding Models
Configurations
Config in mem0 is a dictionary that specifies the settings for your embedding models. It allows you to customize the behavior and connection details of your chosen embedder.

​
How to define configurations?
The config is defined as an object (or dictionary) with two main keys:

embedder: Specifies the embedder provider and its configuration
provider: The name of the embedder (e.g., “openai”, “ollama”)
config: A nested object or dictionary containing provider-specific settings
​
How to use configurations?
Here’s a general example of how to use the config with mem0:


Python

TypeScript

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "sk-xx"

config = {
    "embedder": {
        "provider": "your_chosen_provider",
        "config": {
            # Provider-specific settings go here
        }
    }
}

m = Memory.from_config(config)
m.add("Your text here", user_id="user", metadata={"category": "example"})
​
Why is Config Needed?
Config is essential for:

Specifying which embedding model to use.
Providing necessary connection details (e.g., model, api_key, embedding_dims).
Ensuring proper initialization and connection to your chosen embedder.
​
Master List of All Params in Config
Here’s a comprehensive list of all parameters that can be used across different embedders:

Python
TypeScript
Parameter	Description	Provider
model	Embedding model to use	All
apiKey	API key of the provider	All
embeddingDims	Dimensions of the embedding model	All

OpenAI
To use OpenAI embedding models, set the OPENAI_API_KEY environment variable. You can obtain the OpenAI API key from the OpenAI Platform.

​
Usage

Python

TypeScript

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your_api_key"

config = {
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-large"
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring OpenAI embedder:

Python
TypeScript
Parameter	Description	Default Value
model	The name of the embedding model to use	text-embedding-3-small
embeddingDims	Dimensions of the embedding model	1536
apiKey	The OpenAI API key	None

Ollama
You can use embedding models from Ollama to run Mem0 locally.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your_api_key" # For LLM

config = {
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "mxbai-embed-large"
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring Ollama embedder:

Parameter	Description	Default Value
model	The name of the OpenAI model to use	nomic-embed-text
embedding_dims	Dimensions of the embedding model	512
ollama_base_url	Base URL for ollama connection	None

Hugging Face
You can use embedding models from Huggingface to run Mem0 locally.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your_api_key" # For LLM

config = {
    "embedder": {
        "provider": "huggingface",
        "config": {
            "model": "multi-qa-MiniLM-L6-cos-v1"
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring Huggingface embedder:

Parameter	Description	Default Value
model	The name of the model to use	multi-qa-MiniLM-L6-cos-v1
embedding_dims	Dimensions of the embedding model	selected_model_dimensions
model_kwargs	Additional arguments for the model	None

Gemini
To use Gemini embedding models, set the GOOGLE_API_KEY environment variables. You can obtain the Gemini API key from here.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["GOOGLE_API_KEY"] = "key"
os.environ["OPENAI_API_KEY"] = "your_api_key" # For LLM

config = {
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": "models/text-embedding-004",
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring Gemini embedder:

Parameter	Description	Default Value
model	The name of the embedding model to use	models/text-embedding-004
embedding_dims	Dimensions of the embedding model	768
api_key	The Gemini API key	None

Lmstudio
You can use embedding models from LM Studio to run Mem0 locally.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your_api_key" # For LLM

config = {
    "embedder": {
        "provider": "lmstudio",
        "config": {
            "model": "nomic-embed-text-v1.5-GGUF/nomic-embed-text-v1.5.f16.gguf"
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring Ollama embedder:

Parameter	Description	Default Value
model	The name of the OpenAI model to use	nomic-embed-text-v1.5-GGUF/nomic-embed-text-v1.5.f16.gguf
embedding_dims	Dimensions of the embedding model	1536
lmstudio_base_url	Base URL for LM Studio connection	http://localhost:1234/v1

Together
To use Together embedding models, set the TOGETHER_API_KEY environment variable. You can obtain the Together API key from the Together Platform.

​
Usage
The embedding_model_dims parameter for vector_store should be set to 768 for Together embedder.

Copy
import os
from mem0 import Memory

os.environ["TOGETHER_API_KEY"] = "your_api_key"
os.environ["OPENAI_API_KEY"] = "your_api_key" # For LLM

config = {
    "embedder": {
        "provider": "together",
        "config": {
            "model": "togethercomputer/m2-bert-80M-8k-retrieval"
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="john")
​
Config
Here are the parameters available for configuring Together embedder:

Parameter	Description	Default Value
model	The name of the embedding model to use	togethercomputer/m2-bert-80M-8k-retrieval
embedding_dims	Dimensions of the embedding model	768
api_key	The Together API key	None