/**
 * Command Registration
 * Central registration for all extension commands
 */

import * as vscode from 'vscode';
import { StartTaskCommand } from './startTask';
import { ApplyResultCommand } from './applyResult';
import { DismissResultCommand } from './dismissResult';
import { ViewResultCommand } from './viewResult';
import { TaskQueue } from '../services/taskQueue';
import { CopilotService } from '../services/copilotService';
import { EventBus } from '../services/eventBus';
import { ConfigService } from '../services/configService';
import { ResultDocumentProvider, AI_RESULT_SCHEME } from '../providers/resultDocProvider';
import { getLogger } from '../utils/logging';

/**
 * Command IDs matching package.json
 */
export const CommandIds = {
  startTask: 'backgroundAI.startTask',
  cancelTask: 'backgroundAI.cancelTask',
  viewResult: 'backgroundAI.viewResult',
  applyResult: 'backgroundAI.applyResult',
  dismissResult: 'backgroundAI.dismissResult',
  retryTask: 'backgroundAI.retryTask',
  openTaskPanel: 'backgroundAI.openTaskPanel',
  clearHistory: 'backgroundAI.clearHistory',
  showLogs: 'backgroundAI.showLogs',
  refreshTasks: 'backgroundAI.refreshTasks',
  cancelAllTasks: 'backgroundAI.cancelAllTasks',
} as const;

/**
 * Services required for command handlers
 */
export interface CommandServices {
  taskQueue: TaskQueue;
  copilotService: CopilotService;
  eventBus: EventBus;
  configService: ConfigService;
}

/**
 * Register all extension commands
 */
export function registerCommands(
  _context: vscode.ExtensionContext,
  services: CommandServices
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const logger = getLogger();

  // Create the result document provider
  const resultDocProvider = new ResultDocumentProvider(services.taskQueue);
  disposables.push(resultDocProvider);

  // Register document provider for AI results
  disposables.push(
    vscode.workspace.registerTextDocumentContentProvider(AI_RESULT_SCHEME, resultDocProvider)
  );

  // Create command handlers
  const startTaskCommand = new StartTaskCommand(
    services.taskQueue,
    services.copilotService,
    services.eventBus,
    services.configService
  );

  const applyResultCommand = new ApplyResultCommand(
    services.taskQueue,
    services.eventBus,
    services.configService
  );

  const dismissResultCommand = new DismissResultCommand(services.taskQueue);

  const viewResultCommand = new ViewResultCommand(
    services.taskQueue,
    resultDocProvider
  );

  // Register startTask command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.startTask, () => {
      startTaskCommand.execute();
    })
  );

  // Register viewResult command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.viewResult, (taskId?: string) => {
      if (taskId) {
        viewResultCommand.execute(taskId);
      } else {
        // Get the most recent completed task
        const tasks = services.taskQueue.getTasksByStatus('completed');
        if (tasks.length > 0) {
          const mostRecent = tasks.sort(
            (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
          )[0];
          viewResultCommand.execute(mostRecent.id);
        } else {
          vscode.window.showInformationMessage('No completed tasks to view');
        }
      }
    })
  );

  // Register applyResult command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.applyResult, (taskId?: string) => {
      if (taskId) {
        applyResultCommand.execute(taskId);
      }
    })
  );

  // Register dismissResult command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.dismissResult, (taskId?: string) => {
      if (taskId) {
        dismissResultCommand.execute(taskId);
      }
    })
  );

  // Register cancelTask command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.cancelTask, (taskId?: string) => {
      if (taskId) {
        services.taskQueue.cancelTask(taskId, 'user');
        logger.info(`Task ${taskId} cancelled by user`);
      }
    })
  );

  // Register cancelAllTasks command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.cancelAllTasks, () => {
      const tasks = services.taskQueue.getAllTasks();
      let cancelled = 0;
      for (const task of tasks) {
        if (task.status === 'queued' || task.status === 'running') {
          if (services.taskQueue.cancelTask(task.id, 'user')) {
            cancelled++;
          }
        }
      }
      if (cancelled > 0) {
        vscode.window.showInformationMessage(`Cancelled ${cancelled} task(s)`);
      } else {
        vscode.window.showInformationMessage('No active tasks to cancel');
      }
    })
  );

  // Register clearHistory command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.clearHistory, () => {
      const cleared = services.taskQueue.clearArchived();
      if (cleared > 0) {
        vscode.window.showInformationMessage(`Cleared ${cleared} archived task(s)`);
      } else {
        vscode.window.showInformationMessage('No archived tasks to clear');
      }
    })
  );

  // Register retryTask command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.retryTask, async (taskId?: string) => {
      if (!taskId) {
        return;
      }

      const task = services.taskQueue.getTask(taskId);
      if (!task) {
        vscode.window.showErrorMessage('Task not found');
        return;
      }

      if (task.status !== 'failed' && task.status !== 'cancelled') {
        vscode.window.showErrorMessage('Can only retry failed or cancelled tasks');
        return;
      }

      // Create a new task with the same prompt and context
      const newTask = services.taskQueue.addTask(task.prompt, task.context);
      logger.info(`Retrying task ${taskId} as new task ${newTask.id}`);
      vscode.window.showInformationMessage('Task queued for retry');
    })
  );

  // Register openTaskPanel command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.openTaskPanel, () => {
      vscode.commands.executeCommand('backgroundAITasks.focus');
    })
  );

  // Register showLogs command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.showLogs, () => {
      logger.show();
    })
  );

  // Register refreshTasks command
  disposables.push(
    vscode.commands.registerCommand(CommandIds.refreshTasks, () => {
      // Emit a dummy event to trigger tree refresh
      services.eventBus.emit('task:statusChanged', {
        taskId: '',
        previousStatus: 'queued',
        newStatus: 'queued',
        timestamp: new Date(),
      });
    })
  );

  // Cleanup handlers
  disposables.push(startTaskCommand, applyResultCommand, dismissResultCommand, viewResultCommand);

  return disposables;
}
