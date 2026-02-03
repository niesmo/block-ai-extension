/**
 * Start Task Command
 * Handles the backgroundAI.startTask command for initiating AI tasks
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { CopilotService } from '../services/copilotService';
import { EventBus } from '../services/eventBus';
import { ConfigService } from '../services/configService';
import { extractExpandedContext } from '../utils/context';
import { getLogger } from '../utils/logging';
import { AIResult } from '../models/task';
import { ErrorInfo } from '../models/result';

/**
 * Start Task command handler
 */
export class StartTaskCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private processingTasks: Map<string, vscode.CancellationTokenSource> = new Map();

  constructor(
    private taskQueue: TaskQueue,
    private copilotService: CopilotService,
    private eventBus: EventBus,
    private configService: ConfigService
  ) {
    // Listen for cancelled tasks to abort requests
    this.disposables.push(
      this.eventBus.on('task:cancelled', ({ taskId }) => {
        const cts = this.processingTasks.get(taskId);
        if (cts) {
          cts.cancel();
          this.processingTasks.delete(taskId);
        }
      })
    );
  }

  /**
   * Execute the start task command
   */
  async execute(): Promise<void> {
    const logger = getLogger();
    logger.info('StartTask command executed');
    logger.show(); // Show the output channel for debugging
    
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('No active editor. Please open a file first.');
      logger.warn('No active editor');
      return;
    }

    // Get selection context
    const context = this.getContextFromEditor(editor);
    if (!context) {
      vscode.window.showWarningMessage(
        'No text selected. Please select some code or place cursor on a line.'
      );
      logger.warn('No context extracted');
      return;
    }

    logger.info('Context extracted', { file: context.relativePath, textLength: context.selectedText.length });

    // Show prompt input
    const prompt = await this.showPromptInput();
    if (!prompt) {
      logger.debug('User cancelled prompt input');
      return;
    }

    logger.info('Prompt received', { prompt: prompt.substring(0, 50) });

    // Add task to queue
    const task = this.taskQueue.addTask(prompt, context);
    logger.info(`Task ${task.id} created and added to queue`);

    // Set context for UI updates
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasActiveTasks', true);

    // Process the task
    this.processTask(task.id).catch(err => {
      logger.error('Error in processTask', err);
    });
  }

  /**
   * Get context from the active editor
   */
  private getContextFromEditor(editor: vscode.TextEditor) {
    const settings = this.configService.getSettings();

    // If selection is empty, select the current line
    if (editor.selection.isEmpty) {
      const line = editor.document.lineAt(editor.selection.active.line);
      if (line.isEmptyOrWhitespace) {
        return null;
      }
      // Create a selection for the entire line
      const lineSelection = new vscode.Selection(
        line.lineNumber,
        line.firstNonWhitespaceCharacterIndex,
        line.lineNumber,
        line.text.length
      );
      editor.selection = lineSelection;
    }

    // Always include surrounding context for better AI results
    return extractExpandedContext(editor, settings.maxContextLines, settings.maxContextLines);
  }

  /**
   * Show the prompt input popup
   */
  private async showPromptInput(): Promise<string | undefined> {
    const logger = getLogger();
    logger.debug('Showing prompt input box');
    
    return new Promise<string | undefined>((resolve) => {
      const inputBox = vscode.window.createInputBox();
      inputBox.title = 'Background AI Task';
      inputBox.prompt = 'What would you like the AI to do with the selected code?';
      inputBox.placeholder = 'e.g., Implement this interface, Add error handling, Optimize this function';
      inputBox.ignoreFocusOut = true;

      let resolved = false;

      inputBox.onDidAccept(() => {
        if (resolved) {return;}
        resolved = true;
        const value = inputBox.value.trim();
        logger.debug('Input box accepted', { value: value.substring(0, 30) });
        inputBox.hide();
        inputBox.dispose();
        resolve(value || undefined);
      });

      inputBox.onDidHide(() => {
        if (resolved) {return;}
        resolved = true;
        logger.debug('Input box hidden without accept');
        inputBox.dispose();
        resolve(undefined);
      });

      inputBox.show();
      logger.debug('Input box shown');
    });
  }

  /**
   * Process a task by sending it to Copilot
   */
  private async processTask(taskId: string): Promise<void> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.error(`Task ${taskId} not found for processing`);
      return;
    }

    // Check if we can start the task
    if (!this.taskQueue.canStartTask()) {
      logger.debug(`Task ${taskId} waiting in queue`);
      // Task will be processed when a slot opens up
      return;
    }

    // Update status to running
    this.taskQueue.updateTaskStatus(taskId, 'running');

    // Create cancellation token
    const cts = new vscode.CancellationTokenSource();
    this.processingTasks.set(taskId, cts);

    try {
      // Send request to Copilot
      const result = await this.copilotService.sendRequest({
        taskId,
        prompt: task.prompt,
        context: {
          selectedText: task.context.selectedText,
          languageId: task.context.languageId,
          relativePath: task.context.relativePath,
          fullDocumentText: task.context.fullDocumentText,
        },
        cancellationToken: cts.token,
      });

      // Check if cancelled during processing
      if (cts.token.isCancellationRequested) {
        logger.debug(`Task ${taskId} was cancelled during processing`);
        return;
      }

      // Handle result
      if (this.isErrorInfo(result)) {
        this.handleTaskError(taskId, result);
      } else {
        this.handleTaskSuccess(taskId, result);
      }
    } catch (error) {
      logger.error(`Unexpected error processing task ${taskId}`, error);
      this.taskQueue.updateTaskStatus(taskId, 'failed');
    } finally {
      this.processingTasks.delete(taskId);
      this.checkAndProcessNextTask();
    }
  }

  /**
   * Handle successful task completion
   */
  private handleTaskSuccess(taskId: string, result: AIResult): void {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      return;
    }

    // Update task with result
    task.result = result;
    this.taskQueue.updateTaskStatus(taskId, 'completed');

    const duration = task.startedAt
      ? Date.now() - task.startedAt.getTime()
      : 0;

    this.eventBus.emit('task:completed', {
      taskId,
      result,
      duration,
    });

    logger.info(`Task ${taskId} completed`, { duration });

    // Show notification
    const settings = this.configService.getSettings();
    this.showCompletionNotification(taskId, settings.autoShowDiff);
  }

  /**
   * Handle task error
   */
  private handleTaskError(taskId: string, error: ErrorInfo): void {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      return;
    }

    // Update task with error
    task.error = error;
    this.taskQueue.updateTaskStatus(taskId, 'failed');

    const duration = task.startedAt
      ? Date.now() - task.startedAt.getTime()
      : 0;

    this.eventBus.emit('task:failed', {
      taskId,
      error,
      duration,
    });

    logger.error(`Task ${taskId} failed`, { error });

    // Show error notification
    this.showErrorNotification(taskId, error);
  }

  /**
   * Show completion notification
   */
  private async showCompletionNotification(taskId: string, autoShowDiff: boolean): Promise<void> {
    if (autoShowDiff) {
      vscode.commands.executeCommand('backgroundAI.viewResult', taskId);
      return;
    }

    const action = await vscode.window.showInformationMessage(
      'AI task completed',
      'View Result',
      'Dismiss'
    );

    if (action === 'View Result') {
      vscode.commands.executeCommand('backgroundAI.viewResult', taskId);
    }
  }

  /**
   * Show error notification
   */
  private async showErrorNotification(taskId: string, error: ErrorInfo): Promise<void> {
    const actions = error.isRetryable ? ['Retry', 'Dismiss'] : ['Dismiss'];

    const action = await vscode.window.showErrorMessage(
      `AI task failed: ${error.message}`,
      ...actions
    );

    if (action === 'Retry') {
      vscode.commands.executeCommand('backgroundAI.retryTask', taskId);
    }
  }

  /**
   * Check if there are more tasks to process
   */
  private checkAndProcessNextTask(): void {
    const stats = this.taskQueue.getStats();

    // Update context for UI
    const hasActive = stats.running > 0 || stats.queued > 0;
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasActiveTasks', hasActive);

    // Process next queued task if there's capacity
    if (this.taskQueue.canStartTask()) {
      const nextTask = this.taskQueue.getNextPendingTask();
      if (nextTask) {
        this.processTask(nextTask.id);
      }
    }
  }

  /**
   * Type guard for ErrorInfo
   */
  private isErrorInfo(result: AIResult | ErrorInfo): result is ErrorInfo {
    return 'code' in result && 'isRetryable' in result;
  }

  dispose(): void {
    // Cancel all processing tasks
    for (const cts of this.processingTasks.values()) {
      cts.cancel();
      cts.dispose();
    }
    this.processingTasks.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
