# Chipmunk Guide

## Overview

Chipmunk is a JavaScript/TypeScript HTTP client library designed for interacting with REST APIs that follow JSON-LD and JSON Schema specifications. It provides a high-level abstraction for making API calls, handling associations, caching, and managing request lifecycle.

## Key Features

Chipmunk provides several unique features over libraries that would require significant custom code to implement with libraries like axios alone:

#### **1. Specification-Driven API Discovery**
- **Axios**: You need to know the exact URL, method, and parameters for each API call
- **Chipmunk**: Automatically fetches JSON-LD contexts and JSON Schemas to understand:
  - Available actions (GET, POST, etc.)
  - Required parameters and their types
  - Data structure and relationships
  - Template URLs with variable substitution

```javascript
// With axios - you need to know everything upfront
axios.get('https://api.example.com/v1/users?page=1&per_page=20');

// With chipmunk - it discovers the API structure
const result = await chipmunk.action('um.user', 'query', {
  params: { page: 1, per_page: 20 }
});
```

#### **2. Automatic Association Resolution**
- **Axios**: You make separate requests for each related piece of data
- **Chipmunk**: Automatically fetches related data based on schema definitions

```javascript
// With axios - multiple manual requests
const user = await axios.get('/users/123');
const org = await axios.get(`/organizations/${user.data.organization_id}`);
const geoScopes = await Promise.all(
  user.data.geo_scope_ids.map(id => axios.get(`/geo_scopes/${id}`))
);

// With chipmunk - one request with schema
const result = await chipmunk.action('um.user', 'get', {
  params: { user_ids: 123 },
  schema: 'id, name, organization { name, type }, geo_scopes { code, name }'
});
// All related data is automatically fetched and nested
```

#### **3. Intelligent Caching with Context Awareness**
- **Axios**: Basic caching requires manual implementation
- **Chipmunk**: Context-aware caching that considers:
  - User session, role, and affiliation
  - Automatic cache key generation
  - Runtime and persistent storage options
  - Cache invalidation patterns

```javascript
// Chipmunk automatically creates cache keys based on user context
// Different users/roles get separate cache spaces
chipmunk.cache.set('users', userData); // Key becomes: "role-123-users"
```

#### **4. Request Lifecycle Management**
- **Axios**: Each request is independent
- **Chipmunk**: Tracks pending requests, prevents duplicates, and manages cleanup

```javascript
// Chipmunk prevents duplicate requests for the same resource
const req1 = chipmunk.action('um.user', 'query'); // Makes request
const req2 = chipmunk.action('um.user', 'query'); // Reuses pending request
// Both resolve to the same result
```

**Note:**
If you use request deduplication (i.e., multiple calls to the same action return the same promise), make sure at least one of the returned promises is awaited or has a `.catch()` handler. Otherwise, if the request fails, it may result in an unhandled promise rejection.

**Example:**
```js
const req1 = chipmunk.action('um.user', 'query');
const req2 = chipmunk.action('um.user', 'query');
await req1; // or req2
// or
req1.catch(() => {});
req2.catch(() => {});
```

#### **5. Data Formatting and Cleanup**
- **Axios**: Returns raw API responses
- **Chipmunk**: Automatically cleans and formats data:
  - Removes functions and empty objects
  - Handles nested associations
  - Supports Rails compatibility mode
  - Formats aggregations and pagination

#### **6. SSRF Protection and Security**
- **Axios**: No built-in protection against SSRF attacks
- **Chipmunk**: Whitelist-based URL validation prevents malicious redirects

#### **7. AbortController Integration**
- **Axios**: Supports AbortController but requires manual setup
- **Chipmunk**: Built-in AbortController management with:
  - Global abort for all requests
  - Per-request abort signals
  - Abort during association resolution
  - Automatic cleanup

#### **8. Error Handling and Interceptors**
- **Axios**: Basic error handling
- **Chipmunk**: Sophisticated error handling with:
  - Global error interceptors
  - Request-specific error handling
  - Structured error objects with context

#### **9. Multi-API Coordination**
- **Axios**: Each API requires separate configuration
- **Chipmunk**: Unified interface for multiple APIs with:
  - Shared configuration
  - Cross-API association resolution
  - Consistent error handling
  - Unified caching strategy

### Summary

Chipmunk is essentially a **high-level API client framework** that provides:

