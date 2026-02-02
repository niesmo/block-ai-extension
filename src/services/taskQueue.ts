/**
 * Task Queue Service
 * Manages the queue of AI tasks with concurrency control
 */

import * as vscode from 'vscode';
import {
  AITask,
  TaskStatus,
  CodeContext,
  createTask,
  TaskSummary,
} from '../models/task';
import { EventBus } from './eventBus';
import { ConfigService } from './configService';
import { getLogger } from '../utils/logging';
import { getFileName, createPromptPreview } from '../utils/context';

/**
 * Task Queue for managing background AI tasks
 */
export class TaskQueue implements vscode.Disposable {
  private tasks: Map<string, AITask> = new Map();
  private runningCount: number = 0;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private eventBus: EventBus,
    private configService: ConfigService
  ) {
    // Listen for configuration changes
    this.disposables.push(
      this.configService.onDidChange(() => {
        this.processQueue();
      })
    );
  }

  /**
   * Add a new task to the queue
   */
  addTask(prompt: string, context: CodeContext): AITask {
    const logger = getLogger();
    
    const task = createTask({ prompt, context });
    this.tasks.set(task.id, task);
    
    logger.info(`Task ${task.id} added to queue`, {
      file: getFileName(context),
      prompt: createPromptPreview(prompt),
    });
    
    // Emit event BEFORE processing queue
    logger.debug(`Emitting task:created event for ${task.id}, total tasks: ${this.tasks.size}`);
    this.eventBus.emit('task:created', { task });
    
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): AITask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): AITask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): AITask[] {
    return this.getAllTasks().filter((task) => task.status === status);
  }

  /**
   * Get task summaries for display
   */
  getTaskSummaries(): TaskSummary[] {
    return this.getAllTasks()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((task) => ({
        id: task.id,
        status: task.status,
        promptPreview: createPromptPreview(task.prompt),
        fileName: getFileName(task.context),
        languageId: task.context.languageId,
        createdAt: task.createdAt,
        duration: this.calculateDuration(task),
      }));
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TaskStatus): boolean {
    const logger = getLogger();
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.warn(`Task ${taskId} not found for status update`);
      return false;
    }
    
    const previousStatus = task.status;
    task.status = status;
    
    // Update timestamps
    if (status === 'running' && !task.startedAt) {
      task.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = new Date();
    }
    
    // Update running count
    if (previousStatus === 'running' && status !== 'running') {
      this.runningCount = Math.max(0, this.runningCount - 1);
    } else if (previousStatus !== 'running' && status === 'running') {
      this.runningCount++;
    }
    
    logger.debug(`Task ${taskId} status: ${previousStatus} -> ${status}`);
    
    this.eventBus.emit('task:statusChanged', {
      taskId,
      previousStatus,
      newStatus: status,
      timestamp: new Date(),
    });
    
    // Process queue if a slot opened up
    if (previousStatus === 'running' && status !== 'running') {
      this.processQueue();
    }
    
    return true;
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string, reason: 'user' | 'system' = 'user'): boolean {
    const logger = getLogger();
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.warn(`Task ${taskId} not found for cancellation`);
      return false;
    }
    
    if (task.status === 'completed' || task.status === 'cancelled') {
      logger.debug(`Task ${taskId} already in terminal state: ${task.status}`);
      return false;
    }
    
    this.updateTaskStatus(taskId, 'cancelled');
    
    this.eventBus.emit('task:cancelled', { taskId, reason });
    
    logger.info(`Task ${taskId} cancelled`, { reason });
    
    return true;
  }

  /**
   * Archive a task (remove from active list)
   */
  archiveTask(taskId: string): boolean {
    const logger = getLogger();
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.warn(`Task ${taskId} not found for archival`);
      return false;
    }
    
    if (task.status === 'running') {
      logger.warn(`Cannot archive running task ${taskId}`);
      return false;
    }
    
    this.updateTaskStatus(taskId, 'archived');
    
    logger.debug(`Task ${taskId} archived`);
    
    return true;
  }

  /**
   * Remove all archived tasks
   */
  clearArchived(): number {
    const archivedIds = this.getTasksByStatus('archived').map((t) => t.id);
    
    for (const id of archivedIds) {
      this.tasks.delete(id);
    }
    
    const logger = getLogger();
    logger.info(`Cleared ${archivedIds.length} archived tasks`);
    
    return archivedIds.length;
  }

  /**
   * Get the next task to process
   */
  getNextPendingTask(): AITask | undefined {
    return this.getAllTasks()
      .filter((task) => task.status === 'queued')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  }

  /**
   * Check if we can start more tasks
   */
  canStartTask(): boolean {
    const settings = this.configService.getSettings();
    return this.runningCount < settings.maxConcurrentTasks;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  } {
    const tasks = this.getAllTasks();
    return {
      queued: tasks.filter((t) => t.status === 'queued').length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      total: tasks.length,
    };
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.tasks.clear();
  }

  /**
   * Process the queue - called when tasks are added or slots open up
   * Returns the next task to process if available
   */
  private processQueue(): AITask | undefined {
    if (!this.canStartTask()) {
      return undefined;
    }
    
    return this.getNextPendingTask();
  }

  private calculateDuration(task: AITask): number | undefined {
    if (!task.startedAt) {
      return undefined;
    }
    
    const endTime = task.completedAt || new Date();
    return endTime.getTime() - task.startedAt.getTime();
  }
}
