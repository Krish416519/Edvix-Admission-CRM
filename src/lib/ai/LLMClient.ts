import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { fetchAiConfig } from '../adminService';

export class LLMClient {
  private static cachedConfig: any = null;
  private static lastFetchTime: number = 0;

  static async getConfig() {
    // Cache config for 5 minutes
    if (this.cachedConfig && Date.now() - this.lastFetchTime < 5 * 60 * 1000) {
      return this.cachedConfig;
    }

    try {
      const config = await fetchAiConfig();
      this.cachedConfig = config;
      this.lastFetchTime = Date.now();
      return config;
    } catch (e) {
      console.warn("Failed to fetch AI config from Supabase, using fallbacks");
      return {
        provider: 'Google Gemini',
        api_key: import.meta.env.VITE_GEMINI_API_KEY || 'missing_key',
        model: 'gemini-1.5-pro'
      };
    }
  }

  static async generateText(
    prompt: string, 
    systemInstruction?: string,
    temperature?: number
  ): Promise<string> {
    const config = await this.getConfig();
    const apiKey = config.api_key || import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'missing_key';

    if (config.provider === 'OpenRouter') {
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        dangerouslyAllowBrowser: true
      });

      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await client.chat.completions.create({
        model: config.model || "inclusionai/ling-3.0-tiny:free",
        messages,
        temperature: temperature ?? config.temperature ?? 0.7,
        extra_body: { reasoning: { enabled: true } }
      } as any);

      return response.choices[0]?.message?.content || '';
    } 
    else {
      // Fallback to Gemini
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-1.5-pro',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: temperature ?? config.temperature ?? 0.7
        }
      });
      return response.text || '';
    }
  }

  static async generateJson(
    prompt: string, 
    systemInstruction?: string,
    temperature?: number
  ): Promise<string> {
    const config = await this.getConfig();
    const apiKey = config.api_key || import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'missing_key';

    if (config.provider === 'OpenRouter') {
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        dangerouslyAllowBrowser: true
      });

      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction + " Return ONLY valid JSON." });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await client.chat.completions.create({
        model: config.model || "inclusionai/ling-3.0-tiny:free",
        messages,
        temperature: temperature ?? config.temperature ?? 0.7,
        response_format: { type: 'json_object' },
        extra_body: { reasoning: { enabled: true } }
      } as any);

      return response.choices[0]?.message?.content || '{}';
    } 
    else {
      // Fallback to Gemini
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-1.5-pro',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: temperature ?? config.temperature ?? 0.7,
          responseMimeType: 'application/json'
        }
      });
      return response.text || '{}';
    }
  }

  static async chat(
    messages: Array<{role: string, content: string, reasoning_details?: any}>,
    systemInstruction?: string,
    temperature?: number
  ): Promise<{content: string, reasoning_details?: any}> {
    const config = await this.getConfig();
    const apiKey = config.api_key || import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'missing_key';

    if (config.provider === 'OpenRouter') {
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        dangerouslyAllowBrowser: true
      });

      const openAIMessages: any[] = [];
      if (systemInstruction) {
        openAIMessages.push({ role: 'system', content: systemInstruction });
      }
      
      messages.forEach(msg => {
        openAIMessages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content,
          ...(msg.reasoning_details && { reasoning_details: msg.reasoning_details })
        });
      });

      const response = await client.chat.completions.create({
        model: config.model || "inclusionai/ling-3.0-tiny:free",
        messages: openAIMessages,
        temperature: temperature ?? config.temperature ?? 0.7,
        extra_body: { reasoning: { enabled: true } }
      } as any);

      const choice = response.choices[0]?.message;
      return {
        content: choice?.content || '',
        reasoning_details: (choice as any)?.reasoning_details
      };
    } 
    else {
      // Fallback to Gemini
      const ai = new GoogleGenAI({ apiKey });
      const geminiContents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));
      
      const lastMessage = geminiContents.pop()?.parts[0].text || '';

      const chat = ai.chats.create({
        model: config.model || 'gemini-1.5-pro',
        config: {
          systemInstruction,
          temperature: temperature ?? config.temperature ?? 0.7
        },
        history: geminiContents
      });
      
      const response = await chat.sendMessage({ message: lastMessage });
      return { content: response.text || '' };
    }
  }
}
