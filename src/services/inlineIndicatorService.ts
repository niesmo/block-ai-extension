// InlineIndicatorService skeleton implementing IInlineIndicatorService
import * as vscode from 'vscode';
import { WorkingInlineIndicator, WorkingCodeSuggestion, WorkingRange, IndicatorState } from '../models/inlineIndicator';
import { saveIndicators, loadIndicators } from '../utils/indicatorPersistence';
import { ConfigService } from './configService';

export class InlineIndicatorService {
  private indicators: Map<string, WorkingInlineIndicator> = new Map();
  private context: vscode.ExtensionContext;
  private configService: ConfigService;

  constructor(context: vscode.ExtensionContext, configService: ConfigService) {
    this.context = context;
    this.configService = configService;

    // Listen for document changes to update indicator positions
    vscode.workspace.onDidChangeTextDocument((event) => {
      const uri = event.document.uri.toString();
      const indicators = this.getIndicatorsForDocument(uri);
      for (const indicator of indicators) {
        // Update position using positionTracker utility
        // For now, just refresh updatedAt
        indicator.updatedAt = new Date();
        this.indicators.set(indicator.id, indicator);
      }
      this.updatePendingContext();
    });

    // Listen for cursor position changes to update hasFocusedSuggestion context key
    vscode.window.onDidChangeTextEditorSelection(() => {
      const focused = this.getFocusedSuggestion();
      vscode.commands.executeCommand('setContext', 'backgroundAI.hasFocusedSuggestion', !!focused);
    });

    // Listen for file open events to restore indicators for reopened documents
    vscode.workspace.onDidOpenTextDocument((document) => {
      this.restoreIndicatorsForDocument(document.uri.toString());
    });
  }

  createIndicator(taskId: string, documentUri: string, range: WorkingRange): WorkingInlineIndicator {
    const indicator: WorkingInlineIndicator = {
      id: `${taskId}-${Date.now()}`,
      taskId,
      documentUri,
      range,
      state: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.indicators.set(indicator.id, indicator);
    this.updatePendingContext();
    return indicator;
  }

  getIndicator(id: string): WorkingInlineIndicator | undefined {
    return this.indicators.get(id);
  }

  getIndicatorForTask(taskId: string): WorkingInlineIndicator | undefined {
    return Array.from(this.indicators.values()).find(ind => ind.taskId === taskId);
  }

  getIndicatorsForDocument(documentUri: string): WorkingInlineIndicator[] {
    return Array.from(this.indicators.values()).filter(ind => ind.documentUri === documentUri);
  }

  updateState(id: string, newState: IndicatorState): void {
    const indicator = this.indicators.get(id);
    if (indicator) {
      indicator.state = newState;
      indicator.updatedAt = new Date();
      this.indicators.set(id, indicator);
      this.updatePendingContext();
    }
  }
  private updatePendingContext() {
    const hasPending = Array.from(this.indicators.values()).some(ind => ind.state === 'pending');
    vscode.commands.executeCommand('setContext', 'backgroundAI.hasPendingIndicators', hasPending);
  }

  showSuggestion(indicatorId: string, suggestion: WorkingCodeSuggestion): void {
    const indicator = this.indicators.get(indicatorId);
    if (indicator) {
      indicator.suggestion = suggestion;
      indicator.state = 'showing-suggestion';
      indicator.updatedAt = new Date();
      this.indicators.set(indicatorId, indicator);
      this.updatePendingContext();
      
      // Refresh CodeLens to show Accept/Reject buttons
      // @ts-ignore
      if (globalThis.suggestionCodeLensProvider) {
        // @ts-ignore
        globalThis.suggestionCodeLensProvider.refresh();
      }
    }
  }

  async acceptSuggestion(suggestionId: string): Promise<boolean> {
    // Find indicator by suggestionId
    const indicator = Array.from(this.indicators.values()).find(ind => ind.suggestion?.id === suggestionId);
    if (!indicator || !indicator.suggestion) {return false;}
    // Insert code into document
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === indicator.documentUri) {
      await editor.edit(editBuilder => {
        const range = new vscode.Range(
            indicator.suggestion!.range.startLine,
            indicator.suggestion!.range.startCharacter,
            indicator.suggestion!.range.endLine,
            indicator.suggestion!.range.endCharacter
          );
        editBuilder.replace(range, indicator.suggestion!.generatedCode);
      });
      indicator.state = 'dismissed'; // Mark as dismissed after accepting
      indicator.updatedAt = new Date();
      indicator.suggestion = undefined; // Clear suggestion
      this.indicators.set(indicator.id, indicator);
      this.updatePendingContext();
      return true;
    }
    return false;
  }

  async rejectSuggestion(suggestionId: string): Promise<void> {
    // Find indicator by suggestionId
    const indicator = Array.from(this.indicators.values()).find(ind => ind.suggestion?.id === suggestionId);
    if (!indicator) {return;}
    indicator.state = 'dismissed'; // Mark as dismissed after rejecting
    indicator.updatedAt = new Date();
    indicator.suggestion = undefined;
    this.indicators.set(indicator.id, indicator);
    this.updatePendingContext();
  }

  dismissIndicator(id: string): void {
    this.indicators.delete(id);
    this.updatePendingContext();
  }

  dismissIndicatorWithDelay(id: string, delayMs?: number): void {
    const settings = this.configService.getSettings();
    if (!settings.autoDismissOnFailure) {return;}
    
    const delay = delayMs ?? settings.failureIndicatorDuration;
    setTimeout(() => {
      this.dismissIndicator(id);
    }, delay);
  }

  getFocusedSuggestion(): WorkingInlineIndicator | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return undefined;}

    const cursorLine = editor.selection.active.line;
    const indicators = this.getIndicatorsForDocument(editor.document.uri.toString());
    
    // Find suggestion that contains or is near the cursor position
    return indicators.find(ind => {
      if (ind.state !== 'showing-suggestion' || !ind.suggestion) {return false;}
      const suggestionRange = ind.suggestion.range;
      return cursorLine >= suggestionRange.startLine && cursorLine <= suggestionRange.endLine;
    });
  }

  getAllIndicators(): WorkingInlineIndicator[] {
    return Array.from(this.indicators.values());
  }

  saveState(): void {
    const indicators = Array.from(this.indicators.values());
    saveIndicators(this.context, indicators as any);
  }

  restoreState(): void {
    const indicators = loadIndicators(this.context) as any[];
    for (const indicator of indicators) {
      // Validate indicator before restoring
      if (this.isValidIndicator(indicator)) {
        this.indicators.set(indicator.id, indicator);
      }
    }
    this.updatePendingContext();
  }

  private restoreIndicatorsForDocument(documentUri: string): void {
    const indicators = loadIndicators(this.context) as any[];
    for (const indicator of indicators) {
      if (indicator.documentUri === documentUri && this.isValidIndicator(indicator)) {
        this.indicators.set(indicator.id, indicator);
      }
    }
    this.updatePendingContext();
  }

  private isValidIndicator(indicator: any): boolean {
    // Validate indicator has required fields
    if (!indicator.id || !indicator.taskId || !indicator.documentUri || !indicator.range) {
      return false;
    }
    // Validate range has valid line numbers
    if (indicator.range.startLine < 0 || indicator.range.endLine < 0) {
      return false;
    }
    // Validate indicator is not too old (e.g., 7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const age = Date.now() - new Date(indicator.createdAt).getTime();
    if (age > maxAge) {
      return false;
    }
    return true;
  }
}
