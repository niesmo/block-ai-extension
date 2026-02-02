/**
 * Configuration Service
 * Manages extension settings with type safety
 */

import * as vscode from 'vscode';
import { getLogger } from '../utils/logging';

/**
 * Extension configuration schema
 */
export interface ExtensionSettings {
  maxConcurrentTasks: number;
  autoShowDiff: boolean;
  defaultModel: string;
  includeFullContext: boolean;
  maxContextLines: number;
  showStatusBarProgress: boolean;
  autoArchiveAfterApply: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  // Logging settings for transparency
  logPrompts: boolean;
  logResponses: boolean;
  logTokenUsage: boolean;
  logPerformanceMetrics: boolean;
}

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: ExtensionSettings = {
  maxConcurrentTasks: 3,
  autoShowDiff: true,
  defaultModel: 'copilot',
  includeFullContext: false,
  maxContextLines: 50,
  showStatusBarProgress: true,
  autoArchiveAfterApply: true,
  logLevel: 'info',
  // Logging defaults - off for privacy
  logPrompts: false,
  logResponses: false,
  logTokenUsage: true,
  logPerformanceMetrics: true,
};

const CONFIG_SECTION = 'backgroundAI';

/**
 * Configuration service for type-safe settings access
 */
export class ConfigService implements vscode.Disposable {
  private config: vscode.WorkspaceConfiguration;
  private cachedSettings: ExtensionSettings | null = null;
  private disposable: vscode.Disposable;
  private changeEmitter = new vscode.EventEmitter<ExtensionSettings>();

  /**
   * Event fired when configuration changes
   */
  readonly onDidChange = this.changeEmitter.event;

  constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) {
        this.handleConfigChange();
      }
    });
  }

  /**
   * Get all settings
   */
  getSettings(): ExtensionSettings {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    this.cachedSettings = {
      maxConcurrentTasks: this.get('maxConcurrentTasks', DEFAULT_SETTINGS.maxConcurrentTasks),
      autoShowDiff: this.get('autoShowDiff', DEFAULT_SETTINGS.autoShowDiff),
      defaultModel: this.get('defaultModel', DEFAULT_SETTINGS.defaultModel),
      includeFullContext: this.get('includeFullContext', DEFAULT_SETTINGS.includeFullContext),
      maxContextLines: this.get('maxContextLines', DEFAULT_SETTINGS.maxContextLines),
      showStatusBarProgress: this.get('showStatusBarProgress', DEFAULT_SETTINGS.showStatusBarProgress),
      autoArchiveAfterApply: this.get('autoArchiveAfterApply', DEFAULT_SETTINGS.autoArchiveAfterApply),
      logLevel: this.get('logLevel', DEFAULT_SETTINGS.logLevel),
      logPrompts: this.get('logPrompts', DEFAULT_SETTINGS.logPrompts),
      logResponses: this.get('logResponses', DEFAULT_SETTINGS.logResponses),
      logTokenUsage: this.get('logTokenUsage', DEFAULT_SETTINGS.logTokenUsage),
      logPerformanceMetrics: this.get('logPerformanceMetrics', DEFAULT_SETTINGS.logPerformanceMetrics),
    };

    return this.cachedSettings;
  }

  /**
   * Get a specific setting
   */
  get<K extends keyof ExtensionSettings>(
    key: K,
    defaultValue: ExtensionSettings[K]
  ): ExtensionSettings[K] {
    return this.config.get<ExtensionSettings[K]>(key, defaultValue);
  }

  /**
   * Update a setting
   */
  async update<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    const logger = getLogger();
    
    try {
      await this.config.update(key, value, target);
      logger.debug(`Updated setting ${key}`, { value });
    } catch (error) {
      logger.error(`Failed to update setting ${key}`, error);
      throw error;
    }
  }

  /**
   * Reset a setting to default
   */
  async reset<K extends keyof ExtensionSettings>(key: K): Promise<void> {
    await this.config.update(key, undefined, vscode.ConfigurationTarget.Global);
  }

  /**
   * Reset all settings to defaults
   */
  async resetAll(): Promise<void> {
    const keys = Object.keys(DEFAULT_SETTINGS) as (keyof ExtensionSettings)[];
    for (const key of keys) {
      await this.reset(key);
    }
  }

  dispose(): void {
    this.disposable.dispose();
    this.changeEmitter.dispose();
  }

  private handleConfigChange(): void {
    const logger = getLogger();
    
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    this.cachedSettings = null;
    
    const newSettings = this.getSettings();
    logger.debug('Configuration changed', newSettings);
    
    // Update log level
    logger.setLevel(newSettings.logLevel);
    
    this.changeEmitter.fire(newSettings);
  }
}
