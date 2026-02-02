/**
 * Copilot Service
 * Handles communication with VS Code Language Model API (Copilot)
 */

import * as vscode from 'vscode';
import { AIResult } from '../models/task';
import { createErrorInfo, ErrorInfo } from '../models/result';
import { EventBus } from './eventBus';
import { ConfigService } from './configService';
import { getLogger } from '../utils/logging';

/**
 * Request parameters for the Copilot service
 */
export interface CopilotRequest {
  taskId: string;
  prompt: string;
  context: {
    selectedText: string;
    languageId: string;
    relativePath: string;
    fullDocumentText?: string;
  };
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Result of Copilot access check
 */
export interface CopilotAccessResult {
  available: boolean;
  reason?: 'not_installed' | 'no_models' | 'consent_required' | 'error';
  message?: string;
}

/**
 * Copilot Service for AI model interaction
 */
export class CopilotService implements vscode.Disposable {
  private model: vscode.LanguageModelChat | null = null;
  private disposables: vscode.Disposable[] = [];
  private modelSelectionPromise: Promise<void> | null = null;

  constructor(
    private eventBus: EventBus,
    private configService: ConfigService
  ) {}

  /**
   * Check if Copilot is available and accessible
   */
  async checkCopilotAccess(): Promise<CopilotAccessResult> {
    const logger = getLogger();

    try {
      // Try to select chat models
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o',
      });

      if (models.length === 0) {
        // Try broader selection
        const allModels = await vscode.lm.selectChatModels({
          vendor: 'copilot',
        });

        if (allModels.length === 0) {
          logger.warn('No Copilot models available');
          return {
            available: false,
            reason: 'no_models',
            message: 'No Copilot models are available. Please ensure GitHub Copilot is installed and you are signed in.',
          };
        }

        this.model = allModels[0];
      } else {
        this.model = models[0];
      }

