# @starter-kit/ai

A comprehensive AI package for building structured LLM-powered tasks with type safety, validation, and error handling.

## Features

- 🔄 **Multiple LLM Providers**: OpenAI, Anthropic, and Google Gemini support
- 🛡️ **Type Safety**: Full TypeScript support with Zod validation
- 📝 **Structured Tasks**: Clean, reusable task patterns with proper error handling
- 🔍 **Logging**: Comprehensive logging with contextual information
- ⚡ **Utilities**: JSON extraction, validation, and parsing utilities

## Quick Start

```typescript
import { createWelcomeEmailTask, openaiLLM, OpenAIModel } from '@starter-kit/ai';

// Execute a task
const result = await createWelcomeEmailTask(
  { name: 'John Doe', customMessage: 'Welcome to our platform!' },
  openaiLLM,
  { model: OpenAIModel.GPT4, temperature: 0.7 }
);

console.log(result.subject); // "Welcome to Our Platform, John!"
```

## Task & Pipeline Structure

All tasks and pipelines follow consistent patterns for maximum reliability and maintainability:

## Task Structure

### 1. Input/Output Schemas

```typescript
import { z } from 'zod';

// Define and validate inputs
export const MyTaskInputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  options: z.object({
    includeMetadata: z.boolean().default(false),
  }).optional(),
});

export type MyTaskInput = z.infer<typeof MyTaskInputSchema>;

// Define and validate outputs
export const MyTaskOutputSchema = z.object({
  result: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
});

export type MyTaskOutput = z.infer<typeof MyTaskOutputSchema>;
```

### 2. Task Implementation

```typescript
import { Task, AIError, LLMGenerationError, TaskValidationError } from '@starter-kit/ai';
import { logger } from '@starter-kit/logger';

export const myTask: Task<MyTaskInput, MyTaskOutput> = async (
  input,
  llm,
  config
) => {
  const taskLogger = logger.child({ task: 'my-task' });
  taskLogger.info('Starting task execution', { inputKeys: Object.keys(input) });

  try {
    // 1. Validate input
    const validatedInput = MyTaskInputSchema.parse(input);
    
    // 2. Prepare prompt
    const prompt = {
      system: 'You are an expert assistant...',
      user: `Process this text: ${validatedInput.text}`,
    };

    // 3. Generate response
    taskLogger.debug('Calling LLM');
    const response = await llm.generate(prompt, config);
    
    if (!response.content) {
      throw new LLMGenerationError('Empty response from LLM');
    }

    // 4. Parse and validate response
    const jsonContent = extractJson(response.content);
    const parsedContent = safeJsonParse(jsonContent);
    const validatedOutput = MyTaskOutputSchema.parse(parsedContent);
    
    taskLogger.info('Task completed successfully', { 
      tokensUsed: response.tokensUsed 
    });

    return validatedOutput;

  } catch (error) {
    taskLogger.error('Task execution failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      throw new TaskValidationError(
        `Validation failed: ${error.issues.map(i => i.message).join(', ')}`, 
        error
      );
    }
    
    if (error instanceof AIError) {
      throw error;
    }
    
    throw new AIError(
      error instanceof Error ? error.message : 'Unknown error',
      error as Error
    );
  }
};
```

## Pipeline Structure

Pipelines orchestrate multiple tasks and follow these patterns:

