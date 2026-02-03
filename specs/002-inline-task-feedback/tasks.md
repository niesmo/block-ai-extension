# Tasks: Inline Task Feedback

**Input**: Design documents from `/specs/002-inline-task-feedback/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not explicitly requested in the feature specification. Test tasks are excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project configuration and package.json updates

- [X] T001 Add new commands to package.json contributes.commands section (acceptSuggestion, rejectSuggestion, dismissIndicator, nextSuggestion, prevSuggestion)
- [X] T002 [P] Add new keybindings to package.json contributes.keybindings section per contracts/commands.ts
- [X] T003 [P] Add new configuration settings to package.json contributes.configuration per contracts/configuration.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create InlineIndicator and CodeSuggestion types in src/models/inlineIndicator.ts per contracts/types.ts
- [X] T005 [P] Create theme color definitions in src/utils/themeColors.ts for pending indicators and suggestions (light/dark theme support)
- [X] T006 [P] Create position tracking utility in src/utils/positionTracker.ts for character offset tracking and document change handling
- [X] T007 Add new event types to src/services/eventBus.ts (IndicatorCreatedEvent, IndicatorRemovedEvent, SuggestionDisplayedEvent, SuggestionAcceptedEvent, SuggestionRejectedEvent) per contracts/events.ts
- [X] T008 Create InlineIndicatorService skeleton in src/services/inlineIndicatorService.ts implementing IInlineIndicatorService interface

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Inline Pending Status Indicator (Priority: P1) 🎯 MVP

**Goal**: Display a visual pending indicator directly above selected code when an AI task is processing

**Independent Test**: Select code, submit AI task, verify pending indicator appears immediately above selection and remains until task completes/fails

### Implementation for User Story 1

- [X] T009 [US1] Implement createIndicator() and getIndicator() methods in src/services/inlineIndicatorService.ts
- [X] T010 [US1] Implement indicator state machine (pending → showing-suggestion/dismissed) in src/services/inlineIndicatorService.ts
- [X] T011 [US1] Create PendingIndicatorProvider class in src/providers/pendingIndicatorProvider.ts with TextEditorDecorationType for pending state
- [X] T012 [US1] Implement decoration application/removal in src/providers/pendingIndicatorProvider.ts when indicators are created/dismissed
- [X] T013 [US1] Integrate PendingIndicatorProvider with EventBus events (indicator:created, indicator:removed) in src/providers/pendingIndicatorProvider.ts
- [X] T014 [US1] Wire up task:created event to create pending indicator in src/extension.ts activate()
- [X] T015 [US1] Wire up task:failed and task:cancelled events to dismiss pending indicator in src/extension.ts
- [X] T016 [US1] Add context key updates (backgroundAI.hasPendingIndicators) when indicators change in src/services/inlineIndicatorService.ts
- [X] T017 [US1] Handle document change events to update indicator positions using positionTracker in src/services/inlineIndicatorService.ts

**Checkpoint**: User Story 1 complete - pending indicators appear above code during AI task processing

---

## Phase 4: User Story 2 - Inline Code Preview with Accept/Reject (Priority: P1) 🎯 MVP

**Goal**: Display AI-generated code inline with clear visual distinction and Accept/Reject controls

**Independent Test**: Complete AI task, verify generated code appears inline with visual styling and clickable Accept/Reject buttons

### Implementation for User Story 2

- [X] T018 [US2] Implement showSuggestion() method to insert generated code and apply decoration in src/services/inlineIndicatorService.ts
- [X] T019 [US2] Create suggestion decoration type in src/providers/pendingIndicatorProvider.ts with distinct background highlighting for AI-generated code
- [X] T020 [US2] Create SuggestionCodeLensProvider class in src/providers/suggestionCodeLensProvider.ts implementing CodeLensProvider
- [X] T021 [US2] Implement provideCodeLenses() to show Accept/Reject buttons above suggestions in src/providers/suggestionCodeLensProvider.ts
- [X] T022 [US2] Implement acceptSuggestion() method to permanently insert code and cleanup in src/services/inlineIndicatorService.ts
- [X] T023 [US2] Implement rejectSuggestion() method to remove suggestion and restore original in src/services/inlineIndicatorService.ts
- [X] T024 [US2] Create acceptSuggestion command handler in src/commands/acceptSuggestion.ts
- [X] T025 [US2] Create rejectSuggestion command handler in src/commands/rejectSuggestion.ts
- [X] T026 [US2] Register SuggestionCodeLensProvider in src/extension.ts with vscode.languages.registerCodeLensProvider
- [X] T027 [US2] Wire up task:completed event to transition indicator to showing-suggestion state in src/extension.ts
- [X] T028 [US2] Export and register new commands in src/commands/index.ts
- [X] T029 [US2] Add context key updates (backgroundAI.hasVisibleSuggestions, backgroundAI.hasFocusedSuggestion) in src/services/inlineIndicatorService.ts
- [X] T030 [US2] Emit CodeLens refresh events when suggestions change in src/providers/suggestionCodeLensProvider.ts

**Checkpoint**: User Story 2 complete - AI results appear inline with Accept/Reject functionality

---

## Phase 5: User Story 3 - Keyboard Navigation for Inline Suggestions (Priority: P2)

**Goal**: Accept or reject suggestions using keyboard shortcuts without mouse interaction

**Independent Test**: Display inline suggestion, use Ctrl+Enter to accept or Escape to reject without touching mouse

### Implementation for User Story 3

- [X] T031 [US3] Implement getFocusedSuggestion() to detect suggestion at cursor position in src/services/inlineIndicatorService.ts
- [X] T032 [US3] Create navigateSuggestion command handler in src/commands/navigateSuggestion.ts for next/prev suggestion cycling
- [X] T033 [US3] Update acceptSuggestion command to use focused suggestion when no ID provided in src/commands/acceptSuggestion.ts
- [X] T034 [US3] Update rejectSuggestion command to use focused suggestion when no ID provided in src/commands/rejectSuggestion.ts
- [X] T035 [US3] Add cursor position change listener to update hasFocusedSuggestion context key in src/services/inlineIndicatorService.ts
- [X] T036 [US3] Register navigateSuggestion commands in src/commands/index.ts

**Checkpoint**: User Story 3 complete - keyboard shortcuts work for accept/reject/navigate

---

## Phase 6: User Story 4 - Persistent Inline Suggestions Across Sessions (Priority: P3)

**Goal**: Inline suggestions persist when closing and reopening files or VS Code

**Independent Test**: Have unreviewed suggestion, close file, reopen file, verify suggestion is restored at correct location

### Implementation for User Story 4

- [X] T037 [US4] Implement saveState() to persist indicators to workspaceState in src/services/inlineIndicatorService.ts per PersistedState schema
- [X] T038 [US4] Implement restoreState() to load persisted indicators on activation in src/services/inlineIndicatorService.ts
- [X] T039 [US4] Add file open listener to restore indicators for reopened documents in src/services/inlineIndicatorService.ts
- [X] T040 [US4] Add deactivate handler to save state before extension shutdown in src/extension.ts
- [X] T041 [US4] Handle stale/invalid persisted locations gracefully with validation in src/services/inlineIndicatorService.ts

**Checkpoint**: User Story 4 complete - suggestions survive session restarts

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T042 [P] Add configuration loading in src/services/configService.ts for new inline settings per contracts/configuration.ts
- [X] T043 [P] Respect showPendingIndicators and showInlineSuggestions settings in providers
- [X] T044 [P] Implement autoDismissOnFailure with configurable delay in src/services/inlineIndicatorService.ts
- [X] T045 [P] Add editor context menu items for Accept/Reject per contracts/commands.ts MenuContributions
- [X] T046 [P] Verify all decorations work in both light and dark themes
- [X] T047 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) can proceed in parallel or sequentially
  - US3 (P2) depends on US2 completion (needs suggestion display)
  - US4 (P3) depends on US1 and US2 completion (needs indicator/suggestion infrastructure)
- **Polish (Phase 7)**: Depends on US1 and US2 minimum; can start after MVP complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Depends on User Story 2 (needs suggestions to navigate)
- **User Story 4 (P3)**: Depends on User Stories 1 and 2 (needs complete indicator system to persist)

### Within Each User Story

- Core service methods before providers
- Providers before commands
- Commands before extension wiring
- Story complete before moving to dependent stories

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
```
T001 → T002 [P], T003 [P]
```

**Phase 2 (Foundational)**:
```
T004 → T005 [P], T006 [P], T007, T008
(T004 types needed by T007 and T008)
```

**Phase 3 (US1) + Phase 4 (US2)** - Can run in parallel:
```
US1: T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017
US2: T018 → T019 → T020 → T021 → T022 → T023 → T024 [P], T025 [P] → T026 → T027 → T028 → T029 → T030
```

**Phase 7 (Polish)** - All tasks can run in parallel:
```
T042 [P], T043 [P], T044 [P], T045 [P], T046 [P], T047
```

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)
- Phase 1: Setup (T001-T003)
- Phase 2: Foundational (T004-T008)
- Phase 3: User Story 1 (T009-T017) - Pending indicators
- Phase 4: User Story 2 (T018-T030) - Inline suggestions with Accept/Reject

**MVP Deliverable**: Users can submit AI tasks, see pending indicators, view inline suggestions, and accept/reject them via CodeLens buttons.

### Incremental Delivery After MVP
1. **User Story 3 (P2)**: Add keyboard shortcuts for power users
2. **User Story 4 (P3)**: Add persistence for workflow continuity
3. **Polish**: Configuration options, theme validation, menu items

---

## Summary

| Phase | Tasks | Parallel Tasks | Description |
|-------|-------|----------------|-------------|
| Setup | 3 | 2 | Package.json configuration |
| Foundational | 5 | 2 | Core types, services, events |
| US1 (P1) | 9 | 0 | Pending status indicators |
| US2 (P1) | 13 | 2 | Inline code preview + Accept/Reject |
| US3 (P2) | 6 | 0 | Keyboard navigation |
| US4 (P3) | 5 | 0 | Session persistence |
| Polish | 6 | 5 | Configuration, themes, menus |

**Total**: 47 tasks  
**MVP Tasks**: 30 (Phases 1-4)  
**Post-MVP Tasks**: 17 (Phases 5-7)
