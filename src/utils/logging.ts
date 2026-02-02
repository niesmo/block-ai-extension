/**
 * Logging utility using VS Code OutputChannel
 */

import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class for the extension
 */
export class Logger implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private minLevel: LogLevel = 'info';

  constructor(channelName: string = 'Background AI Tasks') {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.log('error', `${message}: ${error.message}`, ...args);
      if (error.stack) {
        this.log('error', error.stack);
      }
    } else if (error !== undefined) {
      this.log('error', `${message}: ${String(error)}`, ...args);
    } else {
      this.log('error', message, ...args);
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    
    if (args.length > 0) {
      const argsStr = args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');
      formattedMessage += ` ${argsStr}`;
    }

    this.outputChannel.appendLine(formattedMessage);
  }
}

// Singleton logger instance
let loggerInstance: Logger | undefined;

/**
 * Get or create the singleton logger
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

/**
 * Dispose the singleton logger (call on extension deactivation)
 */
export function disposeLogger(): void {
  if (loggerInstance) {
    loggerInstance.dispose();
    loggerInstance = undefined;
  }
}
