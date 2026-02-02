# Research: Background AI Task Runner for VS Code

**Feature Branch**: `001-background-ai-tasks`  
**Date**: February 2, 2026  
**Status**: Complete

## Research Tasks Summary

| Topic | Decision | Confidence |
|-------|----------|------------|
| Copilot API Access | `vscode.lm.selectChatModels()` with vendor 'copilot' | High |
| Background Processing | `vscode.window.withProgress()` + CancellationToken | High |
| User Prompt Input | `vscode.window.createInputBox()` | High |
| Task Status Panel | TreeView with TreeDataProvider | High |
| Result Preview | Diff Editor via TextDocumentContentProvider | High |
| Extension Language | TypeScript | High |
| Testing Framework | @vscode/test-electron + Mocha | High |

---

## 1. Copilot Language Model API Integration

### Decision: Use `vscode.lm` namespace for Copilot access

The VS Code 1.85+ API provides direct access to language models through the `vscode.lm` namespace. This is the official, supported method for extensions to leverage Copilot's language models.

### Key Findings

#### Model Selection
```typescript
const models = await vscode.lm.selectChatModels({
  vendor: 'copilot',      // Filter to Copilot models
  family: 'gpt-4o'        // Optional: specific model family
});
```

#### Request/Response Pattern
- `LanguageModelChat.sendRequest()` accepts messages, options, and a CancellationToken
- Returns `LanguageModelChatResponse` with async iterable `stream` property
- Supports streaming for real-time progress feedback

#### Authentication
- Copilot authentication is handled automatically through VS Code's authentication framework
- The API will prompt for consent if not already granted
- `extensionContext.languageModelAccessInformation.canSendRequest()` checks access status

#### Error Handling
- `LanguageModelError` provides structured error codes
- Common errors: model not found, consent not given, quota exceeded, off-topic content

### Rationale
- Official VS Code API ensures compatibility and stability
- No need for direct API keys or external authentication
- Streaming support enables responsive UI during generation

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Direct OpenAI API | Requires separate API key, billing, doesn't leverage Copilot subscription |
| Copilot Chat Extension API | Not officially exposed for third-party extension use |
| Local LLMs | Adds complexity, inconsistent quality, device requirements |

---

## 2. Background Task Processing

### Decision: Use `vscode.window.withProgress()` with custom task queue

VS Code's Progress API provides non-blocking, cancellable progress indication without blocking the extension host.

### Key Findings

#### Progress API Options
```typescript
await vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,  // Toast notification
  title: "Processing AI task...",
  cancellable: true
}, async (progress, token) => {
  // Check token.isCancellationRequested periodically
  // Update progress.report({ increment, message })
});
```

#### Non-Blocking Architecture
- All VS Code extension code runs in a single extension host process
- `async/await` naturally yields control back to event loop
- Long-running operations must be chunked or use streaming patterns

#### Cancellation Pattern
```typescript
const cts = new vscode.CancellationTokenSource();
// Pass cts.token to operations
// Call cts.cancel() when user cancels
// Dispose with cts.dispose()
```

### Rationale
- Built-in cancellation support with standard UX patterns
- Progress notifications don't block editor interactions
- CancellationToken integrates with LM API for request cancellation

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Web Workers | Not available in extension host context |
| Separate Node process | Adds IPC complexity, harder debugging |
| setImmediate chunking | Less structured, manual progress tracking |

---

## 3. User Prompt Input Interface

### Decision: Use `vscode.window.createInputBox()` for prompt entry

The InputBox API provides full customization of the input experience with validation, multi-step support, and proper keyboard handling.

### Key Findings

#### InputBox Features
```typescript
const inputBox = vscode.window.createInputBox();
inputBox.title = "Background AI Task";
inputBox.placeholder = "Enter your prompt...";
inputBox.prompt = "Describe what you want the AI to do with the selected code";
inputBox.ignoreFocusOut = true;  // Don't dismiss on focus loss
```

#### Events
- `onDidChangeValue` - Real-time validation
- `onDidAccept` - User confirms (Enter)
- `onDidHide` - Cleanup

#### Quick Pick for Future Extensions
For predefined task types or recent prompts:
```typescript
const quickPick = vscode.window.createQuickPick();
quickPick.items = recentPrompts.map(p => ({ label: p }));
```

### Rationale
- Native VS Code look and feel
- Keyboard-friendly (accessible)
- Supports validation for minimum prompt length

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Webview modal | Heavier, slower to open, inconsistent UX |
| showInputBox() | Less customizable, no real-time validation |
| Inline editor widget | Complex to implement, non-standard |

---

## 4. Task Status Panel

### Decision: TreeView in Activity Bar / Explorer panel

TreeView provides a hierarchical, refreshable list view that integrates naturally with VS Code's sidebar.

### Key Findings

#### TreeDataProvider Pattern
```typescript
class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TaskItem): vscode.TreeItem { ... }
  getChildren(element?: TaskItem): TaskItem[] { ... }
}
```

#### TreeItem Customization
- `iconPath` - ThemeIcon for status (loading~spin, check, error)
- `contextValue` - Enable context menu commands
- `description` - Secondary text (status, time)
- `command` - Click action (open result preview)

