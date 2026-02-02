# Quickstart: Background AI Task Runner

This guide gets you from zero to running AI tasks in under 5 minutes.

## Prerequisites

- VS Code 1.85.0 or later
- GitHub Copilot extension installed and authenticated
- Active GitHub Copilot subscription

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Cmd+Shift+X on Mac) to open Extensions
3. Search for "Background AI Tasks"
4. Click **Install**

### From VSIX (Development)

```bash
code --install-extension background-ai-tasks-0.1.0.vsix
```

## Basic Usage

### 1. Start Your First Task

1. Open any code file
2. Select some code (or place cursor on a line)
3. Press `Ctrl+Shift+A` (Cmd+Shift+A on Mac)
4. Type your instruction (e.g., "implement this interface")
5. Press Enter

**That's it!** The task runs in the background while you continue working.

### 2. Monitor Tasks

Look for the **AI Tasks** panel in the Explorer sidebar. You'll see:

- 🔄 **Spinning icon** - Task is processing
- ✅ **Checkmark** - Task completed
- ❌ **X mark** - Task failed
- ⏸️ **Pause icon** - Task queued

### 3. Review & Apply Results

When a task completes:

1. A notification appears (click it, or click the task in the panel)
2. Review the generated code in the diff view
3. Click **Apply** to accept, or **Dismiss** to reject

## Alternative Trigger Methods

### Context Menu

1. Select code in the editor
2. Right-click
3. Choose **"AI Task: Process Selection"**

### Command Palette

1. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
2. Type "Background AI"
3. Select **"Background AI: Start Task"**

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Start new task | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| Cancel all tasks | `Ctrl+Shift+Escape` | `Cmd+Shift+Escape` |

## Configuration

### VS Code Settings

Open Settings (`Ctrl+,`) and search for "Background AI":

| Setting | Default | Description |
|---------|---------|-------------|
| `backgroundAI.maxConcurrentTasks` | 3 | How many tasks can run at once |
| `backgroundAI.autoShowDiff` | true | Show diff when task completes |
| `backgroundAI.notificationStyle` | toast | How to notify (toast/statusBar/silent) |

### Workspace Configuration

Create `.background-ai.json` in your workspace root for project-specific settings:

```json
{
  "version": "1.0",
  "contextFiles": [
    "./docs/architecture.md",
    "./.cursor/rules"
  ],
  "rulesFile": "./ai-guidelines.md",
  "defaultPromptPrefix": "Follow our TypeScript standards. Prefer functional patterns."
}
```

## Common Tasks

### Implement an Interface

```typescript
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserDto): Promise<User>;
}
// Select the interface, press Ctrl+Shift+A, type "implement this"
```

### Add Error Handling

```python
def fetch_data(url):
    response = requests.get(url)
    return response.json()
# Select the function, type "add proper error handling with retries"
```

### Generate Tests

```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
// Select the function, type "generate unit tests with jest"
```

### Refactor Code

```typescript
// Select a code block, type "refactor to use async/await instead of callbacks"
```

## Troubleshooting

### "Copilot not available"

1. Ensure GitHub Copilot extension is installed
2. Sign in to GitHub (click Copilot icon in status bar)
3. Verify your Copilot subscription is active

### Task stuck in "Queued"

1. Check if max concurrent tasks is reached
2. Wait for running tasks to complete
3. Or cancel some tasks with right-click → Cancel

### Generated code looks wrong

1. Be more specific in your prompt
2. Add context files in `.background-ai.json`
3. Include coding standards in `rulesFile`

## Next Steps

- Explore all commands in the Command Palette
- Set up workspace configuration for your project
- Check the [full documentation](./docs/README.md) for advanced features

---

**Need help?** Open an issue on [GitHub](https://github.com/your-org/background-ai-tasks/issues)
