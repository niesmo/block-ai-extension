// Command handler for rejecting AI code suggestion
import * as vscode from 'vscode';
import { InlineIndicatorService } from '../services/inlineIndicatorService';

export function registerRejectSuggestionCommand(context: vscode.ExtensionContext, inlineIndicatorService: InlineIndicatorService) {
  context.subscriptions.push(
    vscode.commands.registerCommand('backgroundAI.rejectSuggestion', async (suggestionId?: string) => {
      if (!suggestionId) {
        // No ID provided, try to use focused suggestion
        const focused = inlineIndicatorService.getFocusedSuggestion();
        if (focused && focused.suggestion) {
          suggestionId = focused.suggestion.id;
        }
      }
      if (suggestionId) {
        await inlineIndicatorService.rejectSuggestion(suggestionId);
      }
    })
  );
}
