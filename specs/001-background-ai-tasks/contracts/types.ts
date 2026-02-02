/**
 * Core type definitions for Background AI Task Runner
 * 
 * @module contracts/types
 */

/**
 * Task processing status
 */
export type TaskStatus = 
  | 'queued'      // Waiting to be processed
  | 'running'     // Currently being processed by AI
  | 'completed'   // Successfully generated result
  | 'failed'      // Processing error occurred
  | 'cancelled'   // User cancelled the task
  | 'archived';   // Result applied or dismissed

/**
 * Position range in a document
 */
export interface Range {
  /** Starting line (0-based) */
  startLine: number;
  /** Starting column (0-based) */
  startCharacter: number;
  /** Ending line (0-based) */
  endLine: number;
  /** Ending column (0-based) */
  endCharacter: number;
}

/**
 * Source code context for an AI task
 */
export interface CodeContext {
  /** URI of the source document */
  documentUri: string;
  /** Language identifier (e.g., "typescript", "python") */
  languageId: string;
  /** The selected/target code text */
  selectedText: string;
  /** Position range of the selection */
  selectionRange: Range;
  /** Optional: full file content for additional context */
  fullDocumentText?: string;
  /** Workspace-relative path for display */
  relativePath: string;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Number of input tokens */
  promptTokens: number;
  /** Number of output tokens */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * AI-generated result
 */
export interface AIResult {
  /** The generated code */
  generatedCode: string;
  /** Optional explanation from the AI */
  explanation?: string;
  /** Model confidence score (0-1) if available */
  confidence?: number;
  /** Token usage statistics */
  tokenCount: TokenUsage;
  /** ID of the model that generated the result */
  modelId: string;
  /** When streaming completed */
  streamedAt: Date;
}

/**
 * Error information for failed tasks
 */
export interface ErrorInfo {
  /** Error code for programmatic handling */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Whether retry might succeed */
  isRetryable: boolean;
  /** Additional error context */
  details?: Record<string, unknown>;
}

/**
 * Known error codes
 */
export type ErrorCode =
  | 'model_unavailable'
  | 'consent_required'
  | 'quota_exceeded'
  | 'context_too_large'
  | 'network_error'
  | 'generation_failed'
  | 'cancelled'
  | 'unknown';

/**
 * Main AI Task entity
 */
export interface AITask {
  /** Unique task identifier (UUID) */
  readonly id: string;
  /** Current processing status */
  status: TaskStatus;
  /** User's instruction to the AI */
  prompt: string;
  /** Source code context */
  context: CodeContext;
  /** Generated result (null until completed) */
  result: AIResult | null;
  /** Error information (null unless failed) */
  error: ErrorInfo | null;
  /** When the task was created */
  readonly createdAt: Date;
  /** When processing started */
  startedAt: Date | null;
  /** When the task finished */
  completedAt: Date | null;
}

/**
 * Parameters for creating a new task
 */
export interface CreateTaskParams {
  /** User's prompt/instruction */
  prompt: string;
  /** Source code context */
  context: CodeContext;
}

/**
 * Task summary for display in TreeView
 */
export interface TaskSummary {
  id: string;
  status: TaskStatus;
  promptPreview: string;  // Truncated prompt for display
  fileName: string;
  languageId: string;
  createdAt: Date;
  duration?: number;  // ms if completed
}

/**
 * Result of applying generated code
 */
export interface ApplyResult {
  success: boolean;
  /** Set if document was modified since task creation */
  hadConflict: boolean;
  /** Error message if failed */
  error?: string;
}
