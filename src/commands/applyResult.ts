/**
 * Apply Result Command
 * Applies AI-generated code to the original document location
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { EventBus } from '../services/eventBus';
import { ConfigService } from '../services/configService';
import { validateContext } from '../utils/context';
import { getLogger } from '../utils/logging';
import { rangeToVscode } from '../models/task';

/**
 * Apply Result command handler
 */
export class ApplyResultCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private taskQueue: TaskQueue,
    private eventBus: EventBus,
    private configService: ConfigService
  ) {}

  /**
   * Execute the apply result command
   */
  async execute(taskId: string): Promise<boolean> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      vscode.window.showErrorMessage('Task not found');
      return false;
    }

    if (!task.result) {
      logger.warn(`Task ${taskId} has no result`);
      vscode.window.showErrorMessage('Task has no result to apply');
      return false;
    }

    // Validate context is still valid
    const validation = await validateContext(task.context);
    if (!validation.valid) {
      const action = await vscode.window.showWarningMessage(
        `The original document has changed: ${validation.reason}. Apply anyway?`,
        'Apply Anyway',
        'View Diff',
        'Cancel'
      );

      if (action === 'View Diff') {
        vscode.commands.executeCommand('backgroundAI.viewResult', taskId);
        return false;
      }

      if (action !== 'Apply Anyway') {
        return false;
      }
    }

    try {
      // Open the original document
      const uri = vscode.Uri.parse(task.context.documentUri);
      const document = await vscode.workspace.openTextDocument(uri);

      // Create the edit
      const edit = new vscode.WorkspaceEdit();
      const range = rangeToVscode(task.context.selectionRange);
      edit.replace(uri, range, task.result.generatedCode);

      // Apply the edit
      const success = await vscode.workspace.applyEdit(edit);

      if (success) {
        logger.info(`Applied result for task ${taskId}`);

        // Emit event
        this.eventBus.emit('result:applied', {
          taskId,
          documentUri: task.context.documentUri,
          success: true,
        });

        // Show the document
        await vscode.window.showTextDocument(document);

        // Auto-archive if configured
        const settings = this.configService.getSettings();
        if (settings.autoArchiveAfterApply) {
          this.taskQueue.archiveTask(taskId);
        }

        vscode.window.showInformationMessage('AI-generated code applied successfully');
        return true;
      } else {
        logger.error(`Failed to apply edit for task ${taskId}`);
        vscode.window.showErrorMessage('Failed to apply changes');
        return false;
      }
    } catch (error) {
      logger.error('Error applying result', error);
      vscode.window.showErrorMessage(
        `Error applying result: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
