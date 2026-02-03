# Research: Inline Task Feedback

**Feature**: 002-inline-task-feedback  
**Date**: February 2, 2026

## Overview

This document captures research findings for implementing inline pending indicators and inline code suggestions in a VS Code extension.

---

## 1. Pending Status Indicator Approach

### Decision: TextEditorDecorationType with `before` attachment

**Rationale**: VS Code's decoration API provides the most flexible and performant way to display inline visual elements. The `before` attachment option allows rendering content before a line, which is ideal for showing pending status.

**Alternatives Considered**:

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| CodeLens | Native VS Code pattern, clickable | Designed for clickable links, not status indicators; requires provider registration | Overkill for simple status display |
| Virtual Document | Full control over content | Complexity; doesn't integrate inline with user's code | Too disruptive to user workflow |
| Status Bar | Simple, built-in | Not contextual; doesn't show WHERE task is pending | Doesn't meet requirement for inline visibility |

### Implementation Pattern

```typescript
// Create decoration type for pending indicator
const pendingDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  before: {
    contentText: '$(sync~spin) AI Processing...',
    color: new vscode.ThemeColor('editorInfo.foreground'),
    margin: '0 0 0 0',
  },
  backgroundColor: new vscode.ThemeColor('editor.hoverHighlightBackground'),
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});
```

### Key Findings

1. **DecorationRangeBehavior.ClosedClosed** - Ensures decoration stays at original position even when text is inserted before/after
2. **ThemeColor** - Use semantic colors for light/dark theme support
3. **$(icon)** syntax - Product icons can be used in `contentText` for spinning indicators
4. **Performance** - Decorations are lightweight; VS Code handles batching updates efficiently

---

## 2. Inline Code Suggestion Display

### Decision: Hybrid approach - Decorations + Virtual Content via TextEditorEdit

**Rationale**: For showing suggested code with visual distinction, we need to temporarily insert content into the editor while marking it as "suggested" (not yet committed). VS Code doesn't have a native "ghost text" API for arbitrary content, so we use:

1. **Actually insert the code** into the document (as a pending edit)
2. **Apply decorations** to clearly distinguish it from user code
3. **Track the range** for accept/reject operations

**Alternatives Considered**:

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| InlineCompletionProvider | Native ghost text | Triggered by typing only; can't show arbitrary suggestions at arbitrary times | Designed for autocomplete, not async AI results |
| Diff Editor | Built-in diff view | Opens new editor tab; breaks inline flow | Doesn't meet "in same file" requirement |
| Webview Overlay | Full UI control | Complex; doesn't integrate with editor scrolling/editing | Too fragile; poor UX |

### Implementation Pattern

```typescript
// 1. Insert suggested code with edit
await editor.edit(editBuilder => {
  editBuilder.insert(insertPosition, suggestedCode);
});

// 2. Apply decoration to mark as suggestion
const suggestionDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
  border: '1px dashed',
  borderColor: new vscode.ThemeColor('editorInfo.foreground'),
  isWholeLine: true,
});

// 3. Track range for later accept/reject
const suggestionRange = new vscode.Range(insertPosition, endPosition);
```

### Accept/Reject Actions

**Decision**: CodeLens for clickable Accept/Reject buttons

**Rationale**: CodeLens provides native clickable elements that appear inline above code sections, perfect for action buttons.

```typescript
// CodeLens provider for suggestions
class SuggestionCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: TextDocument): CodeLens[] {
    return this.activeSuggestions.map(suggestion => [
      new vscode.CodeLens(suggestion.range, {
        title: '$(check) Accept',
        command: 'backgroundAI.acceptSuggestion',
        arguments: [suggestion.id]
      }),
      new vscode.CodeLens(suggestion.range, {
        title: '$(x) Reject', 
        command: 'backgroundAI.rejectSuggestion',
        arguments: [suggestion.id]
      })
    ]).flat();
  }
}
```

---

