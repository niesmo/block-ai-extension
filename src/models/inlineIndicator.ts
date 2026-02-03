// InlineIndicator and CodeSuggestion types for inline feedback feature

// Working implementation types that simplify the contracts for MVP
export type IndicatorState = 'pending' | 'showing-suggestion' | 'dismissed';
export type InsertionType = 'replace' | 'insert' | 'append';

export interface WorkingRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface WorkingCodeSuggestion {
  readonly id: string;
  readonly indicatorId: string;
  generatedCode: string;
  originalSelection: string;
  insertionType: InsertionType;
  range: WorkingRange;
  createdAt: Date;
}

export interface WorkingInlineIndicator {
  readonly id: string;
  readonly taskId: string;
  documentUri: string;
  range: WorkingRange;
  state: IndicatorState;
  suggestion?: WorkingCodeSuggestion;
  readonly createdAt: Date;
  updatedAt: Date;
}
