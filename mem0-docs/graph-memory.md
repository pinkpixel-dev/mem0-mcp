Graph Memory
Overview
Enhance your memory system with graph-based knowledge representation and retrieval

Mem0 now supports Graph Memory. With Graph Memory, users can now create and utilize complex relationships between pieces of information, allowing for more nuanced and context-aware responses. This integration enables users to leverage the strengths of both vector-based and graph-based approaches, resulting in more accurate and comprehensive information retrieval and generation.

NodeSDK now supports Graph Memory. 🎉

​
Installation
To use Mem0 with Graph Memory support, install it using pip:


Python

TypeScript

Copy
pip install "mem0ai[graph]"
This command installs Mem0 along with the necessary dependencies for graph functionality.

Try Graph Memory on Google Colab.

Open In Colab
​
Initialize Graph Memory
To initialize Graph Memory you’ll need to set up your configuration with graph store providers. Currently, we support Neo4j as a graph store provider. You can setup Neo4j locally or use the hosted Neo4j AuraDB.

If you are using Neo4j locally, then you need to install APOC plugins.
User can also customize the LLM for Graph Memory from the Supported LLM list with three levels of configuration:

Main Configuration: If llm is set in the main config, it will be used for all graph operations.
Graph Store Configuration: If llm is set in the graph_store config, it will override the main config llm and be used specifically for graph operations.
Default Configuration: If no custom LLM is set, the default LLM (gpt-4o-2024-08-06) will be used for all graph operations.
Here’s how you can do it:


Python

TypeScript

Python (Advanced)

TypeScript (Advanced)

Copy
from mem0 import Memory

config = {
    "graph_store": {
        "provider": "neo4j",
        "config": {
            "url": "neo4j+s://xxx",
            "username": "neo4j",
            "password": "xxx"
        }
    }
}

m = Memory.from_config(config_dict=config)
If you are using NodeSDK, you need to pass enableGraph as true in the config object.

​
Graph Operations
The Mem0’s graph supports the following operations:

​
Add Memories
If you are using Mem0 with Graph Memory, it is recommended to pass user_id. Use userId in NodeSDK.


Python

TypeScript

Output

Copy
m.add("I like pizza", user_id="alice")
​
Get all memories

Python

TypeScript

Output

Copy
m.get_all(user_id="alice")
​
Search Memories

Python

TypeScript

Output

Copy
m.search("tell me my name.", user_id="alice")
​
Delete all Memories

Python

TypeScript

Copy
m.delete_all(user_id="alice")
​
Example Usage
Here’s an example of how to use Mem0’s graph operations:

First, we’ll add some memories for a user named Alice.
Then, we’ll visualize how the graph evolves as we add more memories.
You’ll see how entities and relationships are automatically extracted and connected in the graph.
​
Add Memories
Below are the steps to add memories and visualize the graph:

1
Add memory 'I like going to hikes'


Python

TypeScript

Copy
m.add("I like going to hikes", user_id="alice123")
Graph Memory Visualization

2
Add memory 'I love to play badminton'


Python

TypeScript

Copy
m.add("I love to play badminton", user_id="alice123")
Graph Memory Visualization

3
Add memory 'I hate playing badminton'


Python

TypeScript

Copy
m.add("I hate playing badminton", user_id="alice123")
Graph Memory Visualization

4
Add memory 'My friend name is john and john has a dog named tommy'


Python

TypeScript

Copy
m.add("My friend name is john and john has a dog named tommy", user_id="alice123")
Graph Memory Visualization

5
Add memory 'My name is Alice'


Python

TypeScript

Copy
m.add("My name is Alice", user_id="alice123")
Graph Memory Visualization

6
Add memory 'John loves to hike and Harry loves to hike as well'


Python

TypeScript

Copy
m.add("John loves to hike and Harry loves to hike as well", user_id="alice123")
Graph Memory Visualization

7
Add memory 'My friend peter is the spiderman'


Python

TypeScript

Copy
m.add("My friend peter is the spiderman", user_id="alice123")
Graph Memory Visualization

​
Search Memories

Python

TypeScript

Output

Copy
m.search("What is my name?", user_id="alice123")
Below graph visualization shows what nodes and relationships are fetched from the graph for the provided query.

Graph Memory Visualization


Python

TypeScript

Output

Copy
m.search("Who is spiderman?", user_id="alice123")
Graph Memory Visualization

Note: The Graph Memory implementation is not standalone. You will be adding/retrieving memories to the vector store and the graph store simultaneously.

raph Memory
Features
Graph Memory features

Graph Memory is a powerful feature that allows users to create and utilize complex relationships between pieces of information.

​
Graph Memory supports the following features:
A list of features provided by Graph Memory.

​
Add Customize Prompt
Users can add a customized prompt that will be used to extract specific entities from the given input text. This allows for more targeted and relevant information extraction based on the user’s needs. Here’s an example of how to add a customized prompt:


Python

TypeScript

Copy
from mem0 import Memory

config = {
    "graph_store": {
        "provider": "neo4j",
        "config": {
            "url": "neo4j+s://xxx",
            "username": "neo4j",
            "password": "xxx"
        },
        "custom_prompt": "Please only extract entities containing sports related relationships and nothing else.",
    }
}

m = Memory.from_config(config_dict=config)
