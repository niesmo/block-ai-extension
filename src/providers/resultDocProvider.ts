/**
 * Result Document Provider
 * Provides virtual document content for AI-generated results
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { getLogger } from '../utils/logging';

/**
 * URI scheme for AI results
 */
export const AI_RESULT_SCHEME = 'ai-result';

/**
 * Text Document Content Provider for AI Results
 */
export class ResultDocumentProvider implements vscode.TextDocumentContentProvider {
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  
  /**
   * Event fired when document content changes
   */
  readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private taskQueue: TaskQueue) {}

  /**
   * Provide text document content for the given URI
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    const logger = getLogger();
    
    // Parse task ID from URI (remove leading slash and file extension)
    let taskId = uri.path.replace(/^\//, '');
    // Remove file extension if present (e.g., task-xxx.ts -> task-xxx)
    taskId = taskId.replace(/\.[^.]+$/, '');
    
    logger.debug('ResultDocProvider looking up task', { uri: uri.toString(), taskId });
    
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found for result document`);
      return `// Task not found: ${taskId}`;
    }

    if (!task.result) {
      logger.warn(`Task ${taskId} has no result`);
      return `// No result available for task: ${taskId}`;
    }

    logger.debug('ResultDocProvider returning content', { length: task.result.generatedCode.length });
    return task.result.generatedCode;
  }

  /**
   * Notify that a document has changed
   */
  update(taskId: string): void {
    const uri = this.createUri(taskId);
    this.onDidChangeEmitter.fire(uri);
  }

  /**
   * Create a URI for a task's result
   */
  createUri(taskId: string): vscode.Uri {
    return vscode.Uri.parse(`${AI_RESULT_SCHEME}:/${taskId}`);
  }

  /**
   * Create a URI with language hint for proper syntax highlighting
   */
  createUriWithLanguage(taskId: string, languageId: string): vscode.Uri {
    // Use a file extension that matches the language for syntax highlighting
    const extension = this.getExtensionForLanguage(languageId);
    return vscode.Uri.parse(`${AI_RESULT_SCHEME}:/${taskId}.${extension}`);
  }

  /**
   * Get file extension for a language ID
   */
  private getExtensionForLanguage(languageId: string): string {
    const extensionMap: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yaml',
      markdown: 'md',
      sql: 'sql',
      shell: 'sh',
      powershell: 'ps1',
    };

    return extensionMap[languageId] || languageId;
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
