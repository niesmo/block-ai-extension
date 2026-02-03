// SuggestionCodeLensProvider: Shows Accept/Reject CodeLens above suggestions
import * as vscode from 'vscode';

export class SuggestionCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    // Find all suggestions for this document
    // For now, use a global InlineIndicatorService (to be refactored for DI)
    const codeLenses: vscode.CodeLens[] = [];
    // @ts-ignore
    const indicators = globalThis.inlineIndicatorService?.getIndicatorsForDocument(document.uri.toString()) || [];
    for (const indicator of indicators) {
      if (indicator.state === 'showing-suggestion' && indicator.suggestion) {
        const range = new vscode.Range(
          indicator.suggestion.range.startLine,
          indicator.suggestion.range.startCharacter,
          indicator.suggestion.range.endLine,
          indicator.suggestion.range.endCharacter
        );
        codeLenses.push(new vscode.CodeLens(range, {
          title: 'Accept',
          command: 'backgroundAI.acceptSuggestion',
          arguments: [indicator.suggestion.id]
        }));
        codeLenses.push(new vscode.CodeLens(range, {
          title: 'Reject',
          command: 'backgroundAI.rejectSuggestion',
          arguments: [indicator.suggestion.id]
        }));
      }
    }
    return codeLenses;
  }

  resolveCodeLens?(codeLens: vscode.CodeLens, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
