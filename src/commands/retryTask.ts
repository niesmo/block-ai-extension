/**
 * Retry Task Command
 * Retries a failed or cancelled task
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { getLogger } from '../utils/logging';

/**
 * Retry Task command handler
 */
export class RetryTaskCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private taskQueue: TaskQueue) {}

  /**
   * Execute the retry task command
   */
  async execute(taskId: string): Promise<string | null> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      vscode.window.showErrorMessage('Task not found');
      return null;
    }

    if (task.status !== 'failed' && task.status !== 'cancelled') {
      logger.debug(`Task ${taskId} cannot be retried (status: ${task.status})`);
      vscode.window.showWarningMessage('Can only retry failed or cancelled tasks');
      return null;
    }

    // Create a new task with the same prompt and context
    const newTask = this.taskQueue.addTask(task.prompt, task.context);
    
    logger.info(`Retrying task ${taskId} as new task ${newTask.id}`);
    vscode.window.showInformationMessage('Task queued for retry');
    
    return newTask.id;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
