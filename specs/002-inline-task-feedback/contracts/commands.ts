/**
 * Command definitions for Inline Task Feedback
 * 
 * @module contracts/commands
 * @feature 002-inline-task-feedback
 */

/**
 * Command identifiers
 * 
 * These should be registered in package.json contributes.commands
 */
export const Commands = {
  /** Accept the current/focused inline suggestion */
  ACCEPT_SUGGESTION: 'backgroundAI.acceptSuggestion',
  
  /** Reject the current/focused inline suggestion */
  REJECT_SUGGESTION: 'backgroundAI.rejectSuggestion',
  
  /** Navigate to next inline suggestion (P2) */
  NEXT_SUGGESTION: 'backgroundAI.nextSuggestion',
  
  /** Navigate to previous inline suggestion (P2) */
  PREV_SUGGESTION: 'backgroundAI.prevSuggestion',
  
  /** Accept all visible suggestions in current file */
  ACCEPT_ALL_SUGGESTIONS: 'backgroundAI.acceptAllSuggestions',
  
  /** Reject all visible suggestions in current file */
  REJECT_ALL_SUGGESTIONS: 'backgroundAI.rejectAllSuggestions',
  
  /** Dismiss a specific pending indicator */
  DISMISS_INDICATOR: 'backgroundAI.dismissIndicator',
} as const;

/**
 * Arguments for acceptSuggestion command
 */
export interface AcceptSuggestionArgs {
  /** Suggestion ID to accept. If omitted, accepts focused suggestion */
  suggestionId?: string;
}

/**
 * Arguments for rejectSuggestion command
 */
export interface RejectSuggestionArgs {
  /** Suggestion ID to reject. If omitted, rejects focused suggestion */
  suggestionId?: string;
}

/**
 * Arguments for dismissIndicator command
 */
export interface DismissIndicatorArgs {
  /** Indicator ID to dismiss */
  indicatorId: string;
}

/**
 * Keybinding definitions
 * 
 * These should be registered in package.json contributes.keybindings
 */
export const Keybindings = {
  ACCEPT_SUGGESTION: {
    command: Commands.ACCEPT_SUGGESTION,
    key: 'ctrl+enter',
    mac: 'cmd+enter',
    when: 'backgroundAI.hasFocusedSuggestion',
  },
  REJECT_SUGGESTION: {
    command: Commands.REJECT_SUGGESTION,
    key: 'escape',
    when: 'backgroundAI.hasFocusedSuggestion',
  },
  NEXT_SUGGESTION: {
    command: Commands.NEXT_SUGGESTION,
    key: 'alt+]',
    mac: 'alt+]',
    when: 'backgroundAI.hasVisibleSuggestions',
  },
  PREV_SUGGESTION: {
    command: Commands.PREV_SUGGESTION,
    key: 'alt+[',
    mac: 'alt+[',
    when: 'backgroundAI.hasVisibleSuggestions',
  },
} as const;

/**
 * Context keys set by the extension
 * 
 * Used in 'when' clauses for commands and keybindings
 */
export const ContextKeys = {
  /** True when there are any pending indicators */
  HAS_PENDING_INDICATORS: 'backgroundAI.hasPendingIndicators',
  
  /** True when there are visible suggestions in active editor */
  HAS_VISIBLE_SUGGESTIONS: 'backgroundAI.hasVisibleSuggestions',
  
  /** True when cursor is on/near a suggestion (can accept/reject) */
  HAS_FOCUSED_SUGGESTION: 'backgroundAI.hasFocusedSuggestion',
  
  /** Number of pending indicators (for status display) */
  PENDING_COUNT: 'backgroundAI.pendingIndicatorCount',
  
  /** Number of visible suggestions (for status display) */
  SUGGESTION_COUNT: 'backgroundAI.suggestionCount',
} as const;

/**
 * Menu contributions
 * 
 * These should be added to package.json contributes.menus
 */
export const MenuContributions = {
  /** Editor context menu items */
  editorContext: [
    {
      command: Commands.ACCEPT_SUGGESTION,
      when: ContextKeys.HAS_FOCUSED_SUGGESTION,
      group: '1_modification@101',
    },
    {
      command: Commands.REJECT_SUGGESTION,
      when: ContextKeys.HAS_FOCUSED_SUGGESTION,
      group: '1_modification@102',
    },
  ],
} as const;