```typescript
import { z } from 'zod';
import { Pipeline, PipelineError, handleAsyncTask, createPipelineLogger } from '@starter-kit/ai';

// Define pipeline input/output schemas
const MyPipelineInputSchema = z.object({
  data: z.string(),
  options: z.object({
    processingMode: z.enum(['fast', 'thorough']).default('fast'),
  }).optional(),
});

const MyPipelineOutputSchema = z.object({
  results: z.array(z.unknown()),
  summary: z.object({
    processingTimeMs: z.number(),
    stepsCompleted: z.number(),
  }),
});

export const myPipeline: Pipeline<MyPipelineInput, MyPipelineOutput> = async (input) => {
  const startTime = Date.now();
  const pipelineLogger = createPipelineLogger('my-pipeline');
  
  try {
    // Validate input
    const validatedInput = MyPipelineInputSchema.parse(input);
    
    // Step 1: Execute first task
    const step1Result = await handleAsyncTask(
      () => firstTask(validatedInput.data, llm, config),
      'first-task',
      { inputLength: validatedInput.data.length }
    );
    
    // Step 2: Execute second task with results from step 1
    const step2Result = await handleAsyncTask(
      () => secondTask({ processedData: step1Result }, llm, config),
      'second-task'
    );
    
    // Compile results
    const pipelineOutput = {
      results: [step1Result, step2Result],
      summary: {
        processingTimeMs: Date.now() - startTime,
        stepsCompleted: 2,
      },
    };
    
    return MyPipelineOutputSchema.parse(pipelineOutput);
    
  } catch (error) {
    pipelineLogger.error('Pipeline failed', { error });
    
    if (error instanceof PipelineError) {
      throw error;
    }
    
    throw new PipelineError(
      error instanceof Error ? error.message : 'Unknown error',
      'my-pipeline',
      undefined,
      error as Error
    );
  }
};
```

## Available Providers

### OpenAI

```typescript
import { openaiLLM, OpenAIModel } from '@starter-kit/ai';

const config = {
  model: OpenAIModel.GPT4,
  temperature: 0.7,
  maxTokens: 1000,
};
```

### Anthropic

```typescript
import { anthropicLLM, AnthropicModel } from '@starter-kit/ai';

const config = {
  model: AnthropicModel.ClaudeSonnet,
  temperature: 0.7,
  maxTokens: 1000,
};
```

## Error Handling

The package provides specific error types for different failure scenarios:

```typescript
import { 
  AIError, 
  LLMGenerationError, 
  LLMParseError, 
  TaskValidationError 
} from '@starter-kit/ai';

try {
  const result = await myTask(input, llm, config);
} catch (error) {
  if (error instanceof TaskValidationError) {
    // Handle input validation errors
    console.log('Invalid input:', error.message);
  } else if (error instanceof LLMGenerationError) {
    // Handle LLM generation failures
    console.log('LLM failed:', error.message);
  } else if (error instanceof LLMParseError) {
    // Handle response parsing errors
    console.log('Parse failed:', error.message);
  } else if (error instanceof AIError) {
    // Handle other AI-related errors
    console.log('AI error:', error.message);
  }
}
```

## Utilities

### JSON Extraction

```typescript
import { extractJson, safeJsonParse } from '@starter-kit/ai';

// Extract JSON from LLM response that may contain markdown
const jsonString = extractJson(response.content);

// Safely parse JSON with better error messages
const parsedData = safeJsonParse(jsonString);
```

## Best Practices

1. **Always validate inputs and outputs** using Zod schemas
2. **Use structured logging** with contextual information
3. **Handle errors gracefully** with specific error types and `handlePipelineError()` utility
4. **Include confidence scores** when possible for quality assessment
5. **Use descriptive task names** and comprehensive documentation
6. **Test with various LLM providers** to ensure compatibility
7. **Use pipeline utilities** like `handleAsyncTask()` and `createPipelineLogger()` for consistency

## Example Tasks & Pipelines

The package includes comprehensive examples that demonstrate best practices:

### Tasks
- `createWelcomeEmailTask`: Generates structured welcome emails
- `extractUserInfoTask`: Extracts user information from unstructured text

### Pipelines
- `userOnboardingPipeline`: Complete user onboarding workflow (extracts info + creates welcome email)

These serve as templates for building your own tasks and pipelines.

## Pipelines

Pipelines allow you to chain multiple AI tasks together for complex workflows:

