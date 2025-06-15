import { logger } from '@starter-kit/logger';
import { PipelineError, AIError } from '../types/ai.types';
import { z } from 'zod';

/**
 * Handles async task execution with standardized error handling and logging
 * @param taskFn - The async task function to execute
 * @param taskName - Name of the task for logging and error reporting
 * @param context - Additional context for logging
 * @returns Promise resolving to task result
 * @throws {PipelineError} If task execution fails
 */
export async function handleAsyncTask<T>(
  taskFn: () => Promise<T>,
  taskName: string,
  context?: Record<string, unknown>
): Promise<T> {
  const taskLogger = logger.child({ 
    pipelineStep: taskName,
    ...context 
  });

  try {
    taskLogger.debug('Starting pipeline step execution');
    const startTime = Date.now();
    
    const result = await taskFn();
    
    const duration = Date.now() - startTime;
    taskLogger.info('Pipeline step completed successfully', { 
      duration: `${duration}ms` 
    });
    
    return result;
    
  } catch (error) {
    taskLogger.error('Pipeline step failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // If it's already our error type, preserve the chain
    if (error instanceof AIError) {
      throw new PipelineError(
        `Pipeline step '${taskName}' failed: ${error.message}`,
        'unknown', // Will be set by the calling pipeline
        taskName,
        error
      );
    }
    
    // Wrap other errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new PipelineError(
      `Pipeline step '${taskName}' failed: ${message}`,
      'unknown',
      taskName,
      error as Error
    );
  }
}

/**
 * Reusable pipeline error handler that follows DRY principles
 * Handles common error scenarios in pipelines with consistent error wrapping
 * 
 * @param error - The caught error
 * @param pipelineName - Name of the pipeline for error context
 * @param pipelineLogger - Logger instance for error reporting
 * @param processingTime - Optional processing time for metrics
 * @throws {PipelineError} Always throws a properly wrapped error
 */
export function handlePipelineError(
  error: unknown,
  pipelineName: string,
  pipelineLogger: ReturnType<typeof logger.child>,
  processingTime?: number
): never {
  const logContext = {
    error: error instanceof Error ? error.message : 'Unknown error',
    ...(processingTime && { processingTimeMs: processingTime })
  };

  pipelineLogger.error(`${pipelineName} pipeline failed`, logContext);
  
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    throw new PipelineError(
      `Pipeline input validation failed: ${error.issues.map(i => i.message).join(', ')}`,
      pipelineName,
      'input-validation',
      error
    );
  }
  
  // Re-throw pipeline errors with updated context
  if (error instanceof PipelineError) {
    if (error.pipelineName === 'unknown') {
      error.pipelineName = pipelineName;
    }
    throw error;
  }
  
  // Re-throw AI errors as pipeline errors
  if (error instanceof AIError) {
    throw new PipelineError(
      `AI task failed: ${error.message}`,
      pipelineName,
      undefined,
      error
    );
  }
  
  // Wrap unknown errors
  const message = error instanceof Error ? error.message : `Unknown error during ${pipelineName} pipeline`;
  throw new PipelineError(message, pipelineName, undefined, error as Error);
}

/**
 * Executes multiple tasks in sequence with proper error handling and logging
 * @param tasks - Array of task configurations
 * @param pipelineName - Name of the pipeline for error reporting
 * @returns Array of task results
 */
export async function executeSequentialTasks(
  tasks: Array<{
    name: string;
    fn: () => Promise<unknown>;
    context?: Record<string, unknown>;
  }>,
  pipelineName: string
): Promise<unknown[]> {
  const results: unknown[] = [];
  
  for (const task of tasks) {
    try {
      const result = await handleAsyncTask(task.fn, task.name, task.context);
      results.push(result);
    } catch (error) {
      if (error instanceof PipelineError) {
        // Update the pipeline name
        error.pipelineName = pipelineName;
      }
      throw error;
    }
  }
  
  return results;
}

/**
 * Validates pipeline step results
 * @param result - The result to validate
 * @param stepName - Name of the step for error reporting
 * @param validator - Validation function
 * @returns The validated result
 * @throws {PipelineError} If validation fails
 */
export function validateStepResult<T>(
  result: unknown,
  stepName: string,
  validator: (value: unknown) => value is T
): T {
  if (!validator(result)) {
    throw new PipelineError(
      `Step result validation failed for '${stepName}'`,
      'unknown',
      stepName
    );
  }
  return result;
}

/**
 * Creates a pipeline-scoped logger with consistent context
 * @param pipelineName - Name of the pipeline
 * @param additionalContext - Additional context to include
 * @returns Logger instance with pipeline context
 */
export function createPipelineLogger(
  pipelineName: string, 
  additionalContext?: Record<string, unknown>
) {
  return logger.child({ 
    pipeline: pipelineName,
    ...additionalContext 
  });
}

/**
 * Utility for timing pipeline operations
 * @param operation - The operation to time
 * @returns Object with result and duration
 */
export async function timed<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  return { result, duration };
} 