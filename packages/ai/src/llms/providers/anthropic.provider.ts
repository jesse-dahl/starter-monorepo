import { Anthropic } from '@anthropic-ai/sdk';
import { LLM, Prompt, LLMConfig, LLMResponse } from '../../types/ai.types';
import { AnthropicModel } from '../models/models.enums';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const anthropicLLM: LLM<AnthropicModel> = {
  async generate(prompt: Prompt, config: LLMConfig<AnthropicModel>): Promise<LLMResponse> {
    const response = await anthropic.messages.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens || 1024,
      ...(prompt.system && { system: prompt.system }),
      messages: [
        { role: 'user' as const, content: prompt.user },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    };
  },
};