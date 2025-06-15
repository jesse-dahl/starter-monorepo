export type Prompt = {
  system?: string;
  user: string;
};

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
}

export interface LLMConfig<M> {
  model: M;
  temperature?: number;
  maxTokens?: number;
}

export interface LLM<M> {
  generate(prompt: Prompt, config: LLMConfig<M>): Promise<LLMResponse>;
}

/**
 * Generic task function type for AI operations
 * @template TInput - The input parameters for the task
 * @template TOutput - The expected output type from the task
 */
export type Task<TInput = any, TOutput = any> = (
  input: TInput,
  llm: LLM<any>,
  config: LLMConfig<any>
) => Promise<TOutput>;

/**
 * Base error class for AI-related operations
 */
export class AIError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Error thrown when LLM response parsing fails
 */
export class LLMParseError extends AIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'LLMParseError';
  }
}

/**
 * Error thrown when task validation fails
 */
export class TaskValidationError extends AIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'TaskValidationError';
  }
}

/**
 * Error thrown when LLM generation fails
 */
export class LLMGenerationError extends AIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'LLMGenerationError';
  }
}

/**
 * Error thrown when pipeline execution fails
 */
export class PipelineError extends AIError {
  constructor(
    message: string, 
    public pipelineName: string,
    public stepName?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'PipelineError';
  }
}

/**
 * Generic pipeline function type for AI operations
 * @template TInput - The input parameters for the pipeline
 * @template TOutput - The expected output type from the pipeline
 */
export type Pipeline<TInput = any, TOutput = any> = (
  input: TInput
) => Promise<TOutput>;