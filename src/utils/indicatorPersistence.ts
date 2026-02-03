// Persistence utility for InlineIndicators and CodeSuggestions
import { WorkingInlineIndicator } from '../models/inlineIndicator';
import * as vscode from 'vscode';

const INDICATOR_KEY = 'inlineIndicators';

export function saveIndicators(context: vscode.ExtensionContext, indicators: WorkingInlineIndicator[]): void {
  context.workspaceState.update(INDICATOR_KEY, indicators);
}

export function loadIndicators(context: vscode.ExtensionContext): WorkingInlineIndicator[] {
  return context.workspaceState.get<WorkingInlineIndicator[]>(INDICATOR_KEY, []);
}
