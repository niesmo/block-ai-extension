/**
 * View Result Command
 * Opens a diff view to compare AI-generated code with original
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { ResultDocumentProvider } from '../providers/resultDocProvider';
import { getLogger } from '../utils/logging';

/**
 * View Result command handler
 */
export class ViewResultCommand implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private taskQueue: TaskQueue,
    private resultDocProvider: ResultDocumentProvider
  ) {}

  /**
   * Execute the view result command
   */
  async execute(taskId: string): Promise<void> {
    const logger = getLogger();
    const task = this.taskQueue.getTask(taskId);

    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      vscode.window.showErrorMessage('Task not found');
      return;
    }

    if (!task.result) {
      logger.warn(`Task ${taskId} has no result`);
      vscode.window.showErrorMessage('Task has no result to view');
      return;
    }

    try {
      // Open the original document and show the generated code
      const originalUri = vscode.Uri.parse(task.context.documentUri);
      const document = await vscode.workspace.openTextDocument(originalUri);
      
      // Create a title for display
      const fileName = task.context.relativePath.split(/[/\\]/).pop() || 'code';
      const promptPreview = task.prompt.substring(0, 30) + (task.prompt.length > 30 ? '...' : '');

      // Show the original document
      const editor = await vscode.window.showTextDocument(document);
      
      // Highlight the selection that will be replaced
      const range = new vscode.Range(
        task.context.selectionRange.startLine,
        task.context.selectionRange.startCharacter,
        task.context.selectionRange.endLine,
        task.context.selectionRange.endCharacter
      );
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      logger.debug(`Opened document for task ${taskId}`);
      logger.info(`Generated code preview:\n${task.result.generatedCode.substring(0, 200)}...`);

      // Show the generated code in a panel and ask for action
      const action = await vscode.window.showInformationMessage(
        `AI Task Complete: ${promptPreview}\n\nGenerated ${task.result.generatedCode.split('\n').length} lines of code.`,
        { modal: false },
        'Apply Changes',
        'Show Generated Code',
        'Dismiss'
      );

      if (action === 'Apply Changes') {
        vscode.commands.executeCommand('backgroundAI.applyResult', taskId);
      } else if (action === 'Show Generated Code') {
        // Open the generated code in a new untitled document for review
        const resultDoc = await vscode.workspace.openTextDocument({
          content: task.result.generatedCode,
          language: task.context.languageId,
        });
        await vscode.window.showTextDocument(resultDoc, { viewColumn: vscode.ViewColumn.Beside, preview: true });
        this.showResultActions(taskId);
      } else if (action === 'Dismiss') {
        vscode.commands.executeCommand('backgroundAI.dismissResult', taskId);
      }
    } catch (error) {
      logger.error('Error viewing result', error);
      vscode.window.showErrorMessage(
        `Error viewing result: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Show actions for the result
   */
  private async showResultActions(taskId: string): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      'Review the AI-generated changes',
      'Apply Changes',
      'Dismiss'
    );

    if (action === 'Apply Changes') {
      vscode.commands.executeCommand('backgroundAI.applyResult', taskId);
    } else if (action === 'Dismiss') {
      vscode.commands.executeCommand('backgroundAI.dismissResult', taskId);
    }
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
