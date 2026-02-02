# Background AI Tasks

Run AI code generation tasks in the background while you continue coding. Select code, describe what you want, and let AI implement it asynchronously using your existing GitHub Copilot subscription.

## Features

- **Background Processing**: AI tasks run in the background, keeping your editor responsive
- **Quick Trigger**: Use `Ctrl+Shift+A` (Cmd+Shift+A on Mac) or right-click context menu
- **Copilot Integration**: Leverages your existing GitHub Copilot subscription - no additional sign-in required
- **Visual Progress**: Track task status in the dedicated AI Tasks panel
- **Diff Review**: Review AI-generated code in a diff view before applying
- **Multiple Tasks**: Queue multiple AI tasks and process them concurrently

## Requirements

- Visual Studio Code 1.85.0 or later
- Active GitHub Copilot subscription
- GitHub Copilot extension installed and signed in

## Getting Started

1. **Install the extension** from the VS Code Marketplace
2. **Select some code** in your editor
3. **Press `Ctrl+Shift+A`** (or `Cmd+Shift+A` on Mac) or right-click and select "Start AI Task"
4. **Enter your prompt** describing what you want the AI to do
5. **Continue coding** - the task processes in the background
6. **Review the result** when notified, then apply or dismiss the changes

## Usage

### Starting a Task

1. Select code in your editor (or place cursor on a line)
2. Trigger the AI task:
   - **Keyboard**: `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)
   - **Context Menu**: Right-click → "Start AI Task"
   - **Command Palette**: `Background AI: Start AI Task`
3. Enter a prompt describing what you want

Example prompts:
- "Implement this interface"
- "Add error handling"
- "Convert to async/await"
- "Add JSDoc comments"
- "Optimize this function"

### Reviewing Results

When a task completes:
1. A notification appears with "View Result" action
2. Click to open a diff view comparing original and generated code
3. Review the changes
4. Click "Apply Changes" to accept or "Dismiss" to reject

### Task Panel

The "AI Tasks" panel in the Explorer sidebar shows:
- **Queued** tasks waiting to run
- **Running** tasks currently processing
- **Completed** tasks ready for review
- **Failed** tasks that encountered errors

Right-click on tasks to:
- View results (completed tasks)
- Cancel (queued/running tasks)
- Retry (failed tasks)
- Dismiss results

### Status Bar

The status bar shows current task status:
- `$(sync~spin) 1` - One task running
- `$(clock) 2` - Two tasks queued
- `$(check) 3` - Three tasks completed

Click the status bar item to open the AI Tasks panel.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `backgroundAI.maxConcurrentTasks` | 3 | Maximum number of tasks to process simultaneously |
| `backgroundAI.autoShowDiff` | true | Automatically show diff view when task completes |
| `backgroundAI.defaultModel` | "copilot" | Default AI model to use |
| `backgroundAI.includeFullContext` | false | Include surrounding code for better context |
| `backgroundAI.maxContextLines` | 50 | Maximum lines of context to include |
| `backgroundAI.showStatusBarProgress` | true | Show task progress in status bar |
| `backgroundAI.autoArchiveAfterApply` | true | Archive tasks after applying results |
| `backgroundAI.logLevel` | "info" | Logging level (debug, info, warn, error) |

## Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Start AI Task | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| Cancel All Tasks | `Ctrl+Shift+Escape` | `Cmd+Shift+Escape` |

## Troubleshooting

### "No Copilot models available"

Make sure:
1. GitHub Copilot extension is installed
2. You're signed in to GitHub
3. You have an active Copilot subscription

### Tasks are failing

1. Check the Output panel (View → Output → Background AI Tasks)
2. Common issues:
   - Rate limiting: Wait a moment and retry
   - Context too large: Select smaller code blocks
   - Network issues: Check your connection

### Results don't apply correctly

This can happen if the original code was modified since the task was created. The extension will warn you and offer options to apply anyway or review the diff.

## Commands

| Command | Description |
|---------|-------------|
| `Background AI: Start AI Task` | Start a new AI task with selected code |
| `Background AI: Cancel Task` | Cancel a specific task |
| `Background AI: Cancel All Tasks` | Cancel all active tasks |
| `Background AI: View Result` | View the result of a completed task |
| `Background AI: Apply Result` | Apply AI-generated code to the document |
| `Background AI: Dismiss Result` | Dismiss a task result without applying |
| `Background AI: Retry Task` | Retry a failed task |
| `Background AI: Clear History` | Clear archived tasks |
| `Background AI: Show AI Tasks Panel` | Open the AI Tasks panel |

## Privacy

This extension uses GitHub Copilot for AI generation. Your code is sent to GitHub Copilot's servers as per their privacy policy. No additional data is collected or stored by this extension.

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/your-org/background-ai-tasks).

## License

MIT License - see [LICENSE](LICENSE) for details.
