---
name: create-extension
description: Create a pi extension for this project. Use when the user wants to add custom tools, commands, event handlers, or UI interactions to pi.
---

# Create Extension

Create pi extensions that add custom tools, commands, event handlers, and UI interactions.

## Extension Locations

| Location                      | Scope                                          |
| ----------------------------- | ---------------------------------------------- |
| `.pi/extensions/*.ts`         | Project-local                                  |
| `.pi/extensions/*/index.ts`   | Project-local (subdirectory with dependencies) |
| `~/.pi/agent/extensions/*.ts` | Global (all projects)                          |

## Available Imports

```typescript
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox'; // Schema definitions for tool parameters
import { StringEnum } from '@mariozechner/pi-ai'; // Google-compatible enums
```

Node.js built-ins (`node:fs`, `node:path`, etc.) are also available.

## Basic Extension Template

```typescript
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox';

export default function (pi: ExtensionAPI) {
  // Subscribe to events
  pi.on('session_start', async (_event, ctx) => {
    ctx.ui.notify('Extension loaded!', 'info');
  });

  // Register a custom tool (callable by the LLM)
  pi.registerTool({
    name: 'my_tool',
    label: 'My Tool',
    description: 'What this tool does',
    parameters: Type.Object({
      input: Type.String({ description: 'The input to process' }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: 'text', text: `Result: ${params.input}` }],
        details: {},
      };
    },
  });

  // Register a command (user-invoked via /command)
  pi.registerCommand('mycommand', {
    description: 'Description shown in command list',
    handler: async (args, ctx) => {
      ctx.ui.notify(`Command executed with: ${args}`, 'info');
    },
  });
}
```

## Key Capabilities

### Event Handlers

```typescript
// Block dangerous operations
pi.on('tool_call', async (event, ctx) => {
  if (event.toolName === 'bash' && event.input.command?.includes('rm -rf')) {
    const ok = await ctx.ui.confirm('Dangerous!', 'Allow rm -rf?');
    if (!ok) return { block: true, reason: 'Blocked by user' };
  }
});

// Inject context before agent starts
pi.on('before_agent_start', async (event, ctx) => {
  return {
    systemPrompt: event.systemPrompt + '\n\nExtra instructions...',
  };
});

// Cleanup on shutdown
pi.on('session_shutdown', async (_event, ctx) => {
  // Save state, close connections, etc.
});
```

### UI Methods (via ctx.ui)

```typescript
// Notifications
ctx.ui.notify('Message', 'info'); // "info" | "success" | "warning" | "error"

// Prompts (blocking, returns user input)
const ok = await ctx.ui.confirm('Title', 'Are you sure?');
const choice = await ctx.ui.select('Pick one:', ['a', 'b', 'c']);
const text = await ctx.ui.input('Enter value:', 'default');

// Status indicators
ctx.ui.setStatus('my-ext', 'Processing...'); // Footer status
ctx.ui.setWidget('my-ext', ['Line 1', 'Line 2']); // Widget above editor
```

### Tool Parameters with TypeBox

```typescript
import { Type } from '@sinclair/typebox';
import { StringEnum } from '@mariozechner/pi-ai';

parameters: Type.Object({
  // Required string
  name: Type.String({ description: 'The name' }),

  // Optional string
  description: Type.Optional(Type.String()),

  // Enum (use StringEnum for Google compatibility)
  action: StringEnum(['create', 'update', 'delete'] as const),

  // Number with constraints
  count: Type.Number({ minimum: 1, maximum: 100 }),

  // Boolean
  force: Type.Boolean({ default: false }),

  // Array
  tags: Type.Array(Type.String()),
});
```

### Keyboard Shortcuts

```typescript
pi.registerShortcut('ctrl+shift+p', {
  description: 'Toggle my feature',
  handler: async (ctx) => {
    ctx.ui.notify('Shortcut triggered!');
  },
});
```

## Common Events

| Event                       | Description                          |
| --------------------------- | ------------------------------------ |
| `session_start`             | Session started/loaded/reloaded      |
| `session_shutdown`          | Pi exiting                           |
| `tool_call`                 | Before tool executes (can block)     |
| `tool_result`               | After tool executes (can modify)     |
| `before_agent_start`        | Before LLM call (can inject context) |
| `agent_start` / `agent_end` | Agent turn lifecycle                 |
| `input`                     | User input received (can transform)  |

## Extension with Dependencies

For extensions needing npm packages, use a subdirectory:

```
.pi/extensions/my-extension/
├── package.json
├── node_modules/
└── index.ts
```

```json
// package.json
{
  "name": "my-extension",
  "dependencies": {
    "lodash": "^4.17.0"
  },
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

Run `npm install` in the extension directory.

## Testing

Test with the `-e` flag before placing in `.pi/extensions/`:

```bash
pi -e ./my-extension.ts
```

Use `/reload` to hot-reload after changes.
