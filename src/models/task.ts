/**
 * Core type definitions for Background AI Task Runner
 * Based on contracts/types.ts specification
 */

import * as vscode from 'vscode';

/**
 * Task processing status
 */
export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'archived';

/**
 * Position range in a document (mirrors vscode.Range)
 */
export interface Range {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

/**
 * Source code context for an AI task
 */
export interface CodeContext {
  documentUri: string;
  languageId: string;
  selectedText: string;
  selectionRange: Range;
  fullDocumentText?: string;
  relativePath: string;
}

/**
 * Main AI Task entity
 */
export interface AITask {
  readonly id: string;
  status: TaskStatus;
  prompt: string;
  context: CodeContext;
  result: AIResult | null;
  error: ErrorInfo | null;
  readonly createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * AI-generated result
 */
export interface AIResult {
  generatedCode: string;
  explanation?: string;
  confidence?: number;
  tokenCount: TokenUsage;
  modelId: string;
  streamedAt: Date;
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
 * Error information for failed tasks
 */
export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  isRetryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Parameters for creating a new task
 */
export interface CreateTaskParams {
  prompt: string;
  context: CodeContext;
}

/**
 * Task summary for display in TreeView
 */
export interface TaskSummary {
  id: string;
  status: TaskStatus;
  promptPreview: string;
  fileName: string;
  languageId: string;
  createdAt: Date;
  duration?: number;
}

/**
 * Result of applying generated code
 */
export interface ApplyResult {
  success: boolean;
  hadConflict: boolean;
  error?: string;
}

/**
 * Helper to convert vscode.Range to our Range
 */
export function rangeFromVscode(range: vscode.Range): Range {
  return {
    startLine: range.start.line,
    startCharacter: range.start.character,
    endLine: range.end.line,
    endCharacter: range.end.character,
  };
}

/**
 * Helper to convert our Range to vscode.Range
 */
export function rangeToVscode(range: Range): vscode.Range {
  return new vscode.Range(
    range.startLine,
    range.startCharacter,
    range.endLine,
    range.endCharacter
  );
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new AITask
 */
export function createTask(params: CreateTaskParams): AITask {
  return {
    id: generateTaskId(),
    status: 'queued',
    prompt: params.prompt,
    context: params.context,
    result: null,
    error: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  };
}
