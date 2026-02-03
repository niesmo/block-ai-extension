# Feature Specification: Inline Task Feedback

**Feature Branch**: `002-inline-task-feedback`  
**Created**: February 2, 2026  
**Status**: Draft  
**Input**: User description: "The user interactions with the extension requires some additional improvements. 1) We need an indication in the file right above the selection showing a pending status once a task has been sent until the task has been resolved. 2) When the LLMs respond with the code changes, show the code change in the same file without asking the user to accept the changes. The users should be able to CLEARLY see what the added code was with the option to accept or reject the recommendation block."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inline Pending Status Indicator (Priority: P1)

As a developer, I want to see a visual indicator directly in my code file above my selection when an AI task is processing, so I know exactly where AI work is pending and can track the status without leaving my current context.

**Why this priority**: This is essential feedback that keeps users informed about pending work directly in context. Without this, users lose track of where they requested AI assistance, especially when submitting multiple tasks.

**Independent Test**: Can be fully tested by selecting code, submitting an AI task, and verifying that a visible indicator appears immediately above the selection and remains visible until the task completes or fails.

**Acceptance Scenarios**:

1. **Given** I have selected code and submitted an AI task, **When** the task is sent for processing, **Then** a pending status indicator appears directly above the selected code in the editor
2. **Given** a pending indicator is displayed for a task, **When** the task completes successfully, **Then** the pending indicator is replaced by the code preview (see Story 2)
3. **Given** a pending indicator is displayed for a task, **When** the task fails or is cancelled, **Then** the pending indicator is removed and an appropriate notification is shown
4. **Given** I scroll away from the location with a pending indicator, **When** I scroll back, **Then** the pending indicator is still visible at the same location
5. **Given** multiple AI tasks are submitted for different code selections, **When** I view the editor, **Then** each selection shows its own independent pending indicator

---

### User Story 2 - Inline Code Preview with Accept/Reject (Priority: P1)

As a developer, I want to see AI-generated code changes displayed directly in my file at the location where I made the request, with clear visual distinction between my original code and the suggested changes, so I can immediately review and decide whether to accept or reject without switching contexts.

**Why this priority**: This is the core improvement to the user experience - keeping developers in their flow by showing results inline rather than in separate views. This directly addresses the user's requirement for clear visibility of added code with accept/reject options.

**Independent Test**: Can be fully tested by completing an AI task and verifying the generated code appears inline in the editor with clear visual distinction and accept/reject controls.

**Acceptance Scenarios**:

1. **Given** an AI task has completed successfully, **When** results are ready, **Then** the generated code is displayed inline in the editor directly at/near the original selection location
2. **Given** AI-generated code is displayed inline, **When** I view the code, **Then** I can clearly distinguish between my original code and the AI-suggested additions (through visual styling such as highlighting, background color, or borders)
3. **Given** AI-generated code is displayed inline, **When** I look at the suggestion block, **Then** I see clear "Accept" and "Reject" action options
4. **Given** I click "Accept" on an inline suggestion, **When** the action completes, **Then** the AI-generated code is permanently inserted into my file and the visual distinction is removed
5. **Given** I click "Reject" on an inline suggestion, **When** the action completes, **Then** the AI-generated code is removed from view and my original code remains unchanged
6. **Given** AI-generated code replaces or modifies my original selection, **When** I view the suggestion, **Then** I can see what is being removed/changed versus what is being added

---

### User Story 3 - Keyboard Navigation for Inline Suggestions (Priority: P2)

As a developer, I want to accept or reject inline code suggestions using keyboard shortcuts, so I can make decisions quickly without reaching for my mouse.

**Why this priority**: Keyboard accessibility improves efficiency for power users and aligns with VS Code's keyboard-centric design philosophy.

**Independent Test**: Can be fully tested by having an inline suggestion displayed and using keyboard shortcuts to accept or reject it.

**Acceptance Scenarios**:

1. **Given** an inline code suggestion is displayed, **When** I press the accept keyboard shortcut, **Then** the suggestion is accepted and applied
2. **Given** an inline code suggestion is displayed, **When** I press the reject keyboard shortcut, **Then** the suggestion is dismissed
3. **Given** multiple inline suggestions are visible, **When** I use keyboard navigation, **Then** I can cycle through and focus each suggestion independently

