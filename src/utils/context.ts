/**
 * Context extraction utilities
 * Handles extracting code context from the active editor
 */

import * as vscode from 'vscode';
import { CodeContext, rangeFromVscode } from '../models/task';
import { getLogger } from './logging';

/**
 * Extract code context from the current selection
 */
export function extractSelectionContext(
  editor: vscode.TextEditor
): CodeContext | null {
  const logger = getLogger();
  const { document, selection } = editor;

  if (selection.isEmpty) {
    logger.debug('Selection is empty, cannot extract context');
    return null;
  }

  const selectedText = document.getText(selection);
  
  if (!selectedText.trim()) {
    logger.debug('Selected text is whitespace only');
    return null;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const relativePath = workspaceFolder
    ? vscode.workspace.asRelativePath(document.uri, false)
    : document.fileName;

  const context: CodeContext = {
    documentUri: document.uri.toString(),
    languageId: document.languageId,
    selectedText,
    selectionRange: rangeFromVscode(selection),
    relativePath,
  };

  logger.debug('Extracted context', {
    file: relativePath,
    language: document.languageId,
    selectionLength: selectedText.length,
  });

  return context;
}

/**
 * Extract context with surrounding code for better AI understanding
 */
export function extractExpandedContext(
  editor: vscode.TextEditor,
  linesBefore: number = 10,
  linesAfter: number = 10
): CodeContext | null {
  const basicContext = extractSelectionContext(editor);
  if (!basicContext) {
    return null;
  }

  const { document, selection } = editor;
  
  const startLine = Math.max(0, selection.start.line - linesBefore);
  const endLine = Math.min(document.lineCount - 1, selection.end.line + linesAfter);
  
  const expandedRange = new vscode.Range(
    startLine,
    0,
    endLine,
    document.lineAt(endLine).text.length
  );

  const fullDocumentText = document.getText(expandedRange);

  return {
    ...basicContext,
    fullDocumentText,
  };
}

/**
 * Validate that a context is still valid (document hasn't changed significantly)
 */
export async function validateContext(
  context: CodeContext
): Promise<{ valid: boolean; reason?: string }> {
  const logger = getLogger();

  try {
    const uri = vscode.Uri.parse(context.documentUri);
    const document = await vscode.workspace.openTextDocument(uri);
    
    const range = new vscode.Range(
      context.selectionRange.startLine,
      context.selectionRange.startCharacter,
      context.selectionRange.endLine,
      context.selectionRange.endCharacter
    );

    // Check if range is still valid
    if (range.end.line >= document.lineCount) {
      return {
        valid: false,
        reason: 'Document has fewer lines than the original selection range',
      };
    }

    // Check if the text at the range still matches
    const currentText = document.getText(range);
    if (currentText !== context.selectedText) {
      return {
        valid: false,
        reason: 'Selected text has changed since task creation',
      };
    }

    return { valid: true };
  } catch (error) {
    logger.error('Error validating context', error);
    return {
      valid: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the file name from a context
 */
export function getFileName(context: CodeContext): string {
  return context.relativePath.split(/[/\\]/).pop() || 'unknown';
}

/**
 * Create a preview of the prompt (truncated)
 */
export function createPromptPreview(prompt: string, maxLength: number = 50): string {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.substring(0, maxLength - 3) + '...';
}
