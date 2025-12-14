import { DEFAULT_LLM_MODEL } from '../types/appProfile';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GroqChatService {
  private static readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  static async formatTranscription(
    rawText: string,
    systemPrompt: string,
    apiKey: string,
    model: string = DEFAULT_LLM_MODEL
  ): Promise<string> {
    try {
      const requestBody: ChatCompletionRequest = {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: rawText,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      };

      console.log('[GroqChatService] Request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Groq API Error: ${response.statusText}`);
      }

      const data: ChatCompletionResponse = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const formattedText = data.choices[0].message.content.trim();
        console.log('[GroqChatService] Formatted text:', formattedText);
        return formattedText;
      }

      throw new Error('No completion returned from Groq API');
    } catch (error) {
      console.error('[GroqChatService] Error formatting transcription:', error);
      // Return raw text as fallback
      throw error;
    }
  }

  static async transformText(
    selectedText: string,
    instruction: string,
    apiKey: string,
    model: string = DEFAULT_LLM_MODEL
  ): Promise<string> {
    const systemPrompt = `You are a text transformation assistant. Transform the given text according to the user's instruction. Return ONLY the transformed text, nothing else. No explanations, no quotes around the output, no markdown formatting unless specifically requested. Do not add any preamble or commentary.`;

    const userMessage = `Original text:
"""
${selectedText}
"""

Instruction: ${instruction}`;

    try {
      const requestBody: ChatCompletionRequest = {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      };

      console.log('[GroqChatService] Transform request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Groq API Error: ${response.statusText}`);
      }

      const data: ChatCompletionResponse = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const transformedText = data.choices[0].message.content.trim();
        console.log('[GroqChatService] Transformed text:', transformedText);
        return transformedText;
      }

      throw new Error('No completion returned from Groq API');
    } catch (error) {
      console.error('[GroqChatService] Error transforming text:', error);
      throw error;
    }
  }
}
