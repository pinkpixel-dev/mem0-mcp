LLMs
Overview
Mem0 includes built-in support for various popular large language models. Memory can utilize the LLM provided by the user, ensuring efficient use for specific needs.

​
Usage
To use a llm, you must provide a configuration to customize its usage. If no configuration is supplied, a default configuration will be applied, and OpenAI will be used as the llm.

For a comprehensive list of available parameters for llm configuration, please refer to Config.

To view all supported llms, visit the Supported LLMs.

All LLMs are supported in Python. The following LLMs are also supported in TypeScript: OpenAI, Anthropic, and Groq.

OpenAI
Ollama
Azure OpenAI
Anthropic
Together
Groq
Litellm
Mistral AI
Google AI
AWS bedrock
Gemini
DeepSeek
xAI
LM Studio
​
Structured vs Unstructured Outputs
Mem0 supports two types of OpenAI LLM formats, each with its own strengths and use cases:

​
Structured Outputs
Structured outputs are LLMs that align with OpenAI’s structured outputs model:

Optimized for: Returning structured responses (e.g., JSON objects)
Benefits: Precise, easily parseable data
Ideal for: Data extraction, form filling, API responses
Learn more: OpenAI Structured Outputs Guide
​
Unstructured Outputs
Unstructured outputs correspond to OpenAI’s standard, free-form text model:

Flexibility: Returns open-ended, natural language responses
Customization: Use the response_format parameter to guide output
Trade-off: Less efficient than structured outputs for specific data needs
Best for: Creative writing, explanations, general conversation
Choose the format that best suits your application’s requirements for optimal performance and usability.

Supported LLMs
OpenAI
To use OpenAI LLM models, you have to set the OPENAI_API_KEY environment variable. You can obtain the OpenAI API key from the OpenAI Platform.

​
Usage

Python

TypeScript

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o",
            "temperature": 0.2,
            "max_tokens": 2000,
        }
    }
}

# Use Openrouter by passing it's api key
# os.environ["OPENROUTER_API_KEY"] = "your-api-key"
# config = {
#    "llm": {
#        "provider": "openai",
#        "config": {
#            "model": "meta-llama/llama-3.1-70b-instruct",
#        }
#    }
# }

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I’m not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="alice", metadata={"category": "movies"})

Anthropic
To use anthropic’s models, please set the ANTHROPIC_API_KEY which you find on their Account Settings Page.

​
Usage

Python

TypeScript

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # used for embedding model
os.environ["ANTHROPIC_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "anthropic",
        "config": {
            "model": "claude-3-7-sonnet-latest",
            "temperature": 0.1,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})

Ollama
You can use LLMs from Ollama to run Mem0 locally. These models support tool support.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # for embedder

config = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "mixtral:8x7b",
            "temperature": 0.1,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})
​
Together
To use TogetherAI LLM models, you have to set the TOGETHER_API_KEY environment variable. You can obtain the TogetherAI API key from their Account settings page.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # used for embedding model
os.environ["TOGETHER_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "together",
        "config": {
            "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "temperature": 0.2,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})

Litellm
Litellm is compatible with over 100 large language models (LLMs), all using a standardized input/output format. You can explore the available models to use with Litellm. Ensure you set the API_KEY for the model you choose to use.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "litellm",
        "config": {
            "model": "gpt-4o-mini",
            "temperature": 0.2,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})

Mistral AI
To use mistral’s models, please Obtain the Mistral AI api key from their console. Set the MISTRAL_API_KEY environment variable to use the model as given below in the example.

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # used for embedding model
os.environ["MISTRAL_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "litellm",
        "config": {
            "model": "open-mixtral-8x7b",
            "temperature": 0.1,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})

Gemini
To use Gemini model, you have to set the GEMINI_API_KEY environment variable. You can obtain the Gemini API key from the Google AI Studio

​
Usage

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # used for embedding model
os.environ["GEMINI_API_KEY"] = "your-api-key"

config = {
    "llm": {
        "provider": "gemini",
        "config": {
            "model": "gemini-1.5-flash-latest",
            "temperature": 0.2,
            "max_tokens": 2000,
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
m.add(messages, user_id="alice", metadata={"category": "movies"})
​
DeepSeek
To use DeepSeek LLM models, you have to set the DEEPSEEK_API_KEY environment variable. You can also optionally set DEEPSEEK_API_BASE if you need to use a different API endpoint (defaults to “https://api.deepseek.com”).

​
Usage

Copy
import os
from mem0 import Memory

os.environ["DEEPSEEK_API_KEY"] = "your-api-key"
os.environ["OPENAI_API_KEY"] = "your-api-key" # for embedder model

config = {
    "llm": {
        "provider": "deepseek",
        "config": {
            "model": "deepseek-chat",  # default model
            "temperature": 0.2,
            "max_tokens": 2000,
            "top_p": 1.0
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
m.add(messages, user_id="alice", metadata={"category": "movies"})

LM Studio
To use LM Studio with Mem0, you’ll need to have LM Studio running locally with its server enabled. LM Studio provides a way to run local LLMs with an OpenAI-compatible API.

​
Usage

Python

Copy
import os
from mem0 import Memory

os.environ["OPENAI_API_KEY"] = "your-api-key" # used for embedding model

config = {
    "llm": {
        "provider": "lmstudio",
        "config": {
            "model": "lmstudio-community/Meta-Llama-3.1-70B-Instruct-GGUF/Meta-Llama-3.1-70B-Instruct-IQ2_M.gguf",
            "temperature": 0.2,
            "max_tokens": 2000,
            "lmstudio_base_url": "http://localhost:1234/v1", # default LM Studio API URL
        }
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I'm not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="alice", metadata={"category": "movies"})
​
Running Completely Locally
You can also use LM Studio for both LLM and embedding to run Mem0 entirely locally:


Copy
from mem0 import Memory

# No external API keys needed!
config = {
    "llm": {
        "provider": "lmstudio"
    },
    "embedder": {
        "provider": "lmstudio"
    }
}

m = Memory.from_config(config)
messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I'm not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]
m.add(messages, user_id="alice123", metadata={"category": "movies"})
When using LM Studio for both LLM and embedding, make sure you have:

An LLM model loaded for generating responses
An embedding model loaded for vector embeddings
The server enabled with the correct endpoints accessible
To use LM Studio, you need to:

Download and install LM Studio
Start a local server from the “Server” tab
Set the appropriate lmstudio_base_url in your configuration (default is usually http://localhost:1234/v1)
​
