import { z } from 'zod';
import { Pipeline, LLM, LLMConfig } from '../types/ai.types';
import { handleAsyncTask, createPipelineLogger, handlePipelineError } from '../utils/pipeline.utils';

// Tasks
import { extractUserInfoTask } from '../tasks/extract-user-info.task';
import { createWelcomeEmailTask } from '../tasks/example.task';

/**
 * Input schema for the user onboarding pipeline
 */
export const UserOnboardingInputSchema = z.object({
  userText: z.string().min(10, 'User text must be at least 10 characters'),
  customWelcomeMessage: z.string().optional(),
  companyName: z.string().default('Our Company'),
});

export type UserOnboardingInput = z.infer<typeof UserOnboardingInputSchema>;

/**
 * Output schema for the user onboarding pipeline
 */
export const UserOnboardingOutputSchema = z.object({
  extractedInfo: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    company: z.string().nullable(),
    title: z.string().nullable(),
    interests: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
  welcomeEmail: z.object({
    subject: z.string(),
    greeting: z.string(),
    content: z.string(),
    callToAction: z.string(),
    signature: z.string(),
  }),
  summary: z.object({
    processingTimeMs: z.number(),
    extractionConfidence: z.number(),
    userName: z.string(),
    hasValidEmail: z.boolean(),
  }),
});

export type UserOnboardingOutput = z.infer<typeof UserOnboardingOutputSchema>;

/**
 * User onboarding pipeline that extracts user information and creates a personalized welcome email
 * 
 * This pipeline demonstrates:
 * - Sequential task execution with data flow between steps
 * - Input validation and output validation
 * - Comprehensive error handling with reusable utilities
 * - Structured logging throughout the process
 * - Data transformation between task outputs
 * - Performance tracking and metrics
 * 
 * @param input - Contains user text to analyze and welcome message preferences
 * @param llm - The LLM provider to use for both tasks
 * @param config - LLM configuration (shared across tasks)
 * @returns Complete user onboarding result with extracted info and welcome email
 */
export const userOnboardingPipeline = (
  llm: LLM<any>,
  config: LLMConfig<any>
): Pipeline<UserOnboardingInput, UserOnboardingOutput> => async (input) => {
  const startTime = Date.now();
  const pipelineLogger = createPipelineLogger('user-onboarding');
  
  pipelineLogger.info('Starting user onboarding pipeline', { 
    textLength: input.userText.length,
    hasCustomMessage: !!input.customWelcomeMessage 
  });

  try {
    // Validate input
    const validatedInput = UserOnboardingInputSchema.parse(input);
    pipelineLogger.debug('Input validation successful');

    // Step 1: Extract user information from text
    pipelineLogger.info('Starting user information extraction');
    
    const extractionResult = await handleAsyncTask(
      () => extractUserInfoTask(
        { text: validatedInput.userText },
        llm,
        config
      ),
      'extract-user-info',
      { textLength: validatedInput.userText.length }
    );
    
    pipelineLogger.info('User info extraction completed', { 
      fieldsExtracted: Object.values(extractionResult).filter(v => 
        v !== null && (Array.isArray(v) ? v.length > 0 : true)
      ).length,
      confidence: extractionResult.confidence 
    });

    // Step 2: Create personalized welcome email
    pipelineLogger.info('Starting welcome email generation');
    
    // Determine the user's name for personalization
    const userName = extractionResult.firstName || 'Valued User';
    
    const welcomeEmailResult = await handleAsyncTask(
      () => createWelcomeEmailTask(
        { 
          name: userName,
          customMessage: validatedInput.customWelcomeMessage 
            ? `${validatedInput.customWelcomeMessage} Welcome to ${validatedInput.companyName}!`
            : `Welcome to ${validatedInput.companyName}!`
        },
        llm,
        config
      ),
      'create-welcome-email',
      { userName, companyName: validatedInput.companyName }
    );
    
    pipelineLogger.info('Welcome email generation completed', { 
      subjectLength: welcomeEmailResult.subject.length,
      userName 
    });

    // Step 3: Compile final results with summary
    const processingTime = Date.now() - startTime;
    
    const pipelineOutput: UserOnboardingOutput = {
      extractedInfo: extractionResult,
      welcomeEmail: welcomeEmailResult,
      summary: {
        processingTimeMs: processingTime,
        extractionConfidence: extractionResult.confidence,
        userName,
        hasValidEmail: !!extractionResult.email,
      },
    };

    // Validate output
    const validatedOutput = UserOnboardingOutputSchema.parse(pipelineOutput);
    
    pipelineLogger.info('User onboarding pipeline completed successfully', {
      processingTimeMs: processingTime,
      extractionConfidence: extractionResult.confidence,
      userName,
      hasValidEmail: !!extractionResult.email,
    });

    return validatedOutput;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    handlePipelineError(error, 'user-onboarding', pipelineLogger, processingTime);
  }
};
