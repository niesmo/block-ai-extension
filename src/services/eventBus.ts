/**
 * Typed Event Bus for inter-component communication
 * Based on contracts/events.ts specification
 */

import * as vscode from 'vscode';
import { AITask, TaskStatus } from '../models/task';
import { AIResult, ErrorInfo } from '../models/result';

/**
 * Event payload types
 */
export interface TaskCreatedEvent {
  task: AITask;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: Date;
}

export interface TaskCompletedEvent {
  taskId: string;
  result: AIResult;
  duration: number;
}

export interface TaskFailedEvent {
  taskId: string;
  error: ErrorInfo;
  duration: number;
}

export interface TaskCancelledEvent {
  taskId: string;
  reason: 'user' | 'system';
}

export interface ResultAppliedEvent {
  taskId: string;
  documentUri: string;
  success: boolean;
}

export interface StreamProgressEvent {
  taskId: string;
  partialContent: string;
  tokensSoFar: number;
}

/**
 * Event map for type-safe event handling
 */
export interface EventMap {
  'task:created': TaskCreatedEvent;
  'task:statusChanged': TaskStatusChangedEvent;
  'task:completed': TaskCompletedEvent;
  'task:failed': TaskFailedEvent;
  'task:cancelled': TaskCancelledEvent;
  'result:applied': ResultAppliedEvent;
  'stream:progress': StreamProgressEvent;
}

export type EventName = keyof EventMap;

/**
 * Typed Event Bus for the extension
 */
export class EventBus implements vscode.Disposable {
  private emitters: Map<string, vscode.EventEmitter<any>> = new Map();
  private disposables: vscode.Disposable[] = [];

  /**
   * Subscribe to an event
   */
  on<K extends EventName>(
    event: K,
    listener: (e: EventMap[K]) => void
  ): vscode.Disposable {
    let emitter = this.emitters.get(event);
    if (!emitter) {
      emitter = new vscode.EventEmitter<EventMap[K]>();
      this.emitters.set(event, emitter);
      this.disposables.push(emitter);
    }
    return emitter.event(listener);
  }

  /**
   * Subscribe to an event once
   */
  once<K extends EventName>(
    event: K,
    listener: (e: EventMap[K]) => void
  ): vscode.Disposable {
    const disposable = this.on(event, (e) => {
      disposable.dispose();
      listener(e);
    });
    return disposable;
  }

  /**
   * Emit an event
   */
  emit<K extends EventName>(event: K, data: EventMap[K]): void {
    const emitter = this.emitters.get(event);
    if (emitter) {
      emitter.fire(data);
    }
  }

  /**
   * Dispose all event emitters
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.emitters.clear();
  }
}
