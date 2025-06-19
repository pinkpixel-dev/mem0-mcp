# Mem0 MCP Parameter Guide

This guide explains the different parameters available in the Mem0 MCP server and how they relate to Mem0's organization structure.

## Parameter Types

### User Identification
- **`userId`**: Required. Identifies the user whose memories to store/search. 
  - Fallback: `DEFAULT_USER_ID` environment variable
  - Example: `"user123"`

### Session/Conversation Tracking  
- **`sessionId`**: Optional. Groups memories by conversation/session.
  - Maps to `run_id` in Mem0 API
  - Example: `"conversation_abc123"`

### Agent/Assistant Identification
- **`agentId`**: Optional. Identifies which LLM/agent is making the request.
  - Fallback: `DEFAULT_AGENT_ID` environment variable  
  - Example: `"Claude"`, `"GPT-4"`
  - **Note**: This should appear as `"agent_id"` in search results, not `"actor_id"`

### Project/Organization Structure

#### **`appId`** (Legacy Parameter)
- Optional application identifier
- Fallback: `DEFAULT_APP_ID` environment variable
- Creates an "app" entry in Mem0 dashboard
- Example: `"my-chatbot-v1"`

#### **`projectId`** (Recommended for Pro Plans)
- Optional project identifier for Mem0 Pro plan project organization
- Fallback: `DEFAULT_PROJECT_ID` environment variable
- Should use format: `proj_ABC123...`
- **Purpose**: Organizes memories within specific project buckets in Mem0 dashboard
- Example: `"proj_ABC123456789"`

#### **`orgId`** (Organization Level)
- Optional organization identifier for organization-level management
- Fallback: `DEFAULT_ORG_ID` environment variable
- **Purpose**: Manages memories at the organization level
- Example: `"org_XYZ789012345"`

## Common Issues & Solutions

### Issue: `agentId` shows as `"actor_id": null` instead of `"agent_id": "Claude"`
**Possible Causes:**
1. Parameter not being passed correctly to API
2. API response format differences between SDK and direct REST calls
3. Mem0 API version differences

**Debug Steps:**
1. Check the console logs for parameter resolution details
2. Verify the `agentId` parameter is being passed
3. Try using both SDK and direct REST API methods

### Issue: `projectId` doesn't organize memories in correct project bucket
**Solution:**
- Ensure you're using the correct `proj_` format ID from your Mem0 dashboard
- The `projectId` should match exactly what appears in your Mem0 Pro account
- `appId` and `projectId` serve different purposes - use `projectId` for project organization

### Issue: "Missing required argument: userId" even with DEFAULT_USER_ID set
**Solution:**
- Verify the `DEFAULT_USER_ID` environment variable is properly set
- Check that the environment variable is loaded before the MCP server starts
- Explicitly pass `userId` parameter if environment variable approach isn't working

## Environment Variables

Set these in your environment to provide fallback values:

```bash
# Required (one of these approaches)
DEFAULT_USER_ID="your-default-user-id"

# Optional fallbacks
DEFAULT_AGENT_ID="Claude"  # or "GPT-4", etc.
DEFAULT_APP_ID="my-app"
DEFAULT_PROJECT_ID="proj_ABC123456789"  # From your Mem0 dashboard
DEFAULT_ORG_ID="org_XYZ789012345"      # From your Mem0 dashboard
```

## API Parameter Mapping

The MCP server automatically converts camelCase parameters to snake_case for the Mem0 API:

| MCP Parameter | Mem0 API Parameter | Purpose |
|---------------|-------------------|---------|
| `userId` | `user_id` | User identification |
| `sessionId` | `run_id` | Session/conversation tracking |
| `agentId` | `agent_id` | Agent/LLM identification |
| `appId` | `app_id` | Application identification (legacy) |
| `projectId` | `project_id` | Project organization (Pro plans) |
| `orgId` | `org_id` | Organization management |

## Recommended Usage Patterns

### For Individual Users
```json
{
  "content": "User prefers dark mode",
  "userId": "user123",
  "agentId": "Claude"
}
```

### For Project Organization (Pro Plans)
```json
{
  "content": "Customer feedback about product feature",
  "userId": "user123", 
  "projectId": "proj_ABC123456789",
  "agentId": "Claude",
  "metadata": {
    "category": "feedback",
    "product": "main-app"
  }
}
```

### For Organization Management
```json
{
  "content": "Company policy update",
  "userId": "admin123",
  "orgId": "org_XYZ789012345", 
  "projectId": "proj_ABC123456789",
  "agentId": "Claude"
}
```

## Debugging Tips

1. **Enable Debug Logging**: Check console output for parameter resolution details
2. **Test Parameters Individually**: Try each parameter one at a time to isolate issues
3. **Verify API Responses**: Look for the expected field names in search results
4. **Check Mem0 Dashboard**: Verify that memories appear in the expected project/organization buckets
