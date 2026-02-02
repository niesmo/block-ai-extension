/**
 * Result and error types for Background AI Task Runner
 * Based on contracts/types.ts specification
 */

export { AIResult, TokenUsage, ErrorInfo, ErrorCode } from './task';

/**
 * Map LanguageModelError codes to our ErrorCode
 */
export function mapErrorCode(errorMessage: string, errorCode?: string): import('./task').ErrorCode {
  const message = errorMessage.toLowerCase();
  
  if (errorCode === 'NoPermissions' || message.includes('consent')) {
    return 'consent_required';
  }
  if (errorCode === 'NotFound' || message.includes('not found') || message.includes('unavailable')) {
    return 'model_unavailable';
  }
  if (message.includes('quota') || message.includes('rate limit') || message.includes('too many')) {
    return 'quota_exceeded';
  }
  if (message.includes('too large') || message.includes('token') || message.includes('context')) {
    return 'context_too_large';
  }
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return 'network_error';
  }
  if (message.includes('cancel')) {
    return 'cancelled';
  }
  
  return 'unknown';
}

/**
 * Create an ErrorInfo from an error
 */
export function createErrorInfo(error: unknown): import('./task').ErrorInfo {
  if (error instanceof Error) {
    const code = mapErrorCode(error.message, (error as any).code);
    return {
      code,
      message: error.message,
      isRetryable: isRetryableError(code),
      details: {
        name: error.name,
        stack: error.stack,
      },
    };
  }
  
  return {
    code: 'unknown',
    message: String(error),
    isRetryable: false,
  };
}

/**
 * Check if an error code represents a retryable error
 */
export function isRetryableError(code: import('./task').ErrorCode): boolean {
  return ['model_unavailable', 'quota_exceeded', 'network_error', 'generation_failed'].includes(code);
}
