import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { TaskQueue } from './services/taskQueue';
import { CopilotService } from './services/copilotService';
import { ConfigService } from './services/configService';
import { EventBus } from './services/eventBus';
import { TaskTreeProvider } from './providers/taskTreeProvider';
import { getLogger, disposeLogger } from './utils/logging';
import { getInlineFeedbackProvider, disposeInlineFeedbackProvider } from './providers/inlineFeedbackProvider';

let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = getLogger();
  logger.info('Background AI Tasks extension activating...');

  // Initialize services
  const eventBus = new EventBus();
  const configService = new ConfigService();
  const taskQueue = new TaskQueue(eventBus, configService);
  const copilotService = new CopilotService(eventBus, configService);

  // Initialize inline feedback provider (singleton)
  const inlineFeedbackProvider = getInlineFeedbackProvider();
  
  // Register CodeLens provider for Accept/Reject buttons
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: 'file' }, inlineFeedbackProvider)
  );

  // Store globally for command access
  // @ts-ignore
  globalThis.inlineFeedbackProvider = inlineFeedbackProvider;

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

  // ==============================================
  // INLINE FEEDBACK INTEGRATION
  // ==============================================

  // When a task is created, show the "Implementing..." pending indicator
  eventBus.on('task:created', (e) => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const range = new vscode.Range(
        editor.selection.start.line,
        editor.selection.start.character,
        editor.selection.end.line,
        editor.selection.end.character
      );
      
      // Show the pending indicator with spinning animation
      const suggestionId = inlineFeedbackProvider.showPendingIndicator(e.task.id, editor, range);
      logger.info(`Showing pending indicator for task ${e.task.id}, suggestionId: ${suggestionId}`);
    }
  });

  // When a task fails, dismiss the pending indicator
  eventBus.on('task:failed', (e) => {
    logger.info(`Task ${e.taskId} failed, dismissing indicator`);
    inlineFeedbackProvider.dismissPending(e.taskId);
  });

  // When a task is cancelled, dismiss the pending indicator
  eventBus.on('task:cancelled', (e) => {
    logger.info(`Task ${e.taskId} cancelled, dismissing indicator`);
    inlineFeedbackProvider.dismissPending(e.taskId);
  });

  // When a task completes with generated code, show the inline suggestion
  eventBus.on('task:completed', async (e) => {
    if (e.result && e.result.generatedCode) {
      logger.info(`Task ${e.taskId} completed with generated code, showing suggestion`);
      
      // Find the suggestion for this task
      const suggestion = inlineFeedbackProvider.getSuggestionForTask(e.taskId);
      if (suggestion) {
        await inlineFeedbackProvider.showSuggestion(suggestion.id, e.result.generatedCode);
      } else {
        logger.warn(`No pending suggestion found for task ${e.taskId}`);
      }
    }
  });

  // Register Accept/Reject commands with inline feedback provider
  context.subscriptions.push(
    vscode.commands.registerCommand('backgroundAI.acceptSuggestion', async (suggestionId?: string) => {
      // If no suggestionId provided, use the focused suggestion
      const targetId = suggestionId || inlineFeedbackProvider.getFocusedSuggestion()?.id;
      if (targetId) {
        await inlineFeedbackProvider.acceptSuggestion(targetId);
      } else {
        vscode.window.showWarningMessage('No AI suggestion to accept');
      }
    }),
    
    vscode.commands.registerCommand('backgroundAI.rejectSuggestion', async (suggestionId?: string) => {
      // If no suggestionId provided, use the focused suggestion
      const targetId = suggestionId || inlineFeedbackProvider.getFocusedSuggestion()?.id;
      if (targetId) {
        await inlineFeedbackProvider.rejectSuggestion(targetId);
      } else {
        vscode.window.showWarningMessage('No AI suggestion to reject');
      }
    })
  );

  // ==============================================
  // END INLINE FEEDBACK INTEGRATION
  // ==============================================
  
  context.subscriptions.push(inlineFeedbackProvider);

  // Set initial context
  vscode.commands.executeCommand('setContext', 'backgroundAI.hasActiveTasks', false);

  // Add services to subscriptions for cleanup
  context.subscriptions.push(eventBus, configService, taskQueue, copilotService);

  logger.info('Background AI Tasks extension activated');
}

export function deactivate(): void {
  const logger = getLogger();
  logger.info('Background AI Tasks extension deactivating...');

  disposeInlineFeedbackProvider();

  if (statusBarItem) {
    statusBarItem.dispose();
  }

  disposeLogger();
}
