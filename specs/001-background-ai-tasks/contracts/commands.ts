/**
 * Command identifiers and signatures for Background AI Task Runner
 * 
 * @module contracts/commands
 */

/**
 * Extension command identifiers
 * 
 * These are registered in package.json under contributes.commands
 */
export const Commands = {
  /**
   * Start a new AI task from the current selection
   * Triggered by: keyboard shortcut, context menu
   * Arguments: none (uses current editor selection)
   */
  START_TASK: 'backgroundAI.startTask',

  /**
   * Cancel a specific task by ID
   * Arguments: [taskId: string]
   */
  CANCEL_TASK: 'backgroundAI.cancelTask',

  /**
   * Cancel all pending and running tasks
   * Arguments: none
   */
  CANCEL_ALL_TASKS: 'backgroundAI.cancelAllTasks',

  /**
   * Show the result preview for a completed task
   * Arguments: [taskId: string]
   */
  VIEW_RESULT: 'backgroundAI.viewResult',

  /**
   * Apply the generated code from a completed task
   * Arguments: [taskId: string]
   */
  APPLY_RESULT: 'backgroundAI.applyResult',

  /**
   * Dismiss/reject a task result without applying
   * Arguments: [taskId: string]
   */
  DISMISS_RESULT: 'backgroundAI.dismissResult',

  /**
   * Retry a failed task
   * Arguments: [taskId: string]
   */
  RETRY_TASK: 'backgroundAI.retryTask',

  /**
   * Clear all completed/archived tasks from history
   * Arguments: none
   */
  CLEAR_HISTORY: 'backgroundAI.clearHistory',

  /**
   * Focus/reveal the task panel in the sidebar
   * Arguments: none
   */
  SHOW_PANEL: 'backgroundAI.showPanel',

  /**
   * Open extension settings
   * Arguments: none
   */
  OPEN_SETTINGS: 'backgroundAI.openSettings',

  /**
   * Refresh the task tree view
   * Arguments: none (internal use)
   */
  REFRESH_TREE: 'backgroundAI.refreshTree',
} as const;

/**
 * Type helper for command IDs
 */
export type CommandId = typeof Commands[keyof typeof Commands];

/**
 * Command handler signatures
 */
export interface CommandHandlers {
  [Commands.START_TASK]: () => Promise<void>;
  [Commands.CANCEL_TASK]: (taskId: string) => Promise<void>;
  [Commands.CANCEL_ALL_TASKS]: () => Promise<void>;
  [Commands.VIEW_RESULT]: (taskId: string) => Promise<void>;
  [Commands.APPLY_RESULT]: (taskId: string) => Promise<void>;
  [Commands.DISMISS_RESULT]: (taskId: string) => Promise<void>;
  [Commands.RETRY_TASK]: (taskId: string) => Promise<void>;
  [Commands.CLEAR_HISTORY]: () => Promise<void>;
  [Commands.SHOW_PANEL]: () => Promise<void>;
  [Commands.OPEN_SETTINGS]: () => Promise<void>;
  [Commands.REFRESH_TREE]: () => void;
}

/**
 * Keybinding definitions (mirrored from package.json for reference)
 */
export const Keybindings = {
  START_TASK: {
    key: 'ctrl+shift+a',
    mac: 'cmd+shift+a',
    when: 'editorTextFocus',
  },
  CANCEL_ALL_TASKS: {
    key: 'ctrl+shift+escape',
    mac: 'cmd+shift+escape',
    when: 'backgroundAI.hasActiveTasks',
  },
} as const;

/**
 * Context menu groups for command placement
 */
export const MenuGroups = {
  EDITOR_CONTEXT: '1_modification',  // Standard group for code actions
  TREE_ITEM_INLINE: 'inline',
  TREE_ITEM_CONTEXT: '1_actions',
} as const;
