import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase';
import { AI_TOOLS, AIToolHandlers } from './ToolRegistry';
import { AuditLogger } from './AuditLogger';
import { AIContextBuilder } from './ContextBuilder';
import { AIMessage } from './types';

// Initialize the GenAI client.
// Note: VITE_GEMINI_API_KEY must be set in your .env file
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export class AIService {
  /**
   * Generates a response from the AI assistant.
   * Handles tool execution loop internally.
   */
  static async sendMessage(
    userId: string,
    prompt: string,
    history: AIMessage[],
    currentPathname: string,
    conversationId?: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('Gemini API Key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    const startTime = Date.now();
    let toolsUsed: string[] = [];

    // Gather dynamic context
    const dynamicContext = await AIContextBuilder.buildContext(currentPathname);

    // Build the system prompt
    let systemInstruction = `You are the Edvix AI Counselor Assistant. You have access to the CRM database via tools. 
Always use real data. Do not make up leads or payments.
If the user asks a question about their data, use the available tools to search and fetch the data first, then answer.

CURRENT USER ID: ${userId}
CURRENT UI CONTEXT: ${JSON.stringify(dynamicContext)}`;

    // Convert history to GenAI format
    const contents: any[] = history.map(msg => ({
      role: msg.role === 'model' || msg.role === 'function' ? 'model' : 'user',
      parts: msg.tool_calls 
        ? [{ functionCall: msg.tool_calls }] 
        : [{ text: msg.content }]
    }));

    // Add current prompt
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    let currentResponseText = '';

    try {
      // Loop to handle potential multiple tool calls (max 5 iterations to prevent infinite loops)
      for (let i = 0; i < 5; i++) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
            tools: AI_TOOLS,
            temperature: 0.2,
          }
        });

        // 1. If there's text, append it
        if (response.text) {
          currentResponseText += response.text;
        }

        // 2. If no function calls, we are done
        if (!response.functionCalls || response.functionCalls.length === 0) {
          break;
        }

        // 3. Handle function calls
        const functionResponses = [];
        
        // Add the model's function calls to the history
        contents.push({
          role: 'model',
          parts: response.functionCalls.map(call => ({ functionCall: call }))
        });

        for (const call of response.functionCalls) {
          const { name, args } = call;
          toolsUsed.push(name);
          
          try {
            console.log(`Executing AI Tool: ${name}`, args);
            const result = await AIToolHandlers.execute(name, args, { userId });
            
            functionResponses.push({
              functionResponse: {
                name,
                response: result
              }
            });
          } catch (e: any) {
             functionResponses.push({
              functionResponse: {
                name,
                response: { error: e.message }
              }
            });
          }
        }

        // Add the function responses back into the history
        contents.push({
          role: 'user', // According to genai spec, function responses come from the user role
          parts: functionResponses
        });
      }

      // Save to memory
      if (conversationId) {
        // Save user message
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: prompt
        });
        
        // Save model message
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'model',
          content: currentResponseText
        });
      }

      // Audit Log
      await AuditLogger.log(userId, prompt, currentResponseText, Date.now() - startTime, toolsUsed);

      return currentResponseText;

    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  }

  /**
   * Creates a new conversation in Supabase
   */
  static async createConversation(userId: string, initialContext: any = {}) {
    const { data, error } = await supabase.from('ai_conversations').insert({
      user_id: userId,
      title: 'New Chat',
      context_data: initialContext
    }).select().single();
    
    if (error) throw error;
    return data;
  }
}
