# Changelog

All notable changes to the "Background AI Tasks" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added

- Initial release of Background AI Tasks
- **Core Features**:
  - Start AI tasks from text selection with `Ctrl+Shift+A` (Cmd+Shift+A on Mac)
  - Context menu integration for right-click task creation
  - Background task processing using GitHub Copilot
  - Diff view for reviewing AI-generated code
  - Apply or dismiss AI results with a single click

- **Task Management**:
  - AI Tasks panel in Explorer sidebar
  - Visual status indicators for queued, running, completed, and failed tasks
  - Cancel individual or all tasks
  - Retry failed tasks
  - Clear task history

- **UI/UX**:
  - Status bar showing task counts and progress
  - Notifications on task completion
  - Configurable auto-show diff on completion
  - Tooltip with task details in the panel

- **Configuration**:
  - `maxConcurrentTasks`: Control parallel task processing
  - `autoShowDiff`: Auto-open diff view on completion
  - `includeFullContext`: Include surrounding code for context
  - `maxContextLines`: Limit context size
  - `showStatusBarProgress`: Toggle status bar visibility
  - `autoArchiveAfterApply`: Auto-archive applied tasks
  - `logLevel`: Control logging verbosity

### Technical Details

- Built on VS Code Language Model API (vscode.lm)
- Uses TextDocumentContentProvider for virtual diff documents
- Event-driven architecture with typed EventBus
- Supports VS Code 1.85.0 and later

---

## [Unreleased]

### Planned

- Task persistence across VS Code restarts
- Workspace configuration file support (`.background-ai.json`)
- Custom prompt templates
- Integration with workspace rules and guidelines
- Streaming progress indicator
- Task history export

---

[0.1.0]: https://github.com/your-org/background-ai-tasks/releases/tag/v0.1.0
[Unreleased]: https://github.com/your-org/background-ai-tasks/compare/v0.1.0...HEAD