---

### User Story 4 - Persistent Inline Suggestions Across Sessions (Priority: P3)

As a developer, I want inline suggestions to persist if I close and reopen the file or VS Code, so I don't lose pending review items.

**Why this priority**: Nice-to-have for workflow continuity, but not critical for initial release since most reviews happen immediately.

**Independent Test**: Can be fully tested by having an inline suggestion, closing the file, reopening it, and verifying the suggestion reappears.

**Acceptance Scenarios**:

1. **Given** I have an unreviewed inline suggestion, **When** I close the file and reopen it, **Then** the inline suggestion is restored at the same location
2. **Given** I have pending inline suggestions, **When** I close VS Code and restart, **Then** the inline suggestions are restored when I open the relevant files

---

### Edge Cases

- What happens when the original selection line(s) have been modified or deleted before the AI task completes?
- What happens when multiple AI tasks complete simultaneously for overlapping or adjacent code regions?
- How does the system handle very large AI-generated code blocks that would dominate the viewport?
- What happens when the user starts typing in the area where an inline suggestion is displayed?
- How does the system behave when the pending task's target file is closed before completion?
- What happens if the AI response contains code that is syntactically invalid?

## Requirements *(mandatory)*

### Functional Requirements

**Pending Status Indicator:**
- **FR-001**: System MUST display a visual pending indicator directly above the selected code when an AI task is submitted
- **FR-002**: System MUST show the pending indicator within 500ms of task submission to provide immediate feedback
- **FR-003**: System MUST automatically remove the pending indicator when the associated task completes, fails, or is cancelled
- **FR-004**: System MUST support multiple simultaneous pending indicators for different code locations
- **FR-005**: Pending indicators MUST remain anchored to the correct code location even when surrounding code is edited

**Inline Code Preview:**
- **FR-006**: System MUST display AI-generated code directly in the editor at the location of the original request when a task completes
- **FR-007**: System MUST visually distinguish AI-generated code from user's existing code using clear visual styling (e.g., background highlighting, borders, or color coding)
- **FR-008**: System MUST provide visible "Accept" and "Reject" controls for each inline suggestion
- **FR-009**: When user accepts a suggestion, system MUST insert the code permanently into the file and remove visual styling
- **FR-010**: When user rejects a suggestion, system MUST remove the suggestion from view without modifying the file
- **FR-011**: System MUST show both additions and modifications/deletions clearly when the AI response modifies existing code

**User Interaction:**
- **FR-012**: System MUST provide keyboard shortcuts for accepting and rejecting inline suggestions
- **FR-013**: System MUST allow users to continue editing other parts of the file while inline suggestions are displayed
- **FR-014**: System MUST not block the editor or prevent normal editing operations while suggestions are visible

**State Management:**
- **FR-015**: System MUST track the association between pending indicators, tasks, and their target locations
- **FR-016**: System MUST handle the case where the target location is modified before task completion gracefully

### Key Entities

- **Inline Indicator**: Visual element displayed in the editor, associated with a specific code location and task; has states (pending, showing-suggestion, dismissed)
- **Code Suggestion**: The AI-generated code response, associated with an inline indicator; contains the generated code content and original context
- **Indicator Location**: The position in the editor where an indicator is anchored; includes file, line range, and character positions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see a pending indicator within 500ms of submitting an AI task
- **SC-002**: 95% of users can identify where their pending AI tasks are located without consulting a separate panel
- **SC-003**: Users can review and decide on an inline suggestion within 10 seconds of it appearing
- **SC-004**: 90% of users successfully accept or reject suggestions on their first attempt
- **SC-005**: Editor remains responsive (no perceptible lag) while displaying up to 5 simultaneous inline indicators
- **SC-006**: Users report improved workflow continuity compared to modal/separate-view review (measured via user feedback)

## Assumptions

- The existing background AI task infrastructure from feature 001 is available and functioning
- VS Code's editor decoration and widget APIs support the required inline visual elements
- Users prefer inline feedback over navigating to separate views for code review
- The visual styling for pending indicators and code suggestions will be distinguishable in both light and dark themes
