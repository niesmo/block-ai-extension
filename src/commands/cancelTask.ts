/**
 * Cancel Task Command
 * Cancels a running or queued AI task
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { getLogger } from '../utils/logging';

/**
 * Cancel Task command handler
 */
export class CancelTaskCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private taskQueue: TaskQueue) {}

  /**
   * Execute the cancel task command
   */
  async execute(taskId: string): Promise<boolean> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      vscode.window.showErrorMessage('Task not found');
      return false;
    }

    if (task.status !== 'queued' && task.status !== 'running') {
      logger.debug(`Task ${taskId} is not cancellable (status: ${task.status})`);
      vscode.window.showWarningMessage('Task cannot be cancelled');
      return false;
    }

    const cancelled = this.taskQueue.cancelTask(taskId, 'user');

    if (cancelled) {
      logger.info(`Task ${taskId} cancelled by user`);
      vscode.window.showInformationMessage('Task cancelled');
      return true;
    }

    return false;
  }

  /**
   * Cancel all active tasks
   */
  async cancelAll(): Promise<number> {
    const logger = getLogger();
    const tasks = this.taskQueue.getAllTasks();
    let cancelled = 0;

    for (const task of tasks) {
      if (task.status === 'queued' || task.status === 'running') {
        if (this.taskQueue.cancelTask(task.id, 'user')) {
          cancelled++;
        }
      }
    }

    if (cancelled > 0) {
      logger.info(`Cancelled ${cancelled} tasks`);
      vscode.window.showInformationMessage(`Cancelled ${cancelled} task(s)`);
    } else {
      vscode.window.showInformationMessage('No active tasks to cancel');
    }

    return cancelled;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