- **API Discovery**: Automatically learns about available endpoints and data structures
- **Data Relationship Management**: Handles complex nested data fetching automatically
- **Performance Optimization**: Intelligent caching and request deduplication
- **Developer Experience**: Simple, declarative API that hides HTTP complexity
- **Security**: Built-in protections against common vulnerabilities
- **Consistency**: Unified interface across different API patterns and providers

This justifies the custom library because implementing all these features with axios alone would require thousands of lines of custom code and significant maintenance overhead.

## Architecture

### Core Modules

```
src/
├── index.ts          # Main entry point and public API
├── action.ts         # Core action execution logic
├── request.ts        # HTTP request handling (axios wrapper)
├── spec.ts           # API specification fetching and parsing
├── association.ts    # Association resolution and data linking
├── cache.ts          # Caching system (runtime + localStorage)
├── config.ts         # Configuration management
├── watcher.ts        # Request lifecycle management
├── schema.ts         # Schema parsing utilities
├── format.ts         # Data formatting and cleanup
├── unfurl.ts         # Pagination handling
└── bundle.ts         # Browser bundle setup
```

### Data Flow

1. **Configuration** → Set up endpoints, headers, cache settings
2. **Spec Fetching** → Download API specifications (JSON-LD/JSON Schema)
3. **Action Execution** → Make HTTP requests with proper formatting
4. **Association Resolution** → Fetch related data if schema is provided
5. **Response Processing** → Format and cache results
6. **Result Return** → Return structured data with metadata

## Feature Details

### 1. Raw Mode (`raw: true`)

**What it does:**
- Skips association processing and context resolution
- Still returns data wrapped in `IResult` structure
- Does NOT return the raw axios response

**When to use:**
- When you need the raw API response without chipmunk's processing
- For proxy requests where you want to pass through data as-is
- When you don't need association resolution

```javascript
const result = await chipmunk.action('tuco.request', 'task', {
  raw: true,
  body: { task: 'some-task', config: cleanConfig(chipmunk.currentConfig()) }
});
// result.objects[0] contains the raw response data
```

### 2. Perform Later (`performLater`)

**What it does:**
- Queues functions to execute after all pending requests complete
- Uses a 50ms delay to ensure requests have time to start
- Useful for cleanup or follow-up operations

**Implementation:**
```javascript
// In watcher.ts
export const enqueuePerformLater = (cb: Function, config: IConfig): void => {
  delay(() => {
    config.watcher.performLaterHandlers.push(cb);
    next(config);
  }, 50);
};
```

**Usage:**
```javascript
chipmunk.performLater(() => {
  console.log('All requests completed');
});
```

### 3. Caching System

**Two cache engines:**
- **Runtime**: In-memory cache (default)
- **Storage**: localStorage (browser only)

**Features:**
- Automatic expiration (default: 60 minutes)
- Prefix-based key management
- Wildcard deletion (`key*` pattern)
- Configurable per-operation

```javascript
// Cache operations
chipmunk.cache.set('users', userData, { expires: 30 });
const users = chipmunk.cache.get('users');
chipmunk.cache.remove('users*'); // Remove all keys starting with 'users'
```

### 4. Association Resolution

**How it works:**
1. Parses schema string (e.g., `"id, organization { name }"`)
2. Identifies association references in response data
3. Fetches associated data from appropriate endpoints
4. Assigns resolved data back to original objects

**Schema syntax:**
```javascript
// Simple properties
schema: 'id, name, email'

// Nested associations
schema: 'id, organization { name, type }, geo_scopes { code, name }'

// Array associations
schema: 'id, products { name, price }'
```

**Implementation details:**
- Supports both JSON-LD (`@associations`) and JSON Schema (`$links`) formats
- Handles has-many and belongs-to relationships
- Optimizes requests by batching association fetches
- Respects AbortController for cancellation

### 5. AbortController Support

**Features:**
- Global abort controller per chipmunk instance
- Per-request abort signals
- Abort during association resolution
- Proper cleanup of pending requests

```javascript
// Global abort
const controller = chipmunk.createAbortController();
// ... make requests ...
chipmunk.abort(); // Cancels all pending requests

// Per-request abort
const controller = new AbortController();
const result = await chipmunk.action('um.user', 'query', {
  signal: controller.signal
});
controller.abort(); // Cancels only this request
```

### 6. Request Lifecycle Management

