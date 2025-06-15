import OpenAI from 'openai';
import { LLM, Prompt, LLMConfig, LLMResponse } from '../../types/ai.types';
import { OpenAIModel } from '../models/models.enums';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const openaiLLM: LLM<OpenAIModel> = {
  async generate(prompt: Prompt, config: LLMConfig<OpenAIModel>): Promise<LLMResponse> {
    const isVisionModel = config.model === OpenAIModel.GPT4VisionPreview;

    if (isVisionModel && prompt.user.startsWith('data:image')) {
      const response = await openai.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        messages: [{
          role: 'user' as const,
          content: [
            { type: 'text', text: prompt.system || '' },
            { type: 'image_url', image_url: { url: prompt.user, detail: 'high' } },
          ],
        }],
      });

      return {
        content: response.choices[0]?.message.content || '',
        tokensUsed: response.usage?.total_tokens,
      };
    }

    const response = await openai.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        ...(prompt.system ? [{ role: 'system' as const, content: prompt.system }] : []),
        { role: 'user' as const, content: prompt.user },
      ],
    });

    return {
      content: response.choices[0]?.message.content || '',
      tokensUsed: response.usage?.total_tokens,
    };
  },
};