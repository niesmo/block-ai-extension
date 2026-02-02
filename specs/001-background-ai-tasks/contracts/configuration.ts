/**
 * Configuration schema for Background AI Task Runner
 * 
 * @module contracts/configuration
 */

/**
 * VS Code extension settings (from contributes.configuration)
 * 
 * These settings are accessed via:
 * vscode.workspace.getConfiguration('backgroundAI')
 */
export interface ExtensionSettings {
  /**
   * Maximum number of tasks that can run concurrently
   * @default 3
   * @minimum 1
   * @maximum 5
   */
  maxConcurrentTasks: number;

  /**
   * Maximum number of tasks in the queue
   * @default 10
   * @minimum 1
   * @maximum 20
   */
  maxQueueSize: number;

  /**
   * Preferred model family to use
   * @default "gpt-4o"
   */
  defaultModel: string;

  /**
   * Automatically show diff view when task completes
   * @default true
   */
  autoShowDiff: boolean;

  /**
   * How to notify when tasks complete
   * @default "toast"
   */
  notificationStyle: NotificationStyle;

  /**
   * Show status bar item with task count
   * @default true
   */
  showStatusBarItem: boolean;

  /**
   * Automatically include surrounding context (lines around selection)
   * @default 10
   */
  contextLines: number;

  /**
   * Log level for diagnostics
   * @default "info"
   */
  logLevel: LogLevel;
}

export type NotificationStyle = 'toast' | 'statusBar' | 'silent';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Setting keys for programmatic access
 */
export const SettingKeys = {
  MAX_CONCURRENT_TASKS: 'backgroundAI.maxConcurrentTasks',
  MAX_QUEUE_SIZE: 'backgroundAI.maxQueueSize',
  DEFAULT_MODEL: 'backgroundAI.defaultModel',
  AUTO_SHOW_DIFF: 'backgroundAI.autoShowDiff',
  NOTIFICATION_STYLE: 'backgroundAI.notificationStyle',
  SHOW_STATUS_BAR_ITEM: 'backgroundAI.showStatusBarItem',
  CONTEXT_LINES: 'backgroundAI.contextLines',
  LOG_LEVEL: 'backgroundAI.logLevel',
} as const;

/**
 * Workspace configuration file schema (.background-ai.json)
 * 
 * This file lives in the workspace root and is version-controlled.
 */
export interface WorkspaceConfiguration {
  /**
   * Schema version for migration support
   */
  $schema?: string;

  /**
   * Configuration file version
   * @default "1.0"
   */
  version: string;

  /**
   * Additional context files to include with every prompt
   * Paths are relative to workspace root
   * 
   * @example ["./docs/architecture.md", "./.cursor/rules"]
   */
  contextFiles?: string[];

  /**
   * Path to a rules/guidelines file for AI behavior
   * Content is prepended to system prompt
   */
  rulesFile?: string;

  /**
   * Text prepended to every user prompt
   * Use for project-specific instructions
   * 
   * @example "Follow our TypeScript coding standards. Use functional patterns."
   */
  defaultPromptPrefix?: string;

  /**
   * Glob patterns for files/folders to exclude from context
   * 
   * @example ["**/node_modules/**", "**/*.test.ts"]
   */
  excludePatterns?: string[];

  /**
   * Per-language settings
   */
  languages?: {
    [languageId: string]: LanguageSettings;
  };
}

/**
 * Language-specific settings
 */
export interface LanguageSettings {
  /**
   * Additional prompt instructions for this language
   */
  promptSuffix?: string;

  /**
   * Additional context files for this language
   */
  contextFiles?: string[];
}

/**
 * Default workspace configuration
 */
export const defaultWorkspaceConfig: WorkspaceConfiguration = {
  version: '1.0',
  contextFiles: [],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
  ],
};

/**
 * Configuration file name
 */
export const WORKSPACE_CONFIG_FILENAME = '.background-ai.json';

/**
 * JSON Schema URL for workspace configuration
 */
export const WORKSPACE_CONFIG_SCHEMA_URL = 
  'https://raw.githubusercontent.com/your-org/background-ai-tasks/main/schemas/config.schema.json';

/**
 * Package.json configuration contribution schema
 * 
 * This is a reference for what goes in package.json
 */
export const configurationContribution = {
  title: 'Background AI Tasks',
  properties: {
    'backgroundAI.maxConcurrentTasks': {
      type: 'number',
      default: 3,
      minimum: 1,
      maximum: 5,
      description: 'Maximum number of AI tasks that can run concurrently',
    },
    'backgroundAI.maxQueueSize': {
      type: 'number',
      default: 10,
      minimum: 1,
      maximum: 20,
      description: 'Maximum number of tasks that can be queued',
    },
    'backgroundAI.defaultModel': {
      type: 'string',
      default: 'gpt-4o',
      description: 'Preferred AI model family to use',
    },
    'backgroundAI.autoShowDiff': {
      type: 'boolean',
      default: true,
      description: 'Automatically show diff view when a task completes',
    },
    'backgroundAI.notificationStyle': {
      type: 'string',
      enum: ['toast', 'statusBar', 'silent'],
      default: 'toast',
      description: 'How to notify when tasks complete',
    },
    'backgroundAI.showStatusBarItem': {
      type: 'boolean',
      default: true,
      description: 'Show task count in status bar',
    },
    'backgroundAI.contextLines': {
      type: 'number',
      default: 10,
      minimum: 0,
      maximum: 50,
      description: 'Number of lines of context to include around selection',
    },
    'backgroundAI.logLevel': {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
      description: 'Logging verbosity for diagnostics',
    },
  },
};
