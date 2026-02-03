/**
 * Core type definitions for Inline Task Feedback
 * 
 * @module contracts/types
 * @feature 002-inline-task-feedback
 */

/**
 * State of an inline indicator
 */
export type IndicatorState = 
  | 'pending'           // Task is processing; show spinner
  | 'showing-suggestion' // Task completed; displaying suggestion
  | 'dismissed';         // User rejected or removed

/**
 * How the suggestion relates to original code
 */
export type InsertionType =
  | 'insert'   // New code being added (no replacement)
  | 'replace'  // Code replacing the original selection
  | 'modify';  // Partial modifications to original

/**
 * Position range in a document (mirrors vscode.Range)
 */
export interface Range {
  /** Starting line (0-based) */
  startLine: number;
  /** Starting column (0-based) */
  startCharacter: number;
  /** Ending line (0-based) */
  endLine: number;
  /** Ending column (0-based) */
  endCharacter: number;
}

/**
 * Position information for where an indicator is anchored
 */
export interface IndicatorLocation {
  /** URI of the document */
  documentUri: string;
  
  /** Character offset from document start (stable across line changes) */
  characterOffset: number;
  
  /** The original selection range at creation time */
  originalRange: Range;
  
  /** Updated range after document edits */
  currentRange: Range;
  
  /** Whether the location is still valid */
  isValid: boolean;
}

/**
 * Visual indicator displayed in the editor
 */
export interface InlineIndicator {
  /** Unique identifier (UUID) */
  readonly id: string;
  
  /** Reference to associated AITask */
  readonly taskId: string;
  
  /** Current display state */
  state: IndicatorState;
  
  /** Position in the editor */
  location: IndicatorLocation;
  
  /** When indicator was created */
  readonly createdAt: Date;
  
  /** Last state change timestamp */
  updatedAt: Date;
}

/**
 * AI-generated code suggestion displayed inline
 */
export interface CodeSuggestion {
  /** Unique identifier (UUID) */
  readonly id: string;
  
  /** Reference to parent InlineIndicator */
  readonly indicatorId: string;
  
  /** The AI-suggested code content */
  generatedCode: string;
  
  /** Original selected text for diff display */
  originalSelection: string;
  
  /** How the suggestion relates to original code */
  insertionType: InsertionType;
  
  /** Current range where suggestion is displayed in editor */
  displayRange: Range;
  
  /** When user accepted (null if not accepted) */
  acceptedAt: Date | null;
  
  /** When user rejected (null if not rejected) */
  rejectedAt: Date | null;
}

/**
 * Service interface for managing inline indicators
 */
export interface IInlineIndicatorService {
  /**
   * Create a new pending indicator for a task
   */
  createIndicator(taskId: string, documentUri: string, range: Range): InlineIndicator;
  
  /**
   * Get indicator by ID
   */
  getIndicator(id: string): InlineIndicator | undefined;
  
  /**
   * Get indicator for a specific task
   */
  getIndicatorForTask(taskId: string): InlineIndicator | undefined;
  
  /**
   * Get all indicators for a document
   */
  getIndicatorsForDocument(documentUri: string): InlineIndicator[];
  
  /**
   * Update indicator state (e.g., pending → showing-suggestion)
   */
  updateState(id: string, newState: IndicatorState): void;
  
  /**
   * Display a code suggestion for an indicator
   */
  showSuggestion(indicatorId: string, suggestion: CodeSuggestion): void;
  
  /**
   * Accept a suggestion (apply code permanently)
   */
  acceptSuggestion(suggestionId: string): Promise<boolean>;
  
  /**
   * Reject a suggestion (remove without applying)
   */
  rejectSuggestion(suggestionId: string): void;
  
  /**
   * Dismiss/remove an indicator
   */
  dismissIndicator(id: string): void;
  
  /**
   * Get all active indicators
   */
  getAllIndicators(): InlineIndicator[];
}

/**
 * Persistence schema for workspace state
 */
export interface PersistedIndicator {
  id: string;
  taskId: string;
  documentUri: string;
  characterOffset: number;
  originalRangeJson: string;
  suggestion?: {
    id: string;
    generatedCode: string;
    originalSelection: string;
    insertionType: InsertionType;
  };
  createdAt: string;
}

/**
 * Root persistence object
 */
export interface PersistedState {
  /** Schema version for migrations */
  version: number;
  /** Persisted indicators */
  indicators: PersistedIndicator[];
}
