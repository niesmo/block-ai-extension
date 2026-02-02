# Tasks: Background AI Task Runner for VS Code

**Input**: Design documents from `/specs/001-background-ai-tasks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4, US6)
- Include exact file paths in descriptions

## Path Conventions

VS Code extension single project structure:
- Source: `src/` at repository root
- Tests: `test/` at repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create VS Code extension project structure and configuration

- [x] T001 Create package.json with extension manifest, commands, menus, keybindings, views, and configuration schema
- [x] T002 [P] Create tsconfig.json with TypeScript 5.x configuration for VS Code extension
- [x] T003 [P] Create esbuild.js build script for extension bundling
- [x] T004 [P] Create .vscode/launch.json with Extension and Extension Tests debug configurations
- [x] T005 [P] Create .vscode/tasks.json with compile and watch tasks
- [x] T006 [P] Create .vscodeignore for extension packaging
- [x] T007 Create src/extension.ts with activate/deactivate entry points (skeleton)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create src/models/task.ts with AITask, TaskStatus, CodeContext, Range interfaces from contracts/types.ts
- [x] T009 [P] Create src/models/result.ts with AIResult, TokenUsage, ErrorInfo interfaces from contracts/types.ts
- [x] T010 Create src/services/eventBus.ts with typed event emitter for inter-component communication
- [x] T011 Create src/services/taskQueue.ts with enqueue, dequeue, cancel, getAll, getByStatus operations
- [x] T012 [P] Create src/utils/logging.ts with structured logging using VS Code OutputChannel
- [x] T013 [P] Create src/utils/context.ts with code context extraction (selection or current line, document URI, range)
- [x] T014 Create src/services/configService.ts with VS Code settings + workspace config file (.background-ai.json) loading

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 6 - Copilot Authentication (Priority: P1) 🎯 MVP Foundation

**Goal**: Leverage existing Copilot authentication so AI tasks work without additional sign-in

**Independent Test**: Install extension with active Copilot subscription, verify AI model access works without prompts

**Why First**: All other P1 stories depend on Copilot access working. This is the technical foundation.

### Implementation for User Story 6

- [x] T015 [US6] Create src/services/copilotService.ts with vscode.lm.selectChatModels() model selection
- [x] T016 [US6] Implement checkCopilotAccess() in copilotService.ts using languageModelAccessInformation.canSendRequest()
- [x] T017 [US6] Implement sendRequest() in copilotService.ts with streaming response handling
- [x] T018 [US6] Add error handling for LanguageModelError (consent_required, quota_exceeded, model_unavailable)
- [x] T019 [US6] Display user-friendly messages when Copilot is not available or requires consent

**Checkpoint**: Copilot integration verified - can send requests and receive responses

---

## Phase 4: User Story 1 - Quick AI Task from Text Selection (Priority: P1) 🎯 MVP Core

**Goal**: Select code, trigger keyboard shortcut, enter prompt, task processes in background

**Independent Test**: Select interface definition, press Ctrl+Shift+A, enter prompt, verify task queues and processes

### Implementation for User Story 1

- [x] T020 [US1] Create src/commands/startTask.ts with command handler for backgroundAI.startTask
- [x] T021 [US1] Implement getSelectionOrCurrentLine() to capture selected text or default to current line
- [x] T022 [US1] Create prompt input popup using vscode.window.createInputBox() with validation
- [x] T023 [US1] Integrate startTask with taskQueue.enqueue() to queue new AITask
- [x] T024 [US1] Implement background task processor that dequeues and sends to copilotService
- [x] T025 [US1] Register keyboard shortcut Ctrl+Shift+A (Cmd+Shift+A on Mac) in package.json
- [x] T026 [US1] Add status bar item showing active task count in src/extension.ts
- [x] T027 [US1] Wire up command registration in src/commands/index.ts

**Checkpoint**: Can trigger AI task from selection, processes in background, UI remains responsive

---

## Phase 5: User Story 4 - Review and Apply AI Results (Priority: P1) 🎯 MVP Complete

**Goal**: Review generated code in diff view before accepting/rejecting

**Independent Test**: Complete AI task, click notification, see diff view, accept/reject changes

### Implementation for User Story 4

- [x] T028 [US4] Create src/providers/resultDocProvider.ts implementing TextDocumentContentProvider for ai-result: scheme
- [x] T029 [US4] Implement diff view display using vscode.commands.executeCommand('vscode.diff')
- [x] T030 [US4] Create src/commands/applyResult.ts to apply generated code at original location using WorkspaceEdit
- [x] T031 [US4] Create src/commands/dismissResult.ts to reject result and mark task as archived
- [x] T032 [US4] Add notification on task completion with "View Result" action button
- [x] T033 [US4] Handle document-modified-since-task-created conflict detection and warning
- [x] T034 [US4] Register applyResult and dismissResult commands in src/commands/index.ts

**Checkpoint**: Full MVP workflow complete - trigger task, process, review, apply/dismiss

---

## Phase 6: User Story 3 - Background Task Progress Visibility (Priority: P2)

**Goal**: See status and progress of queued/running AI tasks in a panel

**Independent Test**: Submit multiple tasks, verify status panel shows all with correct states

### Implementation for User Story 3

- [x] T035 [US3] Create src/providers/taskTreeProvider.ts implementing TreeDataProvider<TaskItem>
- [x] T036 [US3] Implement TaskItem class extending TreeItem with status icons (loading~spin, check, error)
- [x] T037 [US3] Add onDidChangeTreeData event emitter for automatic refresh
- [x] T038 [US3] Register TreeView "backgroundAITasks" in explorer panel via package.json
- [x] T039 [US3] Add context menu items on tree items (Cancel, View Result, Retry) in package.json menus
- [x] T040 [US3] Create src/commands/cancelTask.ts for canceling individual tasks
- [x] T041 [US3] Wire taskQueue events to trigger tree refresh on status changes

**Checkpoint**: Task panel shows all tasks with real-time status updates

---

## Phase 7: User Story 2 - Context Menu AI Invocation (Priority: P2)

**Goal**: Right-click on selected code to trigger AI task from context menu

**Independent Test**: Select code, right-click, choose "AI Task", verify prompt popup appears

### Implementation for User Story 2

- [x] T042 [US2] Add editor/context menu contribution in package.json with "when": "editorHasSelection || editorTextFocus"
- [x] T043 [US2] Ensure startTask command works identically from context menu as from keyboard shortcut
- [x] T044 [US2] Add menu icon for AI Task context menu item

**Checkpoint**: Context menu provides alternative trigger method for AI tasks

---

## Phase 8: User Story 5 - Multiple Concurrent Tasks (Priority: P3)

**Goal**: Queue multiple AI tasks while previous ones are still processing

**Independent Test**: Submit 3+ tasks rapidly, verify all tracked and processed appropriately

### Implementation for User Story 5

- [x] T045 [US5] Implement concurrent task limit in taskQueue (configurable maxConcurrentTasks)
- [x] T046 [US5] Add queue capacity check and user feedback when queue is full (maxQueueSize)
- [x] T047 [US5] Create src/commands/cancelAllTasks.ts to cancel all pending and running tasks
- [x] T048 [US5] Register cancelAllTasks keyboard shortcut Ctrl+Shift+Escape in package.json
- [x] T049 [US5] Update status bar to show queue depth (e.g., "AI: 2 running, 3 queued")

**Checkpoint**: Full concurrent task workflow with queue management

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [x] T050 [P] Create README.md with installation, usage, and configuration documentation
- [x] T051 [P] Create CHANGELOG.md with initial version notes
- [x] T052 [P] Create example .background-ai.json workspace configuration file
- [ ] T053 [P] Add extension icon in media/icon.png
- [x] T054 Create src/commands/retryTask.ts for retrying failed tasks
- [x] T055 Create src/commands/clearHistory.ts to remove archived tasks
- [ ] T056 Implement task persistence to globalState for recovery on VS Code restart
- [x] T057 Add telemetry/logging for debugging (respecting VS Code telemetry settings)
- [x] T058 Run quickstart.md validation - verify all documented features work
- [ ] T059 Package extension with vsce package

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────┐
                                     │
Phase 2: Foundational ◄──────────────┘
         │
         │ BLOCKS ALL USER STORIES
         ▼
Phase 3: US6 (Copilot Auth) ◄──── Required for all AI functionality
         │
         ├──► Phase 4: US1 (Selection + Prompt) ──► Phase 5: US4 (Review/Apply)
         │                                                    │
         │                                                    ▼
         │                                               MVP COMPLETE
         │
         ├──► Phase 6: US3 (Progress Panel) ──────────► Can run parallel to US1/US4
         │
         ├──► Phase 7: US2 (Context Menu) ────────────► Can run parallel, after US1
         │
         └──► Phase 8: US5 (Concurrent Tasks) ────────► After US1, US3

Phase 9: Polish ◄──── After desired user stories complete
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US6 (Copilot) | Phase 2 Foundation | None - do first |
| US1 (Selection) | US6 | US3 |
| US4 (Review) | US1 | US2, US3 |
| US3 (Progress) | Phase 2 | US1, US4, US2 |
| US2 (Context Menu) | US1 | US3, US5 |
| US5 (Concurrent) | US1, US3 | US2 |

### Parallel Opportunities per Phase

**Phase 1 (Setup)**:
```
T002, T003, T004, T005, T006 can all run in parallel
```

**Phase 2 (Foundational)**:
```
T009, T012, T013 can run in parallel (after T008)
```

**Phase 9 (Polish)**:
```
T050, T051, T052, T053 can all run in parallel
```

---

## Implementation Strategy

### MVP First (US6 + US1 + US4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US6 (Copilot Auth) - verify model access works
4. Complete Phase 4: US1 (Selection + Prompt) - can trigger tasks
5. Complete Phase 5: US4 (Review/Apply) - can see and apply results
6. **STOP and VALIDATE**: Full happy path works
7. Deploy/demo MVP

### Incremental Delivery

1. **Setup + Foundation** → Project compiles and runs
2. **+ US6** → Copilot integration verified
3. **+ US1** → Can trigger background tasks (MVP v0.1)
4. **+ US4** → Can review and apply results (MVP v0.2)
5. **+ US3** → Visual task tracking (v0.3)
6. **+ US2** → Context menu alternative (v0.4)
7. **+ US5** → Power user concurrent tasks (v0.5)
8. **+ Polish** → Production ready (v1.0)

---

## Summary

| Phase | Task Count | Stories |
|-------|------------|---------|
| Setup | 7 | - |
| Foundational | 7 | - |
| US6 (Copilot) | 5 | P1 |
| US1 (Selection) | 8 | P1 |
| US4 (Review) | 7 | P1 |
| US3 (Progress) | 7 | P2 |
| US2 (Context Menu) | 3 | P2 |
| US5 (Concurrent) | 5 | P3 |
| Polish | 10 | - |
| **Total** | **59** | 6 stories |

**MVP Scope**: Phases 1-5 (34 tasks) delivers core value proposition
**Parallel Opportunities**: 15+ tasks can run in parallel at various phases
