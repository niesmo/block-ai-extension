// PendingIndicatorProvider: Applies/removes pending indicator decorations
import * as vscode from 'vscode';
import { WorkingInlineIndicator } from '../models/inlineIndicator';
import { pendingIndicatorColor, pendingIndicatorBackground, suggestionBackground, suggestionBorder } from '../utils/themeColors';
import { ConfigService } from '../services/configService';

export class PendingIndicatorProvider {
  private decorationType: vscode.TextEditorDecorationType;
  private suggestionDecorationType: vscode.TextEditorDecorationType;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: pendingIndicatorBackground,
      color: pendingIndicatorColor,
      border: '1px solid',
      borderColor: pendingIndicatorColor,
      isWholeLine: true,
      after: {
        contentText: '⏳ AI Task Pending...',
        color: pendingIndicatorColor,
        margin: '0 0 0 1em',
      },
    });
    this.suggestionDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: suggestionBackground,
      border: '2px solid',
      borderColor: suggestionBorder,
      isWholeLine: true,
      after: {
        contentText: '💡 AI Suggestion',
        color: pendingIndicatorColor,
        margin: '0 0 0 1em',
      },
    });
  }

  apply(editor: vscode.TextEditor, indicator: WorkingInlineIndicator) {
    const settings = this.configService.getSettings();
    
    const range = new vscode.Range(
      indicator.range.startLine,
      0,
      indicator.range.startLine,
      0
    );
    if (indicator.state === 'pending' && settings.showPendingIndicators) {
      editor.setDecorations(this.decorationType, [range]);
    } else if (indicator.state === 'showing-suggestion' && indicator.suggestion && settings.showInlineSuggestions) {
      const suggestionRange = new vscode.Range(
        indicator.suggestion.range.startLine,
        indicator.suggestion.range.startCharacter,
        indicator.suggestion.range.endLine,
        indicator.suggestion.range.endCharacter
      );
      editor.setDecorations(this.suggestionDecorationType, [suggestionRange]);
    }
  }

  remove(editor: vscode.TextEditor) {
    editor.setDecorations(this.decorationType, []);
    editor.setDecorations(this.suggestionDecorationType, []);
  }

  dispose() {
    this.decorationType.dispose();
  }
}
