/**
 * InlineFeedbackProvider - Provides visual inline feedback for AI tasks
 * 
 * This provider handles:
 * 1. "Implementing..." spinner decoration when task starts
 * 2. Diff-style inline preview showing additions (green) and deletions (red)
 * 3. Accept/Reject CodeLens buttons above suggestions
 */
import * as vscode from 'vscode';

export interface InlineSuggestion {
  id: string;
  taskId: string;
  documentUri: string;
  originalRange: vscode.Range;
  originalText: string;
  suggestedText: string;
  state: 'pending' | 'showing' | 'accepted' | 'rejected';
}

export class InlineFeedbackProvider implements vscode.Disposable, vscode.CodeLensProvider {
  private disposables: vscode.Disposable[] = [];
  private suggestions: Map<string, InlineSuggestion> = new Map();
  
  // Decoration types
  private pendingDecoration: vscode.TextEditorDecorationType;
  private deletionDecoration: vscode.TextEditorDecorationType;
  private additionDecoration: vscode.TextEditorDecorationType;
  private suggestionHeaderDecoration: vscode.TextEditorDecorationType;

  // CodeLens event emitter
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor() {
    // Pending/implementing decoration - yellow background with spinner text
    this.pendingDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 193, 7, 0.15)',
      isWholeLine: true,
      after: {
        contentText: ' ⏳ Implementing...',
        color: new vscode.ThemeColor('editorWarning.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 2em',
      },
      overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    // Deletion decoration - red strikethrough for removed code
    this.deletionDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      textDecoration: 'line-through',
      color: new vscode.ThemeColor('gitDecoration.deletedResourceForeground'),
      isWholeLine: true,
    });

    // Addition decoration - green background for added code  
    this.additionDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 255, 0, 0.15)',
      border: '1px solid',
      borderColor: new vscode.ThemeColor('gitDecoration.addedResourceForeground'),
      isWholeLine: true,
    });

    // Header decoration for suggestion area
    this.suggestionHeaderDecoration = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: '💡 AI Suggestion - ',
        color: new vscode.ThemeColor('editorInfo.foreground'),
        fontWeight: 'bold',
      },
      after: {
        contentText: ' [Ctrl+Enter to Accept | Esc to Reject]',
        color: new vscode.ThemeColor('descriptionForeground'),
        fontStyle: 'italic',
      },
    });

    // Listen for editor changes to update decorations
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          this.updateDecorations(editor);
        }
      })
    );

    // Listen for document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          this.updateDecorations(editor);
        }
      })
    );
  }

  /**
   * Show pending "implementing..." indicator on the selected lines
   */
  showPendingIndicator(taskId: string, editor: vscode.TextEditor, range: vscode.Range): string {
    const suggestionId = `suggestion-${taskId}-${Date.now()}`;
    
    const suggestion: InlineSuggestion = {
      id: suggestionId,
      taskId,
      documentUri: editor.document.uri.toString(),
      originalRange: range,
      originalText: editor.document.getText(range),
      suggestedText: '',
      state: 'pending',
    };

    this.suggestions.set(suggestionId, suggestion);
    this.updateDecorations(editor);
    this._onDidChangeCodeLenses.fire();

    return suggestionId;
  }

  /**
   * Show the AI suggestion with diff-style highlighting
   */
  async showSuggestion(suggestionId: string, suggestedText: string): Promise<void> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      return;
    }

    suggestion.suggestedText = suggestedText;
    suggestion.state = 'showing';
    this.suggestions.set(suggestionId, suggestion);

    // Find the editor for this document
    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.uri.toString() === suggestion.documentUri
    );

    if (editor) {
      // Insert the suggested code as a preview (we'll show both old and new)
      await this.insertSuggestionPreview(editor, suggestion);
      this.updateDecorations(editor);
    }

    this._onDidChangeCodeLenses.fire();
    
    // Set context for keyboard shortcuts
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasFocusedSuggestion', true);
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasVisibleSuggestions', true);
  }

  /**
   * Insert suggestion preview into the document showing diff
   */
  private async insertSuggestionPreview(editor: vscode.TextEditor, suggestion: InlineSuggestion): Promise<void> {
    const document = editor.document;
    const originalRange = suggestion.originalRange;
    
    // Create the preview text with markers
    const originalLines = suggestion.originalText.split('\n');
    const suggestedLines = suggestion.suggestedText.split('\n');
    
    // Build a combined view showing deletions and additions
    let previewText = '';
    
    // Add deletion markers for original lines
    for (const line of originalLines) {
      previewText += `// [REMOVE] ${line}\n`;
    }
    
    // Add the suggested code
    previewText += suggestion.suggestedText;
    
    // Store the preview range for later cleanup
    const startLine = originalRange.start.line;
    
    // Replace the original text with the preview
    await editor.edit(editBuilder => {
      editBuilder.replace(originalRange, previewText);
    });

    // Update the suggestion with the new range info
    const newEndLine = startLine + originalLines.length + suggestedLines.length - 1;
    suggestion.originalRange = new vscode.Range(
      startLine,
      0,
      newEndLine,
      document.lineAt(Math.min(newEndLine, document.lineCount - 1)).text.length
    );
    
    // Move cursor to the suggestion area
    const newPosition = new vscode.Position(startLine, 0);
    editor.selection = new vscode.Selection(newPosition, newPosition);
    editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenter);
  }

  /**
   * Accept the suggestion - keep the new code, remove the deletion markers
   */
  async acceptSuggestion(suggestionId: string): Promise<boolean> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion || suggestion.state !== 'showing') {
      return false;
    }

    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.uri.toString() === suggestion.documentUri
    );

    if (!editor) {
      return false;
    }

    // Get current document text in the suggestion area
    const document = editor.document;
    const text = document.getText(suggestion.originalRange);
    
    // Remove the [REMOVE] lines and keep only the suggested code
    const lines = text.split('\n');
    const newLines = lines.filter(line => !line.startsWith('// [REMOVE]'));
    const newText = newLines.join('\n');

    await editor.edit(editBuilder => {
      editBuilder.replace(suggestion.originalRange, newText);
    });

    suggestion.state = 'accepted';
    this.suggestions.delete(suggestionId);
    this.updateDecorations(editor);
    this._onDidChangeCodeLenses.fire();
    this.updateContextKeys();

    vscode.window.showInformationMessage('AI suggestion accepted!');
    return true;
  }

  /**
   * Reject the suggestion - restore the original code
   */
  async rejectSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      return;
    }

    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.uri.toString() === suggestion.documentUri
    );

    if (editor && suggestion.state === 'showing') {
      // Restore the original text
      await editor.edit(editBuilder => {
        editBuilder.replace(suggestion.originalRange, suggestion.originalText);
      });
    }

    this.suggestions.delete(suggestionId);
    
    if (editor) {
      this.updateDecorations(editor);
    }
    
    this._onDidChangeCodeLenses.fire();
    this.updateContextKeys();

    vscode.window.showInformationMessage('AI suggestion rejected.');
  }

  /**
   * Dismiss a pending indicator (for failed/cancelled tasks)
   */
  dismissPending(taskId: string): void {
    // Find and remove any suggestion for this task
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.taskId === taskId && suggestion.state === 'pending') {
        this.suggestions.delete(id);
      }
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
    this._onDidChangeCodeLenses.fire();
    this.updateContextKeys();
  }

  /**
   * Get suggestion for a task
   */
  getSuggestionForTask(taskId: string): InlineSuggestion | undefined {
    for (const suggestion of this.suggestions.values()) {
      if (suggestion.taskId === taskId) {
        return suggestion;
      }
    }
    return undefined;
  }

  /**
   * Get the focused suggestion (cursor is within suggestion range)
   */
  getFocusedSuggestion(): InlineSuggestion | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    const cursorLine = editor.selection.active.line;
    const documentUri = editor.document.uri.toString();

    for (const suggestion of this.suggestions.values()) {
      if (suggestion.documentUri === documentUri && 
          suggestion.state === 'showing' &&
          cursorLine >= suggestion.originalRange.start.line &&
          cursorLine <= suggestion.originalRange.end.line) {
        return suggestion;
      }
    }
    return undefined;
  }

  /**
   * Update decorations for the editor
   */
  private updateDecorations(editor: vscode.TextEditor): void {
    const documentUri = editor.document.uri.toString();
    
    const pendingRanges: vscode.DecorationOptions[] = [];
    const deletionRanges: vscode.DecorationOptions[] = [];
    const additionRanges: vscode.DecorationOptions[] = [];
    const headerRanges: vscode.DecorationOptions[] = [];

    for (const suggestion of this.suggestions.values()) {
      if (suggestion.documentUri !== documentUri) {
        continue;
      }

      if (suggestion.state === 'pending') {
        // Show pending indicator
        pendingRanges.push({
          range: suggestion.originalRange,
          hoverMessage: 'AI is implementing your request...',
        });
      } else if (suggestion.state === 'showing') {
        // Show diff-style decorations
        const document = editor.document;
        const startLine = suggestion.originalRange.start.line;
        const endLine = suggestion.originalRange.end.line;

        for (let line = startLine; line <= endLine && line < document.lineCount; line++) {
          const lineText = document.lineAt(line).text;
          const lineRange = new vscode.Range(line, 0, line, lineText.length);

          if (lineText.startsWith('// [REMOVE]')) {
            deletionRanges.push({
              range: lineRange,
              hoverMessage: 'This line will be removed',
            });
          } else {
            additionRanges.push({
              range: lineRange,
              hoverMessage: 'This line will be added',
            });
          }
        }

        // Add header to first line
        if (startLine < document.lineCount) {
          headerRanges.push({
            range: new vscode.Range(startLine, 0, startLine, 0),
          });
        }
      }
    }

    editor.setDecorations(this.pendingDecoration, pendingRanges);
    editor.setDecorations(this.deletionDecoration, deletionRanges);
    editor.setDecorations(this.additionDecoration, additionRanges);
    editor.setDecorations(this.suggestionHeaderDecoration, headerRanges);
  }

  /**
   * Update context keys for keyboard shortcuts
   */
  private updateContextKeys(): void {
    const hasShowing = Array.from(this.suggestions.values()).some(s => s.state === 'showing');
    const focused = this.getFocusedSuggestion();
    
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasVisibleSuggestions', hasShowing);
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasFocusedSuggestion', !!focused);
  }

  /**
   * CodeLens provider - show Accept/Reject buttons
   */
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const documentUri = document.uri.toString();

    for (const suggestion of this.suggestions.values()) {
      if (suggestion.documentUri !== documentUri) {
        continue;
      }
      if (suggestion.state !== 'showing') {
        continue;
      }

      const range = new vscode.Range(
        suggestion.originalRange.start.line,
        0,
        suggestion.originalRange.start.line,
        0
      );

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '✓ Accept Changes',
          command: 'backgroundAI.acceptSuggestion',
          arguments: [suggestion.id],
          tooltip: 'Apply the AI suggestion (Ctrl+Enter)',
        }),
        new vscode.CodeLens(range, {
          title: '✗ Reject Changes',
          command: 'backgroundAI.rejectSuggestion',
          arguments: [suggestion.id],
          tooltip: 'Discard the AI suggestion (Esc)',
        })
      );
    }

    return codeLenses;
  }

  dispose(): void {
    this.pendingDecoration.dispose();
    this.deletionDecoration.dispose();
    this.additionDecoration.dispose();
    this.suggestionHeaderDecoration.dispose();
    this._onDidChangeCodeLenses.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

// Singleton instance for global access
let instance: InlineFeedbackProvider | undefined;

export function getInlineFeedbackProvider(): InlineFeedbackProvider {
  if (!instance) {
    instance = new InlineFeedbackProvider();
  }
  return instance;
}

export function disposeInlineFeedbackProvider(): void {
  if (instance) {
    instance.dispose();
    instance = undefined;
  }
}