**Pending request tracking:**
- Each request gets a unique key
- Requests are tracked in `config.watcher.pendingRequests`
- Used for deduplication and cleanup

**SSRF Protection:**
- Whitelist-based URL validation
- Only allows requests to configured endpoints
- Prevents malicious redirects

### 7. Data Formatting

**Cleanup process:**
- Removes functions and empty objects
- Handles nested arrays and objects
- Supports Ruby on Rails compatibility mode (`ROR: true`)

**ROR mode:**
- Converts `_ids` strings to arrays
- Adds `_attributes` suffix to nested objects
- Maintains Rails compatibility

### 8. Pagination and Search

Chipmunk provides two main ways to handle pagination and data retrieval:

#### **A. Controlled Pagination and Search (Recommended)**

Use the `search` action for models like `um.user` to perform advanced, paginated, and filtered queries. This action supports a wide range of parameters, including:
- **Pagination:** `page`, `per`
- **Sorting:** `sort`, `order`
- **Flags:** `include_deleted`, `include_internal_accounts`, etc.
- **Advanced Filtering:** `search: { filters: ... }`
- **Aggregations/Stats:** `stats: ...`

The `search` action is backed by Elasticsearch, enabling powerful full-text search, filtering, and analytics in a single request.

**Example:**
```js
const result = await chipmunk.action('um.user', 'search', {
  body: {
    per: 20,
    page: 1,
    sort: 'created_at',
    include_deleted: false,
    search: {
      filters: [['role', 'eq', 'admin']],
    },
    // stats: { ... } // aggregations if needed
  },
  schema: 'id, name, role',
});
// result.objects contains the users
// result.pagination contains pagination info
// result.aggregations contains stats if requested
```

#### **B. Loading All Data with Unfurl**

If you need to load **all pages of data automatically**, you can use the `unfurl` helper. This will make multiple requests behind the scenes to fetch every page and combine the results into a single response.

**Caution:** This is **not recommended for large datasets** as it may result in high memory usage and long load times.

**Example:**
```js
const allResults = await chipmunk.unfurl('um.user', 'search', {
  body: {
    per: 100,
    include_deleted: false,
    search: {
      filters: [['role', 'eq', 'admin']],
    },
  },
  schema: 'id, name, role',
});
// allResults.objects contains all users across all pages
```

**Summary:**
- Use the `search` action with `chipmunk.action` for controlled, paginated, and filtered queries—this is the recommended and most flexible approach.
- Use `unfurl` only if you truly need to load all data at once, and be mindful of the potential performance impact.

## Error Handling

### Error Types

```typescript
interface IRequestError extends Error {
  message: string;
  status?: number;
  text?: string;
  object?: any;
  url?: string;
}
```

### Error Interceptors

```javascript
// Global error interceptor
chipmunk.updateConfig({
  errorInterceptor: (error) => {
    if (error.status === 401) {
      // Handle authentication
      return true; // Prevent default handling
    }
    return false; // Use default handling
  }
});

// Per-request error handling
try {
  const result = await chipmunk.action('um.user', 'query');
} catch (error) {
  console.error('Request failed:', error.message);
}
```

## Common Patterns

### Proxy Requests

```javascript
// Using tuco proxy
export const tuco = (task: string, opts?: any) => (
  chipmunk.action(`tuco.request`, `task`, {
    raw: true,
    body: {
      task,
      opts,
      config: cleanConfig(chipmunk.currentConfig()),
    },
  })
);
```

### Batch Operations

```javascript
// Multiple requests with shared abort controller
const controller = chipmunk.createAbortController();
const promises = [
  chipmunk.action('um.user', 'query', { signal: controller.signal }),
  chipmunk.action('um.organization', 'query', { signal: controller.signal })
];
const results = await Promise.all(promises);
```

### Schema-Driven Queries

```javascript
// Complex association resolution
const result = await chipmunk.action('um.user', 'query', {
  schema: `
    id,
    name,
    organization {
      id,
      name,
      geo_scopes {
        code,
        name
      }
    },
    products {
      id,
      name,
      category {
        name
      }
    }
  `
});
```

## Troubleshooting

### Debug Mode

```javascript
chipmunk.updateConfig({ verbose: true });
// Enables detailed request/response logging
```

---

This guide covers the core functionality of chipmunk. For specific implementation details, refer to the source code and test files.
