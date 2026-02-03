// Command handler for navigating between suggestions (next/prev)
import * as vscode from 'vscode';
import { InlineIndicatorService } from '../services/inlineIndicatorService';

export function registerNavigateSuggestionCommand(context: vscode.ExtensionContext, inlineIndicatorService: InlineIndicatorService) {
  context.subscriptions.push(
    vscode.commands.registerCommand('backgroundAI.nextSuggestion', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {return;}

      const indicators = inlineIndicatorService.getIndicatorsForDocument(editor.document.uri.toString());
      const suggestions = indicators.filter(ind => ind.state === 'showing-suggestion' && ind.suggestion);
      
      if (suggestions.length === 0) {return;}

      // Find next suggestion after current cursor position
      const currentLine = editor.selection.active.line;
      const nextSuggestion = suggestions.find(ind => ind.suggestion!.range.startLine > currentLine) || suggestions[0];
      
      // Move cursor to suggestion
      const newPosition = new vscode.Position(nextSuggestion.suggestion!.range.startLine, 0);
      editor.selection = new vscode.Selection(newPosition, newPosition);
      editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenter);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('backgroundAI.prevSuggestion', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {return;}

      const indicators = inlineIndicatorService.getIndicatorsForDocument(editor.document.uri.toString());
      const suggestions = indicators.filter(ind => ind.state === 'showing-suggestion' && ind.suggestion);
      
      if (suggestions.length === 0) {return;}

      // Find previous suggestion before current cursor position
      const currentLine = editor.selection.active.line;
      const prevSuggestions = suggestions.filter(ind => ind.suggestion!.range.startLine < currentLine);
      const prevSuggestion = prevSuggestions.length > 0 ? prevSuggestions[prevSuggestions.length - 1] : suggestions[suggestions.length - 1];
      
      // Move cursor to suggestion
      const newPosition = new vscode.Position(prevSuggestion.suggestion!.range.startLine, 0);
      editor.selection = new vscode.Selection(newPosition, newPosition);
      editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenter);
    })
  );
}
