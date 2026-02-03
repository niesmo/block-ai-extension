/**
 * Configuration schema for Inline Task Feedback
 * 
 * @module contracts/configuration
 * @feature 002-inline-task-feedback
 */

/**
 * User-configurable settings
 * 
 * These should be registered in package.json contributes.configuration
 */
export interface InlineFeedbackSettings {
  /**
   * Enable inline pending indicators
   * @default true
   */
  showPendingIndicators: boolean;

  /**
   * Enable inline code suggestions (vs separate panel)
   * @default true
   */
  showInlineSuggestions: boolean;

  /**
   * Auto-dismiss pending indicators after task failure
   * @default true
   */
  autoDismissOnFailure: boolean;

  /**
   * Duration (ms) to show failure indicator before auto-dismiss
   * @default 3000
   */
  failureIndicatorDuration: number;

  /**
   * Highlight style for pending indicators
   * @default 'background'
   */
  pendingIndicatorStyle: 'background' | 'border' | 'gutter';

  /**
   * Highlight style for code suggestions
   * @default 'background'
   */
  suggestionStyle: 'background' | 'border' | 'diff';

  /**
   * Persist suggestions across sessions (P3 feature)
   * @default false
   */
  persistSuggestions: boolean;

  /**
   * Maximum number of simultaneous indicators per file
   * @default 10
   */
  maxIndicatorsPerFile: number;
}

/**
 * Default settings values
 */
export const DefaultSettings: InlineFeedbackSettings = {
  showPendingIndicators: true,
  showInlineSuggestions: true,
  autoDismissOnFailure: true,
  failureIndicatorDuration: 3000,
  pendingIndicatorStyle: 'background',
  suggestionStyle: 'background',
  persistSuggestions: false,
  maxIndicatorsPerFile: 10,
};

/**
 * Configuration schema for package.json
 * 
 * Add to contributes.configuration.properties
 */
export const ConfigurationSchema = {
  'backgroundAI.inline.showPendingIndicators': {
    type: 'boolean',
    default: true,
    description: 'Show visual indicators above code when AI tasks are processing',
  },
  'backgroundAI.inline.showInlineSuggestions': {
    type: 'boolean',
    default: true,
    description: 'Display AI-generated code suggestions inline in the editor',
  },
  'backgroundAI.inline.autoDismissOnFailure': {
    type: 'boolean',
    default: true,
    description: 'Automatically dismiss pending indicators when tasks fail',
  },
  'backgroundAI.inline.failureIndicatorDuration': {
    type: 'number',
    default: 3000,
    minimum: 1000,
    maximum: 10000,
    description: 'Duration (ms) to show failure indicator before auto-dismiss',
  },
  'backgroundAI.inline.pendingIndicatorStyle': {
    type: 'string',
    enum: ['background', 'border', 'gutter'],
    default: 'background',
    description: 'Visual style for pending task indicators',
    enumDescriptions: [
      'Highlight the line background',
      'Show a border around the line',
      'Show icon in the gutter',
    ],
  },
  'backgroundAI.inline.suggestionStyle': {
    type: 'string',
    enum: ['background', 'border', 'diff'],
    default: 'background',
    description: 'Visual style for code suggestions',
    enumDescriptions: [
      'Highlight suggestion with background color',
      'Show a border around the suggestion',
      'Show diff-style additions/deletions',
    ],
  },
  'backgroundAI.inline.persistSuggestions': {
    type: 'boolean',
    default: false,
    description: 'Keep unreviewed suggestions when closing files or VS Code',
  },
  'backgroundAI.inline.maxIndicatorsPerFile': {
    type: 'number',
    default: 10,
    minimum: 1,
    maximum: 50,
    description: 'Maximum number of simultaneous indicators allowed per file',
  },
} as const;

/**
 * Configuration section identifier
 */
export const CONFIGURATION_SECTION = 'backgroundAI.inline';
