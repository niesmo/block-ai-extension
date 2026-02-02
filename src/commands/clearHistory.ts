/**
 * Clear History Command
 * Clears archived tasks from history
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { getLogger } from '../utils/logging';

/**
 * Clear History command handler
 */
export class ClearHistoryCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private taskQueue: TaskQueue) {}

  /**
   * Execute the clear history command
   */
  async execute(): Promise<number> {
    const logger = getLogger();
    
    // Archive all completed tasks first
    const completedTasks = this.taskQueue.getTasksByStatus('completed');
    for (const task of completedTasks) {
      this.taskQueue.archiveTask(task.id);
    }

    // Clear all archived tasks
    const cleared = this.taskQueue.clearArchived();

    if (cleared > 0) {
      logger.info(`Cleared ${cleared} archived tasks`);
      vscode.window.showInformationMessage(`Cleared ${cleared} task(s) from history`);
    } else {
      vscode.window.showInformationMessage('No tasks to clear');
    }

    return cleared;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