## 3. Position Tracking Across Edits

### Decision: Use VS Code's built-in position tracking via `TextDocument.positionAt` and character offsets

**Rationale**: When the document changes, line numbers shift. We need to track the original position reliably.

### Implementation Strategy

1. Store **character offset** (not line number) when indicator is created
2. Use `document.positionAt(offset)` to convert back to Position
3. For decorations, use `DecorationRangeBehavior.ClosedClosed` to prevent range expansion
4. Listen to `vscode.workspace.onDidChangeTextDocument` to update tracked positions

```typescript
interface TrackedPosition {
  documentUri: string;
  originalOffset: number;  // Character offset at creation time
  currentRange: vscode.Range;  // Updated on document changes
}
```

### Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Text inserted before indicator | Indicator moves down (offset increases) |
| Text deleted at indicator line | Show warning; may need to dismiss |
| File closed | Store in workspace state; restore on reopen |
| File externally modified | Re-validate positions; dismiss invalid |

---

## 4. Theme Support

### Decision: Use semantic ThemeColors exclusively

**Rationale**: Semantic colors automatically adapt to light/dark/high-contrast themes.

### Recommended Colors

| Element | Light Theme | Dark Theme | ThemeColor Key |
|---------|-------------|------------|----------------|
| Pending background | Light blue | Dark blue | `editor.hoverHighlightBackground` |
| Pending text | Blue | Light blue | `editorInfo.foreground` |
| Suggestion background | Light green | Dark green | `diffEditor.insertedTextBackground` |
| Suggestion border | Green | Light green | `editorGutter.addedBackground` |
| Reject action | Red | Light red | `editorError.foreground` |

---

## 5. Integration with Existing EventBus

### New Events Required

```typescript
// Add to EventMap in eventBus.ts
interface EventMap {
  // ... existing events ...
  
  // New events for inline indicators
  'indicator:created': IndicatorCreatedEvent;
  'indicator:removed': IndicatorRemovedEvent;
  'suggestion:displayed': SuggestionDisplayedEvent;
  'suggestion:accepted': SuggestionAcceptedEvent;
  'suggestion:rejected': SuggestionRejectedEvent;
}
```

### Event Flow

```
User submits task
    ↓
task:created event (existing)
    ↓
indicator:created event (NEW) → InlineIndicatorService creates pending decoration
    ↓
task:completed event (existing)
    ↓
suggestion:displayed event (NEW) → Replace pending with code suggestion + CodeLens
    ↓
User clicks Accept/Reject
    ↓
suggestion:accepted/rejected event (NEW) → Clean up decorations, optionally persist code
```

---

## 6. Persistence (P3 Feature)

### Decision: ExtensionContext.workspaceState

**Rationale**: Built-in VS Code API for workspace-specific persistent storage.

```typescript
interface PersistedSuggestion {
  taskId: string;
  documentUri: string;
  characterOffset: number;
  suggestedCode: string;
  createdAt: string;
}

// Save
context.workspaceState.update('pendingSuggestions', suggestions);

// Restore on activation
const saved = context.workspaceState.get<PersistedSuggestion[]>('pendingSuggestions');
```

---

## Summary of Technical Decisions

| Decision Area | Choice | Key API |
|---------------|--------|---------|
| Pending Indicator | TextEditorDecorationType with `before` | `window.createTextEditorDecorationType` |
| Suggestion Display | Insert + Decoration | `TextEditorEdit.insert` + decorations |
| Accept/Reject UI | CodeLens | `languages.registerCodeLensProvider` |
| Position Tracking | Character offsets + ClosedClosed behavior | `DecorationRangeBehavior.ClosedClosed` |
| Theme Support | Semantic ThemeColors | `ThemeColor` class |
| Persistence | workspaceState | `ExtensionContext.workspaceState` |

---

## Open Questions Resolved

All NEEDS CLARIFICATION items from Technical Context have been resolved through this research.