      logger.info(`Selected Copilot model: ${this.model.id}`);
      return { available: true };
    } catch (error) {
      logger.error('Error checking Copilot access', error);

      if (error instanceof vscode.LanguageModelError) {
        if (error.code === 'NoPermissions' || error.message.includes('consent')) {
          return {
            available: false,
            reason: 'consent_required',
            message: 'Copilot access requires consent. Please accept the permission request.',
          };
        }
      }

      return {
        available: false,
        reason: 'error',
        message: error instanceof Error ? error.message : 'Unknown error checking Copilot access',
      };
    }
  }

  /**
   * Ensure a model is selected
   */
  async ensureModel(): Promise<vscode.LanguageModelChat | null> {
    if (this.model) {
      return this.model;
    }

    // Prevent multiple concurrent model selections
    if (this.modelSelectionPromise) {
      await this.modelSelectionPromise;
      return this.model;
    }

    this.modelSelectionPromise = (async () => {
      const result = await this.checkCopilotAccess();
      if (!result.available) {
        await this.showCopilotUnavailableMessage(result);
      }
    })();

    await this.modelSelectionPromise;
    this.modelSelectionPromise = null;

    return this.model;
  }

  /**
   * Send a request to the Copilot model
   */
  async sendRequest(request: CopilotRequest): Promise<AIResult | ErrorInfo> {
    const logger = getLogger();
    const settings = this.configService.getSettings();
    const startTime = Date.now();

    const model = await this.ensureModel();
    if (!model) {
      return createErrorInfo(new Error('No Copilot model available'));
    }

    try {
      // Build the messages for the chat
      const messages = this.buildMessages(request);

      // Log the full prompt if enabled
      if (settings.logPrompts) {
        logger.info(`=== PROMPT FOR TASK ${request.taskId} ===`);
        for (const msg of messages) {
          // Access the text content from the message
          const content = (msg as any).content || msg.toString();
          logger.info(`[${msg.role}]:\n${typeof content === 'string' ? content : JSON.stringify(content)}`);
        }
        logger.info('=== END PROMPT ===');
      }

      logger.debug(`Sending request for task ${request.taskId}`, {
        model: model.id,
        messageCount: messages.length,
      });

      // Send the request with streaming
      const response = await model.sendRequest(
        messages,
        {},
        request.cancellationToken
      );

      // Collect the streamed response
      let generatedCode = '';
      let tokensSoFar = 0;

      for await (const chunk of response.text) {
        generatedCode += chunk;
        tokensSoFar++;

        // Emit progress event
        this.eventBus.emit('stream:progress', {
          taskId: request.taskId,
          partialContent: generatedCode,
          tokensSoFar,
        });
      }

      const duration = Date.now() - startTime;
      
      // Log performance metrics if enabled
      if (settings.logPerformanceMetrics) {
        logger.info(`Performance for task ${request.taskId}:`, {
          duration: `${duration}ms`,
          responseLength: generatedCode.length,
          tokensPerSecond: Math.round((tokensSoFar / duration) * 1000),
        });
      }

      // Log token usage if enabled
      if (settings.logTokenUsage) {
        logger.info(`Token usage for task ${request.taskId}:`, {
          completionTokens: tokensSoFar,
          model: model.id,
        });
      }

      // Log the full response if enabled
      if (settings.logResponses) {
        logger.info(`=== RESPONSE FOR TASK ${request.taskId} ===`);
        logger.info(generatedCode);
        logger.info('=== END RESPONSE ===');
      }

      logger.info(`Request completed for task ${request.taskId}`, {
        duration,
        responseLength: generatedCode.length,
      });

      // Parse the response to extract code and explanation
      const parsed = this.parseResponse(generatedCode);

      const result: AIResult = {
        generatedCode: parsed.code,
        explanation: parsed.explanation,
        confidence: undefined,
        tokenCount: {
          promptTokens: 0, // Not available from API
          completionTokens: tokensSoFar,
          totalTokens: tokensSoFar,
        },
        modelId: model.id,
        streamedAt: new Date(),
      };

      return result;
    } catch (error) {
      logger.error(`Request failed for task ${request.taskId}`, error);
      return this.handleRequestError(error);
    }
  }

  /**
   * Display a user-friendly message when Copilot is unavailable
   */
  async showCopilotUnavailableMessage(result: CopilotAccessResult): Promise<void> {
    const logger = getLogger();

    let message: string;
    let actions: string[] = [];

    switch (result.reason) {
      case 'not_installed':
        message = 'GitHub Copilot extension is not installed.';
        actions = ['Install Copilot'];
        break;
      case 'no_models':
        message = 'No Copilot models available. Please sign in to GitHub Copilot.';
        actions = ['Open Settings'];
        break;
      case 'consent_required':
        message = 'Background AI Tasks needs permission to use GitHub Copilot.';
        actions = ['Grant Permission'];
        break;
      default:
        message = result.message || 'Unable to access GitHub Copilot.';
        actions = ['Open Settings'];
    }

    const action = await vscode.window.showErrorMessage(message, ...actions);

    if (action === 'Install Copilot') {
      vscode.commands.executeCommand(
        'workbench.extensions.installExtension',
        'GitHub.copilot'
      );
    } else if (action === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'copilot');
    } else if (action === 'Grant Permission') {
      // Retry access check to trigger consent dialog
      await this.checkCopilotAccess();
    }

    logger.warn('Copilot unavailable', { reason: result.reason });
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.model = null;
  }

  /**
   * Build chat messages from the request
   */
  private buildMessages(request: CopilotRequest): vscode.LanguageModelChatMessage[] {
    const systemPrompt = this.buildSystemPrompt(request.context.languageId);
    const userPrompt = this.buildUserPrompt(request);

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];
  }

  /**
   * Build the system prompt
   */
  private buildSystemPrompt(languageId: string): string {
    return `You are an expert ${languageId} developer assistant. Your task is to generate code based on the user's request.

Rules:
1. Generate clean, idiomatic, and well-documented code
2. Follow best practices for ${languageId}
3. Include brief comments explaining complex logic
4. If the task involves modifying existing code, preserve the original style
5. Return ONLY the code that should replace the selected text
6. Do not include markdown code fences unless specifically requested
7. If you need to explain something, put it in a comment at the top`;
  }

  /**
   * Build the user prompt from the request
   */
  private buildUserPrompt(request: CopilotRequest): string {
    let prompt = `File: ${request.context.relativePath}\n`;
    prompt += `Language: ${request.context.languageId}\n\n`;

    if (request.context.fullDocumentText) {
      prompt += `Here is the surrounding code for context:\n\`\`\`${request.context.languageId}\n${request.context.fullDocumentText}\n\`\`\`\n\n`;
    }

    prompt += `The following code is SELECTED and needs to be modified/replaced:\n\`\`\`${request.context.languageId}\n${request.context.selectedText}\n\`\`\`\n\n`;
    prompt += `Task: ${request.prompt}\n\n`;
    prompt += `IMPORTANT: Generate ONLY the code that should REPLACE the selected code above. Do not include any explanation, markdown formatting, or code fences - just the raw code.`;

    return prompt;
  }

  /**
   * Parse the response to extract code and explanation
   */
  private parseResponse(response: string): { code: string; explanation?: string } {
    // Remove markdown code fences if present
    let code = response.trim();

    // Check for code fences
    const fenceMatch = code.match(/^```[\w]*\n([\s\S]*?)\n```$/);
    if (fenceMatch) {
      code = fenceMatch[1];
    }

    // Extract leading comment as explanation
    let explanation: string | undefined;
    const commentMatch = code.match(/^(\/\*[\s\S]*?\*\/|\/\/.*\n)/);
    if (commentMatch) {
      explanation = commentMatch[1]
        .replace(/^\/\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .replace(/^\/\/\s*/, '')
        .trim();
    }

    return { code, explanation };
  }

  /**
   * Handle request errors and convert to ErrorInfo
   */
  private handleRequestError(error: unknown): ErrorInfo {
    if (error instanceof vscode.LanguageModelError) {
      const errorInfo = createErrorInfo(error);

      // Add specific handling for known error types
      if (error.code === 'NoPermissions') {
        return {
          ...errorInfo,
          code: 'consent_required',
          message: 'Copilot access requires your consent. Please accept the permission request.',
          isRetryable: true,
        };
      }

      if (error.code === 'NotFound') {
        return {
          ...errorInfo,
          code: 'model_unavailable',
          message: 'The requested Copilot model is not available.',
          isRetryable: true,
        };
      }

      return errorInfo;
    }

    return createErrorInfo(error);
  }
}
