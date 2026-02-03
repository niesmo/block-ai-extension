// Theme color definitions for inline feedback indicators and suggestions
import * as vscode from 'vscode';

export const pendingIndicatorColor = new vscode.ThemeColor('editorInfo.foreground');
export const pendingIndicatorBackground = new vscode.ThemeColor('editor.hoverHighlightBackground');
export const suggestionBackground = new vscode.ThemeColor('diffEditor.insertedTextBackground');
export const suggestionBorder = new vscode.ThemeColor('editorGutter.addedBackground');
export const rejectColor = new vscode.ThemeColor('editorError.foreground');
