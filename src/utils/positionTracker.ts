// Utility for tracking character offsets and updating indicator positions
import * as vscode from 'vscode';

export interface TrackedPosition {
  documentUri: string;
  originalOffset: number;
  currentRange: vscode.Range;
}

export function getOffset(document: vscode.TextDocument, position: vscode.Position): number {
  return document.offsetAt(position);
}

export function getPosition(document: vscode.TextDocument, offset: number): vscode.Position {
  return document.positionAt(offset);
}

export function updateTrackedPosition(document: vscode.TextDocument, tracked: TrackedPosition): TrackedPosition {
  // Recalculate range based on offset
  const start = getPosition(document, tracked.originalOffset);
  // For simplicity, assume single-point indicators for now
  return {
    ...tracked,
    currentRange: new vscode.Range(start, start)
  };
}