#### Registration
```json
{
  "contributes": {
    "views": {
      "explorer": [{
        "id": "backgroundAITasks",
        "name": "AI Tasks"
      }]
    }
  }
}
```

### Rationale
- Standard VS Code pattern users understand
- Automatic refresh with event emitter
- Context menus for cancel/retry actions
- Low overhead compared to WebView

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Status bar only | Not enough space for multiple tasks |
| WebView panel | Heavier, requires HTML/CSS maintenance |
| Output channel | Text-only, no interactivity |

---

## 5. Result Preview and Application

### Decision: Diff Editor with virtual document

VS Code's built-in diff editor shows changes clearly and allows users to review before accepting.

### Key Findings

#### Virtual Document Provider
```typescript
class ResultDocumentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.getResultContent(uri);
  }
}

// Register scheme
vscode.workspace.registerTextDocumentContentProvider('ai-result', provider);
```

#### Showing Diff
```typescript
const originalUri = editor.document.uri;
const resultUri = vscode.Uri.parse(`ai-result:${taskId}`);

await vscode.commands.executeCommand('vscode.diff',
  originalUri,
  resultUri,
  'Original ↔ AI Generated'
);
```

#### Applying Changes
```typescript
const edit = new vscode.WorkspaceEdit();
edit.replace(documentUri, targetRange, newCode);
await vscode.workspace.applyEdit(edit);
```

### Rationale
- Familiar diff UX that developers trust
- No custom UI needed
- Built-in syntax highlighting for any language

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| WebView side panel | Custom UI overhead, no diff highlighting |
| Replace inline directly | No review step, risky |
| Temporary file diff | Leaves artifacts, cleanup complexity |

---

## 6. Extension Project Structure

### Decision: TypeScript with esbuild bundling

Standard VS Code extension structure with modern tooling for fast builds.

### Recommended Structure

```
background-ai-tasks/
├── .vscode/
│   ├── launch.json          # Debug configs
│   ├── tasks.json           # Build tasks
│   └── settings.json
├── src/
│   ├── extension.ts         # activate/deactivate
│   ├── commands/
│   │   ├── startTask.ts     # Command handlers
│   │   ├── cancelTask.ts
│   │   └── applyResult.ts
│   ├── providers/
│   │   ├── taskTreeProvider.ts
│   │   └── resultDocumentProvider.ts
│   ├── services/
│   │   ├── taskQueue.ts     # Task management
│   │   ├── copilotService.ts # LM API wrapper
│   │   └── configService.ts
│   ├── models/
│   │   ├── task.ts          # AITask, TaskStatus
│   │   └── result.ts
│   └── utils/
│       └── logging.ts
├── test/
│   ├── suite/
│   │   └── extension.test.ts
│   └── runTest.ts
├── media/                   # Icons
├── package.json
├── tsconfig.json
└── esbuild.js
```

### Package.json Contributions
```json
{
  "activationEvents": [],
  "contributes": {
    "commands": [...],
    "menus": { "editor/context": [...] },
    "views": { "explorer": [...] },
    "keybindings": [...],
    "configuration": {...}
  }
}
```

### Rationale
- TypeScript for type safety and IDE support
- esbuild for fast builds (< 1s compile)
- Standard structure for maintainability

---

## 7. Testing Approach

### Decision: @vscode/test-electron with Mocha

Official VS Code testing framework that runs tests in actual VS Code instance.

### Key Findings

#### Test Types

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Mocha + sinon | Services, models, utils |
| Integration | @vscode/test-electron | Commands, providers |
| E2E | @vscode/test-electron | Full workflows |

#### Setup
```bash
npm install --save-dev @vscode/test-cli @vscode/test-electron mocha @types/mocha
```

#### Running Tests
```json
{
  "scripts": {
    "test": "vscode-test",
    "test:unit": "mocha --require ts-node/register 'src/**/*.test.ts'"
  }
}
```

### Rationale
- Official support ensures compatibility
- Tests run in real VS Code environment
- Can test actual API interactions

---

## 8. Configuration and Settings

### Decision: VS Code configuration + workspace file

Dual approach: VS Code settings for preferences, workspace file for project-specific context.

### VS Code Settings Schema
```json
{
  "contributes": {
    "configuration": {
      "title": "Background AI Tasks",
      "properties": {
        "backgroundAI.maxConcurrentTasks": {
          "type": "number",
          "default": 3
        },
        "backgroundAI.autoApplyThreshold": {
          "type": "number",
          "description": "Confidence threshold for auto-apply (0-100, 0 = never)"
        }
      }
    }
  }
}
```

### Workspace Configuration File
`.background-ai.json` in workspace root for project-specific settings:
```json
{
  "contextFiles": ["./docs/architecture.md", "./.cursor/rules"],
  "rulesFile": "./ai-guidelines.md",
  "defaultPromptPrefix": "Follow our coding standards..."
}
```

### Rationale
- VS Code settings for user preferences (familiar)
- Workspace file for team-shareable project context
- Both are version-controllable

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to access Copilot? | `vscode.lm.selectChatModels({ vendor: 'copilot' })` |
| How to run background tasks? | Async/await with CancellationToken, Progress API |
| How to show results? | Diff editor with virtual document provider |
| What testing framework? | @vscode/test-electron (official) |
| How to store task state? | In-memory Map, persisted to globalState for recovery |
