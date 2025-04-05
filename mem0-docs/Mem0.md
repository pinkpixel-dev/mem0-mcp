Open Source
Node SDK
Get started with Mem0 quickly!

Welcome to the Mem0 quickstart guide. This guide will help you get up and running with Mem0 in no time.

​
Installation
To install Mem0, you can use npm. Run the following command in your terminal:


Copy
npm install mem0ai
​
Basic Usage
​
Initialize Mem0
Basic
Advanced

Copy
import { Memory } from 'mem0ai/oss';

const memory = new Memory();
​
Store a Memory

Code

Output

Copy
const messages = [
    {"role": "user", "content": "I'm planning to watch a movie tonight. Any recommendations?"},
    {"role": "assistant", "content": "How about a thriller movies? They can be quite engaging."},
    {"role": "user", "content": "I'm not a big fan of thriller movies but I love sci-fi movies."},
    {"role": "assistant", "content": "Got it! I'll avoid thriller recommendations and suggest sci-fi movies in the future."}
]

await memory.add(messages, { userId: "alice", metadata: { category: "movie_recommendations" } });
​
Retrieve Memories

Code

Output

Copy
// Get all memories
const allMemories = await memory.getAll({ userId: "alice" });
console.log(allMemories)


Code

Output

Copy
// Get a single memory by ID
const singleMemory = await memory.get('892db2ae-06d9-49e5-8b3e-585ef9b85b8e');
console.log(singleMemory);
​
Search Memories

Code

Output

Copy
const result = await memory.search('What do you know about me?', { userId: "alice" });
console.log(result);
​
Update a Memory

Code

Output

Copy
const result = await memory.update(
  '892db2ae-06d9-49e5-8b3e-585ef9b85b8e',
  'I love India, it is my favorite country.'
);
console.log(result);
​
Memory History

Code

Output

Copy
const history = await memory.history('892db2ae-06d9-49e5-8b3e-585ef9b85b8e');
console.log(history);
​
Delete Memory

Copy
// Delete a memory by id
await memory.delete('892db2ae-06d9-49e5-8b3e-585ef9b85b8e');

// Delete all memories for a user
await memory.deleteAll({ userId: "alice" });
​
Reset Memory

Copy
await memory.reset(); // Reset all memories
​
History Store
Mem0 TypeScript SDK support history stores to run on a serverless environment:

We recommend using Supabase as a history store for serverless environments or disable history store to run on a serverless environment.


Supabase

Disable History

Copy
import { Memory } from 'mem0ai/oss';

const memory = new Memory({
  historyStore: {
    provider: 'supabase',
    config: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || '',
      tableName: 'memory_history',
    },
  },
});
Mem0 uses SQLite as a default history store.

​
Create Memory History Table in Supabase
You may need to create a memory history table in Supabase to store the history of memories. Use the following SQL command in SQL Editor on the Supabase project dashboard to create a memory history table:


Copy
create table memory_history (
  id text primary key,
  memory_id text not null,
  previous_value text,
  new_value text,
  action text not null,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone,
  is_deleted integer default 0
);
​
Configuration Parameters
Mem0 offers extensive configuration options to customize its behavior according to your needs. These configurations span across different components like vector stores, language models, embedders, and graph stores.


Vector Store Configuration


LLM Configuration


Graph Store Configuration


Embedder Configuration


General Configuration


History Table Configuration


Complete Configuration Example

If you have any questions, please feel free to reach out to us using one of the following methods: