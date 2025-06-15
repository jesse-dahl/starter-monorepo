import { z } from 'zod';
import { logger } from '@starter-kit/logger';
import { Task, LLM, LLMConfig, Prompt, AIError, LLMGenerationError, TaskValidationError } from '../../types/ai.types';
import { EXTRACT_USER_INFO_SYSTEM, EXTRACT_USER_INFO_USER } from '../../prompts';
import { extractJson, safeJsonParse } from '../../utils/llm.utils';

/**
 * Input schema for user information extraction task
 */
export const ExtractUserInfoInputSchema = z.object({
  text: z.string().min(1, 'Text content is required'),
  includeConfidenceScore: z.boolean().default(true).optional(),
});

export type ExtractUserInfoInput = z.infer<typeof ExtractUserInfoInputSchema>;

/**
 * Output schema for user information extraction
 */
export const ExtractUserInfoOutputSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  title: z.string().nullable(),
  interests: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type ExtractUserInfoOutput = z.infer<typeof ExtractUserInfoOutputSchema>;

/**
 * Extracts structured user information from unstructured text
 * 
 * This task demonstrates:
 * - Working with larger text inputs
 * - Extracting structured data from unstructured content
 * - Using confidence scores for quality assessment
 * - Nullable fields with proper validation
 * 
 * @param input - Object containing text to analyze
 * @param llm - The LLM provider to use
 * @param config - LLM configuration
 * @returns Extracted user information with confidence score
 */
export const extractUserInfoTask: Task<ExtractUserInfoInput, ExtractUserInfoOutput> = async (
  input,
  llm,
  config
) => {
  const taskLogger = logger.child({ task: 'extract-user-info' });
  taskLogger.info('Starting user info extraction task', { textLength: input.text.length });

  try {
    // Validate input
    const validatedInput = ExtractUserInfoInputSchema.parse(input);
    
    // Prepare prompt
    const filledPrompt: Prompt = {
      system: EXTRACT_USER_INFO_SYSTEM,
      user: EXTRACT_USER_INFO_USER(validatedInput.text),
    };

    taskLogger.debug('Calling LLM to extract user information');
    
    // Generate response
    const response = await llm.generate(filledPrompt, config);
    
    if (!response.content) {
      throw new LLMGenerationError('LLM returned empty response');
    }

    // Parse and validate response
    const jsonContent = extractJson(response.content);
    const parsedContent = safeJsonParse(jsonContent);
    const validatedOutput = ExtractUserInfoOutputSchema.parse(parsedContent);
    
    taskLogger.info(
      'User info extraction completed',
      { 
        fieldsExtracted: Object.values(validatedOutput).filter(v => v !== null && (Array.isArray(v) ? v.length > 0 : true)).length,
        confidence: validatedOutput.confidence,
        tokensUsed: response.tokensUsed 
      }
    );

    return validatedOutput;

  } catch (error) {
    taskLogger.error('User info extraction failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof z.ZodError) {
      throw new TaskValidationError(`Validation failed: ${error.issues.map(i => i.message).join(', ')}`, error);
    }
    
    if (error instanceof AIError) {
      throw error;
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error during user info extraction';
    throw new AIError(message, error as Error);
  }
}; 