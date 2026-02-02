/**
 * Event types for inter-component communication
 * 
 * @module contracts/events
 */

import type { AITask, TaskStatus, AIResult, ErrorInfo } from './types';

/**
 * Event emitted when a task is created
 */
export interface TaskCreatedEvent {
  type: 'task-created';
  task: AITask;
  timestamp: Date;
}

/**
 * Event emitted when a task's status changes
 */
export interface TaskStatusChangedEvent {
  type: 'task-status-changed';
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: Date;
}

/**
 * Event emitted when a task starts processing
 */
export interface TaskStartedEvent {
  type: 'task-started';
  taskId: string;
  timestamp: Date;
}

/**
 * Event emitted during streaming (for progress updates)
 */
export interface TaskProgressEvent {
  type: 'task-progress';
  taskId: string;
  /** Partial result text received so far */
  partialText: string;
  /** Estimated completion percentage (0-100) */
  progress?: number;
  timestamp: Date;
}

/**
 * Event emitted when a task completes successfully
 */
export interface TaskCompletedEvent {
  type: 'task-completed';
  taskId: string;
  result: AIResult;
  timestamp: Date;
}

/**
 * Event emitted when a task fails
 */
export interface TaskFailedEvent {
  type: 'task-failed';
  taskId: string;
  error: ErrorInfo;
  timestamp: Date;
}

/**
 * Event emitted when a task is cancelled
 */
export interface TaskCancelledEvent {
  type: 'task-cancelled';
  taskId: string;
  /** Who initiated the cancellation */
  initiator: 'user' | 'system';
  timestamp: Date;
}

/**
 * Event emitted when a result is applied to a document
 */
export interface ResultAppliedEvent {
  type: 'result-applied';
  taskId: string;
  documentUri: string;
  timestamp: Date;
}

/**
 * Event emitted when a result is dismissed
 */
export interface ResultDismissedEvent {
  type: 'result-dismissed';
  taskId: string;
  timestamp: Date;
}

/**
 * Event emitted when the queue changes
 */
export interface QueueChangedEvent {
  type: 'queue-changed';
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  timestamp: Date;
}

/**
 * Event emitted when Copilot access status changes
 */
export interface CopilotAccessChangedEvent {
  type: 'copilot-access-changed';
  isAvailable: boolean;
  reason?: string;
  timestamp: Date;
}

/**
 * Union of all task-related events
 */
export type TaskEvent =
  | TaskCreatedEvent
  | TaskStatusChangedEvent
  | TaskStartedEvent
  | TaskProgressEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | TaskCancelledEvent
  | ResultAppliedEvent
  | ResultDismissedEvent;

/**
 * Union of all events
 */
export type ExtensionEvent =
  | TaskEvent
  | QueueChangedEvent
  | CopilotAccessChangedEvent;

/**
 * Event handler signature
 */
export type EventHandler<T extends ExtensionEvent> = (event: T) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter<T extends ExtensionEvent = ExtensionEvent> {
  /**
   * Subscribe to events
   */
  on<E extends T>(
    eventType: E['type'],
    handler: EventHandler<E>
  ): void;

  /**
   * Unsubscribe from events
   */
  off<E extends T>(
    eventType: E['type'],
    handler: EventHandler<E>
  ): void;

  /**
   * Emit an event
   */
  emit<E extends T>(event: E): void;
}

/**
 * Disposable subscription
 */
export interface Subscription {
  dispose(): void;
}
