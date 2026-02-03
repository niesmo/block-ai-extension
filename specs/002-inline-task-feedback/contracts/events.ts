/**
 * Event definitions for Inline Task Feedback
 * 
 * These events integrate with the existing EventBus from feature 001.
 * 
 * @module contracts/events
 * @feature 002-inline-task-feedback
 */

import { InlineIndicator, CodeSuggestion, IndicatorState, Range } from './types';

/**
 * Fired when a new inline indicator is created
 */
export interface IndicatorCreatedEvent {
  /** The created indicator */
  indicator: InlineIndicator;
  /** Timestamp of creation */
  timestamp: Date;
}

/**
 * Fired when an indicator's state changes
 */
export interface IndicatorStateChangedEvent {
  /** Indicator ID */
  indicatorId: string;
  /** Previous state */
  previousState: IndicatorState;
  /** New state */
  newState: IndicatorState;
  /** Timestamp of change */
  timestamp: Date;
}

/**
 * Fired when an indicator is removed/dismissed
 */
export interface IndicatorRemovedEvent {
  /** Indicator ID */
  indicatorId: string;
  /** Associated task ID */
  taskId: string;
  /** Reason for removal */
  reason: 'accepted' | 'rejected' | 'cancelled' | 'error' | 'manual';
  /** Timestamp of removal */
  timestamp: Date;
}

/**
 * Fired when a code suggestion is displayed in the editor
 */
export interface SuggestionDisplayedEvent {
  /** The displayed suggestion */
  suggestion: CodeSuggestion;
  /** Associated indicator ID */
  indicatorId: string;
  /** Document where suggestion is shown */
  documentUri: string;
  /** Range where suggestion is displayed */
  displayRange: Range;
  /** Timestamp of display */
  timestamp: Date;
}

/**
 * Fired when user accepts a suggestion
 */
export interface SuggestionAcceptedEvent {
  /** Suggestion ID */
  suggestionId: string;
  /** Associated indicator ID */
  indicatorId: string;
  /** Associated task ID */
  taskId: string;
  /** Document URI */
  documentUri: string;
  /** The accepted code */
  acceptedCode: string;
  /** Final range where code was inserted */
  finalRange: Range;
  /** Timestamp of acceptance */
  timestamp: Date;
}

/**
 * Fired when user rejects a suggestion
 */
export interface SuggestionRejectedEvent {
  /** Suggestion ID */
  suggestionId: string;
  /** Associated indicator ID */
  indicatorId: string;
  /** Associated task ID */
  taskId: string;
  /** Document URI */
  documentUri: string;
  /** Timestamp of rejection */
  timestamp: Date;
}

/**
 * Fired when indicator location becomes invalid due to document changes
 */
export interface IndicatorLocationInvalidatedEvent {
  /** Indicator ID */
  indicatorId: string;
  /** Document URI */
  documentUri: string;
  /** Reason for invalidation */
  reason: 'deleted' | 'modified' | 'file_closed';
  /** Timestamp */
  timestamp: Date;
}

/**
 * Extended EventMap for inline feedback events
 * 
 * Merge this with the existing EventMap in eventBus.ts
 */
export interface InlineFeedbackEventMap {
  'indicator:created': IndicatorCreatedEvent;
  'indicator:stateChanged': IndicatorStateChangedEvent;
  'indicator:removed': IndicatorRemovedEvent;
  'indicator:locationInvalidated': IndicatorLocationInvalidatedEvent;
  'suggestion:displayed': SuggestionDisplayedEvent;
  'suggestion:accepted': SuggestionAcceptedEvent;
  'suggestion:rejected': SuggestionRejectedEvent;
}

/**
 * All event names for inline feedback
 */
export type InlineFeedbackEventName = keyof InlineFeedbackEventMap;
