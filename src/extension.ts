import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { TaskQueue } from './services/taskQueue';
import { CopilotService } from './services/copilotService';
import { ConfigService } from './services/configService';
import { EventBus } from './services/eventBus';
import { TaskTreeProvider } from './providers/taskTreeProvider';
import { getLogger, disposeLogger } from './utils/logging';

let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = getLogger();
  logger.info('Background AI Tasks extension activating...');

  // Initialize services
  const eventBus = new EventBus();
  const configService = new ConfigService();
  const taskQueue = new TaskQueue(eventBus, configService);
  const copilotService = new CopilotService(eventBus, configService);

  // Set log level from config
  const settings = configService.getSettings();
  logger.setLevel(settings.logLevel);

  // Initialize Task Tree Provider
  const taskTreeProvider = new TaskTreeProvider(taskQueue, eventBus);
  context.subscriptions.push(taskTreeProvider);

  // Register TreeView
  const treeView = vscode.window.createTreeView('backgroundAITasks', {
    treeDataProvider: taskTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Register commands
  const commandDisposables = registerCommands(context, {
    taskQueue,
    copilotService,
    eventBus,
    configService,
  });
  context.subscriptions.push(...commandDisposables);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'backgroundAI.openTaskPanel';
  context.subscriptions.push(statusBarItem);

  // Update status bar on task changes
  const updateStatusBar = () => {
    const config = configService.getSettings();
    if (!config.showStatusBarProgress) {
      statusBarItem.hide();
      return;
    }

    const stats = taskQueue.getStats();

    if (stats.running === 0 && stats.queued === 0 && stats.completed === 0) {
      statusBarItem.hide();
      return;
    }

    const parts: string[] = [];
    if (stats.running > 0) {
      parts.push(`$(sync~spin) ${stats.running}`);
    }
    if (stats.queued > 0) {
      parts.push(`$(clock) ${stats.queued}`);
    }
    if (stats.completed > 0) {
      parts.push(`$(check) ${stats.completed}`);
    }

    statusBarItem.text = `$(sparkle) AI: ${parts.join(' ')}`;
    statusBarItem.tooltip = `Background AI Tasks\nRunning: ${stats.running}\nQueued: ${stats.queued}\nCompleted: ${stats.completed}`;
    statusBarItem.show();
  };

  // Listen for task status changes
  context.subscriptions.push(
    eventBus.on('task:statusChanged', updateStatusBar),
    eventBus.on('task:created', updateStatusBar)
  );
  updateStatusBar();

  // Set initial context
  vscode.commands.executeCommand('setContext', 'backgroundAI.hasActiveTasks', false);

  // Add services to subscriptions for cleanup
  context.subscriptions.push(eventBus, configService, taskQueue, copilotService);

  logger.info('Background AI Tasks extension activated');
}

export function deactivate(): void {
  const logger = getLogger();
  logger.info('Background AI Tasks extension deactivating...');

  if (statusBarItem) {
    statusBarItem.dispose();
  }

  disposeLogger();
}
