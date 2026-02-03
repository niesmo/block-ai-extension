# Implementation Plan: Inline Task Feedback

**Branch**: `002-inline-task-feedback` | **Date**: February 2, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-inline-task-feedback/spec.md`

## Summary

Enhance user interaction with the Background AI Tasks extension by adding two key capabilities:
1. **Inline Pending Status Indicator**: Display a visual indicator directly above selected code when an AI task is processing, providing immediate contextual feedback
2. **Inline Code Preview with Accept/Reject**: Show AI-generated code changes directly in the editor with clear visual distinction and Accept/Reject controls, eliminating the need to navigate to separate views

Technical approach leverages VS Code's decoration APIs (TextEditorDecorationType) for pending indicators and CodeLens for action buttons, combined with tracked positions that survive document edits.

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target)  
**Primary Dependencies**: VS Code Extension API ^1.85.0, existing services (EventBus, TaskQueue, CopilotService)  
**Storage**: VS Code ExtensionContext.workspaceState for persistence (P3 feature)  
**Testing**: VS Code Extension Test framework (@vscode/test-electron)  
**Target Platform**: VS Code Desktop (Windows, macOS, Linux)  
**Project Type**: Single project (VS Code extension)  
**Performance Goals**: Pending indicator visible within 500ms of task submission; Editor remains responsive with 5+ simultaneous indicators  
**Constraints**: Must integrate with existing EventBus event system; Must support both light and dark themes  
**Scale/Scope**: Support up to 10 concurrent inline indicators per editor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template has not been customized for this project. No specific gates are defined.

**Status**: ✅ PASS (no custom constraints defined)

## Project Structure

### Documentation (this feature)

```text
specs/002-inline-task-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 output - VS Code API research
├── data-model.md        # Phase 1 output - Entity definitions
├── quickstart.md        # Phase 1 output - Implementation guide
├── contracts/           # Phase 1 output - TypeScript interfaces
│   ├── types.ts         # Core type definitions
│   ├── events.ts        # Event payload types
│   ├── commands.ts      # Command definitions
│   └── configuration.ts # Settings schema
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── task.ts              # Existing - extend if needed
│   └── inlineIndicator.ts   # NEW: Inline indicator model
├── services/
│   ├── eventBus.ts          # Existing - add new events
│   ├── taskQueue.ts         # Existing - integrate with indicators
│   └── inlineIndicatorService.ts  # NEW: Manages inline indicators
├── providers/
│   ├── taskTreeProvider.ts  # Existing
│   ├── pendingIndicatorProvider.ts   # NEW: Decoration provider
│   └── suggestionCodeLensProvider.ts # NEW: Accept/Reject CodeLens
├── commands/
│   ├── index.ts             # Existing - register new commands
│   ├── acceptSuggestion.ts  # NEW
│   ├── rejectSuggestion.ts  # NEW
│   └── navigateSuggestion.ts # NEW (P2)
└── utils/
    ├── positionTracker.ts   # NEW: Track positions across edits
    └── themeColors.ts       # NEW: Theme-aware color definitions

tests/
├── unit/
│   ├── inlineIndicator.test.ts
│   └── positionTracker.test.ts
└── integration/
    └── inlineFlow.test.ts
```

**Structure Decision**: Extends existing single-project structure. New components follow established patterns (services/, providers/, commands/, models/).

## Complexity Tracking

> No constitution violations to justify.
