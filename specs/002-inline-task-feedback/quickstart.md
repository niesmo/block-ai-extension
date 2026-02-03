# Quickstart: Inline Task Feedback

**Feature**: 002-inline-task-feedback  
**Date**: February 2, 2026

## Overview

This guide helps developers quickly understand and start implementing the Inline Task Feedback feature.

---

## Prerequisites

- [ ] Feature 001 (Background AI Tasks) is implemented and working
- [ ] VS Code Extension API ^1.85.0
- [ ] Familiarity with existing codebase structure (EventBus, TaskQueue, etc.)

---

## Key Concepts

### 1. Inline Indicators
Visual elements displayed directly in the editor to show task status:
- **Pending indicator**: Spinner/highlight shown while AI is processing
- **Code suggestion**: Generated code displayed inline with Accept/Reject buttons

### 2. Position Tracking
Decorations must stay anchored to the correct code even when the document is edited:
- Use character offsets (not line numbers) for stability
- `DecorationRangeBehavior.ClosedClosed` prevents range expansion
- Track document changes via `onDidChangeTextDocument`

### 3. Event Integration
All state changes flow through the existing EventBus:
- `task:created` → Create pending indicator
- `task:completed` → Show code suggestion
- `suggestion:accepted/rejected` → Clean up indicator

---

## Implementation Order

### Phase 1: P1 Features (MVP)

1. **InlineIndicatorService** (`src/services/inlineIndicatorService.ts`)
   - Core service managing all indicators
   - State machine for indicator lifecycle
   - Document change tracking

2. **PendingIndicatorProvider** (`src/providers/pendingIndicatorProvider.ts`)
   - Creates TextEditorDecorationType for pending state
   - Applies decorations when indicators are created
   - Removes decorations on state change

3. **SuggestionCodeLensProvider** (`src/providers/suggestionCodeLensProvider.ts`)
   - Provides Accept/Reject CodeLens buttons
   - Updates when suggestions change
   - Handles command execution

4. **Commands** (`src/commands/acceptSuggestion.ts`, `rejectSuggestion.ts`)
   - Accept: Insert code permanently, remove decoration
   - Reject: Remove suggestion, restore original state

### Phase 2: P2 Features

5. **Keyboard Navigation** (`src/commands/navigateSuggestion.ts`)
   - Cycle through visible suggestions
   - Focus management

### Phase 3: P3 Features

6. **Persistence** (update `InlineIndicatorService`)
   - Save to workspaceState
   - Restore on activation

---

## Quick Implementation Snippets

### Creating a Pending Decoration

```typescript
import * as vscode from 'vscode';

const pendingDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  before: {
    contentText: '$(sync~spin) AI Processing...',
    color: new vscode.ThemeColor('editorInfo.foreground'),
  },
  backgroundColor: new vscode.ThemeColor('editor.hoverHighlightBackground'),
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});
```

### Applying Decoration to Editor

```typescript
function showPendingIndicator(editor: vscode.TextEditor, range: vscode.Range): void {
  editor.setDecorations(pendingDecorationType, [{ range }]);
}
```

### CodeLens for Accept/Reject

```typescript
class SuggestionCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const suggestion = this.getSuggestionForDocument(document.uri);
    if (!suggestion) return [];

    const range = this.toVSCodeRange(suggestion.displayRange);
    return [
      new vscode.CodeLens(range, {
        title: '$(check) Accept',
        command: 'backgroundAI.acceptSuggestion',
        arguments: [suggestion.id],
      }),
      new vscode.CodeLens(range, {
        title: '$(x) Reject',
        command: 'backgroundAI.rejectSuggestion',
        arguments: [suggestion.id],
      }),
    ];
  }
}
```

### Integrating with EventBus

```typescript
// In extension.ts activate()
eventBus.on('task:created', (event) => {
  indicatorService.createIndicator(
    event.task.id,
    event.task.context.documentUri,
    event.task.context.selectionRange
  );
});

eventBus.on('task:completed', (event) => {
  const indicator = indicatorService.getIndicatorForTask(event.taskId);
  if (indicator && event.result) {
    indicatorService.showSuggestion(indicator.id, {
      generatedCode: event.result.generatedCode,
      originalSelection: indicator.location.originalRange,
      // ... other fields
    });
  }
});
```

---

## Testing Strategy

### Unit Tests
- `InlineIndicator` state transitions
- `PositionTracker` offset calculations
- Decoration creation/disposal

### Integration Tests
- Full flow: task creation → indicator → suggestion → accept
- Document edit scenarios
- Multiple indicators in same file

### Manual Testing Checklist
- [ ] Submit task, see pending indicator immediately
- [ ] Task completes, see code suggestion with buttons
- [ ] Click Accept, code is inserted
- [ ] Click Reject, suggestion disappears
- [ ] Edit code while indicator is showing
- [ ] Submit multiple tasks to same file
- [ ] Test in both light and dark themes

---

## Files to Create

| File | Priority | Description |
|------|----------|-------------|
| `src/models/inlineIndicator.ts` | P1 | Data model |
| `src/services/inlineIndicatorService.ts` | P1 | Core service |
| `src/providers/pendingIndicatorProvider.ts` | P1 | Decoration provider |
| `src/providers/suggestionCodeLensProvider.ts` | P1 | CodeLens provider |
| `src/commands/acceptSuggestion.ts` | P1 | Accept command |
| `src/commands/rejectSuggestion.ts` | P1 | Reject command |
| `src/utils/positionTracker.ts` | P1 | Position tracking |
| `src/utils/themeColors.ts` | P1 | Theme color definitions |
| `src/commands/navigateSuggestion.ts` | P2 | Navigation commands |

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add commands, keybindings, configuration |
| `src/extension.ts` | Register new providers and commands |
| `src/services/eventBus.ts` | Add new event types |
| `src/commands/index.ts` | Export new commands |

---

## Common Pitfalls

1. **Forgetting to dispose decorations** - Always track and dispose `TextEditorDecorationType` instances
2. **Line number drift** - Use character offsets, not line numbers, for position tracking
3. **Theme incompatibility** - Always use `ThemeColor` for colors, never hardcoded values
4. **CodeLens refresh** - Call `onDidChangeCodeLenses.fire()` when suggestions change
5. **Multiple editors** - Same document can be open in multiple editors; update all of them

---

## Next Steps

After completing this feature:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Create PR for review
3. Update documentation in README.md
