# Data Model: Inline Task Feedback

**Feature**: 002-inline-task-feedback  
**Date**: February 2, 2026

## Overview

This document defines the core entities for the inline task feedback feature, building on existing models from feature 001 (Background AI Tasks).

---

## Entity Relationship Diagram

```
┌─────────────┐       1:1        ┌──────────────────┐
│   AITask    │◄────────────────►│  InlineIndicator │
│  (existing) │                  │     (new)        │
└─────────────┘                  └──────────────────┘
       │                                  │
       │ 1:0..1                          │
       ▼                                  │ 1:0..1
┌─────────────┐                          ▼
│  AIResult   │◄────────────────►┌──────────────────┐
│  (existing) │       1:1       │  CodeSuggestion  │
└─────────────┘                 │     (new)        │
                                └──────────────────┘
```

---

## New Entities

### InlineIndicator

Represents a visual indicator displayed in the editor, associated with a specific code location and AI task.

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string | Unique identifier (UUID) | Yes |
| taskId | string | Reference to associated AITask | Yes |
| state | IndicatorState | Current display state | Yes |
| location | IndicatorLocation | Position in the editor | Yes |
| createdAt | Date | When indicator was created | Yes |
| updatedAt | Date | Last state change timestamp | Yes |

**States**:
- `pending` - Task is processing; show spinner/progress indicator
- `showing-suggestion` - Task completed; displaying code suggestion
- `dismissed` - User rejected or indicator was removed

**Validation Rules**:
- `taskId` must reference an existing AITask
- `state` transitions: pending → showing-suggestion → dismissed, OR pending → dismissed
- Cannot transition backwards (dismissed → pending is invalid)

---

### CodeSuggestion

The AI-generated code response displayed inline, associated with an InlineIndicator.

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string | Unique identifier (UUID) | Yes |
| indicatorId | string | Reference to parent InlineIndicator | Yes |
| generatedCode | string | The AI-suggested code content | Yes |
| originalSelection | string | Original selected text for diff display | Yes |
| insertionType | InsertionType | How the suggestion relates to original | Yes |
| displayRange | Range | Current range where suggestion is displayed | Yes |
| acceptedAt | Date | null | When user accepted (null if not accepted) | No |
| rejectedAt | Date | null | When user rejected (null if not rejected) | No |

**InsertionType Values**:
- `insert` - New code being added (no replacement)
- `replace` - Code replacing the original selection
- `modify` - Partial modifications to original

**Validation Rules**:
- Either `acceptedAt` or `rejectedAt` may be set, but not both
- `generatedCode` must not be empty
- `displayRange` must be valid for the current document state

---

### IndicatorLocation

Position information for where an indicator is anchored in the editor.

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| documentUri | string | URI of the document | Yes |
| characterOffset | number | Character offset from document start (stable across line changes) | Yes |
| originalRange | Range | The original selection range at creation time | Yes |
| currentRange | Range | Updated range after document edits | Yes |
| isValid | boolean | Whether the location is still valid | Yes |

**Validation Rules**:
- `characterOffset` must be >= 0
- `originalRange` and `currentRange` must have valid start/end positions
- `isValid` becomes false if the target location is deleted or significantly altered

---

## Existing Entities (Modified)

### AITask (from feature 001)

**New Field**:
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| inlineIndicatorId | string | null | Reference to associated InlineIndicator | No |

**Rationale**: Bidirectional reference allows looking up the indicator from a task and vice versa.

---

## State Transitions

### Indicator Lifecycle

```
                     ┌─────────────────┐
                     │    (created)    │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │     pending     │
                     └────────┬────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   task       │  │    task      │  │    task      │
    │  completed   │  │   failed     │  │  cancelled   │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           ▼                 │                  │
    ┌──────────────┐         │                  │
    │   showing-   │         │                  │
    │  suggestion  │         │                  │
    └──────┬───────┘         │                  │
           │                 │                  │
    ┌──────┴──────┐          │                  │
    │             │          │                  │
    ▼             ▼          │                  │
┌────────┐   ┌────────┐      │                  │
│accepted│   │rejected│      │                  │
└────┬───┘   └────┬───┘      │                  │
     │            │          │                  │
     └────────────┴──────────┴──────────────────┘
                             │
                             ▼
                     ┌─────────────────┐
                     │    dismissed    │
                     └─────────────────┘
```

---

## Persistence Schema

For P3 (session persistence), suggestions are stored in workspace state:

```typescript
interface PersistedState {
  version: number;  // Schema version for migrations
  indicators: PersistedIndicator[];
}

interface PersistedIndicator {
  id: string;
  taskId: string;
  documentUri: string;
  characterOffset: number;
  originalRangeJson: string;  // Serialized Range
  suggestion?: {
    generatedCode: string;
    originalSelection: string;
    insertionType: string;
  };
  createdAt: string;  // ISO date string
}
```

---

## Indexes / Lookups

For efficient access, the InlineIndicatorService maintains:

| Lookup | Type | Purpose |
|--------|------|---------|
| byId | Map<string, InlineIndicator> | Fast lookup by indicator ID |
| byTaskId | Map<string, InlineIndicator> | Find indicator for a task |
| byDocument | Map<string, Set<string>> | All indicator IDs for a document URI |

---

## Relationships Summary

| Entity | Relates To | Cardinality | Notes |
|--------|------------|-------------|-------|
| AITask | InlineIndicator | 1:0..1 | Task may or may not have inline indicator |
| InlineIndicator | CodeSuggestion | 1:0..1 | Only has suggestion when task completes |
| InlineIndicator | IndicatorLocation | 1:1 | Every indicator has a location |
| CodeSuggestion | AIResult | 1:1 | Suggestion wraps the AI result for display |