```typescript
import { 
  userOnboardingPipeline,
  openaiLLM, 
  OpenAIModel 
} from '@starter-kit/ai';

// Create a configured pipeline
const pipeline = userOnboardingPipeline(
  openaiLLM,
  { model: OpenAIModel.GPT4, temperature: 0.7 }
);

// Execute the pipeline
const result = await pipeline({
  userText: "Hi, I'm John Doe from Acme Corp. You can reach me at john@acme.com. I love coding and building software products.",
  customWelcomeMessage: "We're excited to have you!",
  companyName: "TechStart Inc"
});

console.log(result.extractedInfo.firstName); // "John"
console.log(result.welcomeEmail.subject); // Generated welcome email subject
```

### Additional Pipeline Examples

Here are more pipeline patterns you can implement:

#### Simple Single-Task Pipeline
```typescript
export const simpleUserExtractionPipeline = (
  llm: LLM<any>,
  config: LLMConfig<any>
) => async (input: { text: string }): Promise<ExtractUserInfoOutput> => {
  const pipelineLogger = createPipelineLogger('simple-user-extraction');
  
  try {
    pipelineLogger.info('Starting simple user extraction pipeline');
    
    const result = await handleAsyncTask(
      () => extractUserInfoTask({ text: input.text }, llm, config),
      'extract-user-info'
    );
    
    pipelineLogger.info('Simple user extraction pipeline completed', {
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    handlePipelineError(error, 'simple-user-extraction', pipelineLogger);
  }
};
```

#### Batch Processing Pipeline
```typescript
export const batchUserOnboardingPipeline = (
  llm: LLM<any>,
  config: LLMConfig<any>
) => async (
  inputs: Array<{ text: string; name?: string }>
): Promise<Array<{ extracted: ExtractUserInfoOutput; welcome: WelcomeEmailOutput }>> => {
  const pipelineLogger = createPipelineLogger('batch-user-onboarding');
  
  pipelineLogger.info('Starting batch user onboarding pipeline', { 
    batchSize: inputs.length 
  });
  
  try {
    // Process all users in parallel
    const results = await Promise.all(
      inputs.map(async (input, index) => {
        const stepLogger = pipelineLogger.child({ userIndex: index });
        
        try {
          // Extract user info
          const extracted = await extractUserInfoTask(
            { text: input.text }, 
            llm, 
            config
          );
          
          // Create welcome email
          const userName = input.name || extracted.firstName || 'User';
          const welcome = await createWelcomeEmailTask(
            { name: userName },
            llm,
            config
          );
          
          stepLogger.info('User processing completed', { userName });
          
          return { extracted, welcome };
          
        } catch (error) {
          stepLogger.error('User processing failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw new PipelineError(
            `Failed to process user at index ${index}`,
            'batch-user-onboarding',
            `user-${index}`,
            error as Error
          );
        }
      })
    );
    
    pipelineLogger.info('Batch user onboarding pipeline completed', {
      processedCount: results.length
    });
    
    return results;
    
  } catch (error) {
    handlePipelineError(error, 'batch-user-onboarding', pipelineLogger);
  }
};
```

### Pipeline Utilities

The package provides utilities for building robust pipelines:

- `handleAsyncTask()`: Wraps task execution with error handling and logging
- `createPipelineLogger()`: Creates pipeline-scoped loggers
- `handlePipelineError()`: Reusable error handler for consistent pipeline error handling
- `executeSequentialTasks()`: Executes multiple tasks in sequence
- `timed()`: Measures execution time for operations

### Pipeline Error Handling

Pipelines use specific error types for different failure scenarios:

```typescript
import { PipelineError } from '@starter-kit/ai';

try {
  const result = await myPipeline(input);
} catch (error) {
  if (error instanceof PipelineError) {
    console.log(`Pipeline '${error.pipelineName}' failed at step '${error.stepName}': ${error.message}`);
  }
}
```

## Environment Variables

Set up the following environment variables for LLM providers:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GEMINI_API_KEY=...
```

## Contributing

When adding new tasks:

1. Follow the established patterns for consistency
2. Include comprehensive error handling
3. Add proper TypeScript types and Zod schemas
4. Include structured logging
5. Write clear documentation and examples 