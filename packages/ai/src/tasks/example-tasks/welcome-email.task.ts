import { z } from 'zod';
import { logger } from '@starter-kit/logger';
import { Task, Prompt, AIError, LLMGenerationError, TaskValidationError } from '../../types/ai.types';
import { welcomePrompt } from '../../prompts';
import { extractJson, safeJsonParse } from '../../utils/llm.utils';

/**
 * Input schema for the welcome email generation task
 */
export const WelcomeEmailInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  customMessage: z.string().optional(),
});

export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

/**
 * Output schema for the welcome email generation task
 */
export const WelcomeEmailOutputSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  content: z.string(),
  callToAction: z.string(),
  signature: z.string(),
});

export type WelcomeEmailOutput = z.infer<typeof WelcomeEmailOutputSchema>;

/**
 * Generates a structured welcome email using LLM
 * 
 * This task demonstrates best practices for AI task implementation:
 * - Input validation using Zod schemas
 * - Comprehensive error handling with specific error types
 * - Structured logging with context
 * - Type-safe outputs with validation
 * - Clean separation of concerns
 * 
 * @param input - Object containing user name and optional custom message
 * @param llm - The LLM provider to use for generation
 * @param config - LLM configuration (model, temperature, etc.)
 * @returns Structured welcome email components
 * @throws {TaskValidationError} If input validation fails
 * @throws {LLMGenerationError} If LLM generation fails
 * @throws {LLMParseError} If response parsing fails
 */
export const createWelcomeEmailTask: Task<WelcomeEmailInput, WelcomeEmailOutput> = async (
  input,
  llm,
  config
) => {
  const taskLogger = logger.child({ task: 'create-welcome-email' });
  taskLogger.info('Starting welcome email generation task', { name: input.name });

  try {
    // Validate input
    const validatedInput = WelcomeEmailInputSchema.parse(input);
    taskLogger.debug('Input validation successful');

    // Prepare the prompt with user data
    const filledPrompt: Prompt = {
      system: welcomePrompt.system,
      user: welcomePrompt.user.replace('{{name}}', validatedInput.name),
    };

    // Add custom message context if provided
    if (validatedInput.customMessage) {
      filledPrompt.user += `\n\nAdditional context: ${validatedInput.customMessage}`;
    }

    taskLogger.debug('Calling LLM to generate welcome email');
    
    // Generate response using LLM
    const response = await llm.generate(filledPrompt, config);
    
    if (!response.content) {
      taskLogger.error('LLM returned empty response');
      throw new LLMGenerationError('LLM returned empty response');
    }

    taskLogger.debug('LLM generation completed', { tokensUsed: response.tokensUsed });

    // Extract and parse JSON from response
    const jsonContent = extractJson(response.content);
    const parsedContent = safeJsonParse(jsonContent);

    // Validate output structure
    const validatedOutput = WelcomeEmailOutputSchema.parse(parsedContent);
    
    taskLogger.info(
      'Welcome email generated successfully',
      { 
        subjectLength: validatedOutput.subject.length,
        contentLength: validatedOutput.content.length,
        tokensUsed: response.tokensUsed 
      }
    );

    return validatedOutput;

  } catch (error) {
    taskLogger.error('Welcome email generation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      throw new TaskValidationError(`Input validation failed: ${error.issues.map(i => i.message).join(', ')}`, error);
    }
    
    // Re-throw our custom errors
    if (error instanceof AIError) {
      throw error;
    }
    
    // Wrap unknown errors
    const message = error instanceof Error ? error.message : 'Unknown error during welcome email generation';
    throw new AIError(message, error as Error);
  }
};

