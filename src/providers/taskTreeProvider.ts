/**
 * Task Tree Provider
 * Provides tree data for the Background AI Tasks panel
 */

import * as vscode from 'vscode';
import { TaskQueue } from '../services/taskQueue';
import { EventBus } from '../services/eventBus';
import { AITask, TaskStatus } from '../models/task';
import { createPromptPreview, getFileName } from '../utils/context';

/**
 * Tree item representing a task
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: AITask,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(createPromptPreview(task.prompt, 40), collapsibleState);

    this.id = task.id;
    this.tooltip = this.createTooltip();
    this.description = this.createDescription();
    this.iconPath = this.getStatusIcon();
    this.contextValue = this.getContextValue();

    // Make completed/failed tasks clickable to view results
    if (task.status === 'completed' && task.result) {
      this.command = {
        command: 'backgroundAI.viewResult',
        title: 'View Result',
        arguments: [task.id],
      };
    }
  }

  private createTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Task:** ${this.task.prompt}\n\n`);
    md.appendMarkdown(`**File:** ${this.task.context.relativePath}\n\n`);
    md.appendMarkdown(`**Status:** ${this.task.status}\n\n`);
    md.appendMarkdown(`**Created:** ${this.task.createdAt.toLocaleString()}\n\n`);
    
    if (this.task.error) {
      md.appendMarkdown(`**Error:** ${this.task.error.message}\n\n`);
    }

    return md;
  }

  private createDescription(): string {
    const parts: string[] = [];
    
    parts.push(getFileName(this.task.context));
    
    if (this.task.status === 'running' && this.task.startedAt) {
      const elapsed = Math.round((Date.now() - this.task.startedAt.getTime()) / 1000);
      parts.push(`${elapsed}s`);
    } else if (this.task.completedAt && this.task.startedAt) {
      const duration = Math.round(
        (this.task.completedAt.getTime() - this.task.startedAt.getTime()) / 1000
      );
      parts.push(`${duration}s`);
    }

    return parts.join(' • ');
  }

  private getStatusIcon(): vscode.ThemeIcon {
    switch (this.task.status) {
      case 'queued':
        return new vscode.ThemeIcon('clock');
      case 'running':
        return new vscode.ThemeIcon('sync~spin');
      case 'completed':
        return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      case 'failed':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
      case 'cancelled':
        return new vscode.ThemeIcon('circle-slash');
      case 'archived':
        return new vscode.ThemeIcon('archive');
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }

  private getContextValue(): string {
    // Context value for "when" clauses in package.json menus
    switch (this.task.status) {
      case 'queued':
        return 'queuedTask';
      case 'running':
        return 'runningTask';
      case 'completed':
        return 'completedTask';
      case 'failed':
        return 'failedTask';
      case 'cancelled':
        return 'cancelledTask';
      default:
        return 'task';
    }
  }
}

/**
 * Group header for organizing tasks by status
 */
export class TaskGroupItem extends vscode.TreeItem {
  constructor(
    public readonly status: TaskStatus | 'all',
    public readonly count: number
  ) {
    super(TaskGroupItem.getLabel(status, count), vscode.TreeItemCollapsibleState.Expanded);
    
    this.iconPath = TaskGroupItem.getIcon(status);
    this.contextValue = `group-${status}`;
  }

  private static getLabel(status: TaskStatus | 'all', count: number): string {
    const labels: Record<TaskStatus | 'all', string> = {
      all: 'All Tasks',
      queued: 'Queued',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      archived: 'Archived',
    };
    return `${labels[status]} (${count})`;
  }

  private static getIcon(status: TaskStatus | 'all'): vscode.ThemeIcon {
    switch (status) {
      case 'queued':
        return new vscode.ThemeIcon('clock');
      case 'running':
        return new vscode.ThemeIcon('sync~spin');
      case 'completed':
        return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
      case 'failed':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
      case 'cancelled':
        return new vscode.ThemeIcon('circle-slash');
      case 'archived':
        return new vscode.ThemeIcon('archive');
      default:
        return new vscode.ThemeIcon('list-tree');
    }
  }
}

/**
 * Task Tree Data Provider
 */
export class TaskTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];
  private groupByStatus: boolean = true;

  constructor(
    private taskQueue: TaskQueue,
    private eventBus: EventBus
  ) {
    const { getLogger } = require('../utils/logging');
    const logger = getLogger();
    logger.debug('TaskTreeProvider initialized');
    
    // Subscribe to task events for auto-refresh
    this.disposables.push(
      this.eventBus.on('task:created', (e) => {
        logger.debug('TaskTreeProvider received task:created', e.task.id);
        this.refresh();
      }),
      this.eventBus.on('task:statusChanged', () => {
        logger.debug('TaskTreeProvider received task:statusChanged');
        this.refresh();
      }),
      this.eventBus.on('task:completed', () => this.refresh()),
      this.eventBus.on('task:failed', () => this.refresh()),
      this.eventBus.on('task:cancelled', () => this.refresh())
    );
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for an element
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for an element
   */
  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      // Root level - show groups or all tasks
      return this.getRootItems();
    }

    if (element instanceof TaskGroupItem) {
      // Show tasks in this group
      return this.getTasksForStatus(element.status);
    }

    // No children for task items
    return [];
  }

  /**
   * Get parent of an element
   */
  getParent(element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
    if (element instanceof TaskTreeItem && this.groupByStatus) {
      const status = element.task.status;
      const count = this.taskQueue.getTasksByStatus(status).length;
      return new TaskGroupItem(status, count);
    }
    return null;
  }

  /**
   * Toggle grouping by status
   */
  toggleGrouping(): void {
    this.groupByStatus = !this.groupByStatus;
    this.refresh();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this._onDidChangeTreeData.dispose();
  }

  private getRootItems(): vscode.TreeItem[] {
    const tasks = this.taskQueue.getAllTasks();

    if (tasks.length === 0) {
      // Show welcome message
      const item = new vscode.TreeItem('No tasks yet');
      item.description = 'Select code and press Ctrl+Shift+A';
      item.iconPath = new vscode.ThemeIcon('lightbulb');
      return [item];
    }

    if (this.groupByStatus) {
      return this.getGroupItems();
    }

    // Flat list of all tasks
    return tasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((task) => new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None));
  }

  private getGroupItems(): vscode.TreeItem[] {
    const groups: vscode.TreeItem[] = [];
    const statusOrder: TaskStatus[] = ['running', 'queued', 'completed', 'failed', 'cancelled'];

    for (const status of statusOrder) {
      const tasks = this.taskQueue.getTasksByStatus(status);
      if (tasks.length > 0) {
        groups.push(new TaskGroupItem(status, tasks.length));
      }
    }

    return groups;
  }

  private getTasksForStatus(status: TaskStatus | 'all'): vscode.TreeItem[] {
    let tasks: AITask[];

    if (status === 'all') {
      tasks = this.taskQueue.getAllTasks();
    } else {
      tasks = this.taskQueue.getTasksByStatus(status);
    }

    return tasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((task) => new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None));
  }
}
