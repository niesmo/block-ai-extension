/**
 * Dismiss Result Command
 * Dismisses/archives an AI task result without applying
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { getLogger } from '../utils/logging';

/**
 * Dismiss Result command handler
 */
export class DismissResultCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private taskQueue: TaskQueue) {}

  /**
   * Execute the dismiss result command
   */
  async execute(taskId: string): Promise<boolean> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      vscode.window.showErrorMessage('Task not found');
      return false;
    }

    // Archive the task
    const archived = this.taskQueue.archiveTask(taskId);

    if (archived) {
      logger.info(`Dismissed result for task ${taskId}`);
      vscode.window.showInformationMessage('Task result dismissed');
      return true;
    }

    return false;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
