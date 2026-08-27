import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase';
import { AI_TOOLS, AIToolHandlers } from './ToolRegistry';
import { PermissionEngine } from './PermissionEngine';
import { AIContextBuilder } from './ContextBuilder';
import { AIMessage } from './types';

import { LLMClient } from './LLMClient';
import { OpenAI } from 'openai';

export class AIService {
  static async sendMessage(
    userId: string,
    prompt: string,
    history: AIMessage[],
    currentPathname: string,
    conversationId?: string
  ): Promise<string> {
    const config = await LLMClient.getConfig();
    const apiKey = config.api_key || import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'missing_key';

    if (!apiKey || apiKey === 'missing_key') {
      throw new Error('AI API Key is not configured. Please add it to your settings or .env file.');
    }

    const startTime = Date.now();
    let toolsUsed: string[] = [];
    let affectedRecords: any = {};
    let actionTaken = 'Chat';

    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    const userRole = user?.role || 'Unknown';

    const dynamicContext = await AIContextBuilder.buildContext(currentPathname);

    let systemInstruction = `You are the Edvix AI Command Center. You are a highly capable agent integrated deeply into the CRM.
You have access to real CRM data and can execute workflows (Create, Update, Bulk Assign, Reports) using tools.
Before taking destructive actions, confirm with the user.
If you generate a report, use the generate_report tool and explain what you did.

CURRENT USER ID: ${userId}
USER ROLE: ${userRole}
CURRENT UI CONTEXT: ${JSON.stringify(dynamicContext)}`;

    let currentResponseText = '';

    try {
      if (config.provider === 'OpenRouter') {
        const client = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey,
          dangerouslyAllowBrowser: true
        });

        // Convert AI_TOOLS to OpenAI format
        const openaiTools = AI_TOOLS[0].functionDeclarations?.map(decl => ({
          type: "function" as const,
          function: {
            name: decl.name,
            description: decl.description,
            parameters: decl.parameters
          }
        }));

        const messages: any[] = [];
        messages.push({ role: 'system', content: systemInstruction });
        
        history.forEach(msg => {
          messages.push({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.content,
            ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
            ...(msg.reasoning_details && { reasoning_details: msg.reasoning_details })
          });
        });
        messages.push({ role: 'user', content: prompt });

        for (let i = 0; i < 5; i++) {
          const response = await client.chat.completions.create({
            model: config.model || "inclusionai/ling-3.0-tiny:free",
            messages,
            tools: openaiTools as any,
            temperature: 0.2,
            extra_body: { reasoning: { enabled: true } }
          } as any);

          const choice = response.choices[0]?.message;
          if (choice?.content) {
            currentResponseText += choice.content;
          }

          if (!choice?.tool_calls || choice.tool_calls.length === 0) {
            break;
          }

          messages.push(choice); // Push the assistant's message with tool_calls

          for (const call of choice.tool_calls) {
            const name = (call as any).function.name;
            const args = JSON.parse((call as any).function.arguments || '{}');
            toolsUsed.push(name);
            actionTaken = `Executed ${name}`;
            
            try {
              console.log(`Executing AI Tool: ${name}`, args);
              const result = await AIToolHandlers.execute(name, args, { userId, role: userRole });
              
              if (result.leads) affectedRecords.count = result.leads.length;
              if (result.task) affectedRecords.taskId = result.task.id;

              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify(result)
              });
            } catch (e: any) {
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ error: e.message })
              });
            }
          }
        }
      } else {
        // GEMINI FORMAT
        const ai = new GoogleGenAI({ apiKey });
        const contents: any[] = history.map(msg => ({
          role: msg.role === 'model' || msg.role === 'function' ? 'model' : 'user',
          parts: msg.tool_calls 
            ? [{ functionCall: msg.tool_calls }] 
            : [{ text: msg.content }]
        }));

        contents.push({ role: 'user', parts: [{ text: prompt }] });

        for (let i = 0; i < 5; i++) {
          const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents,
            config: {
              systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
              tools: AI_TOOLS,
              temperature: 0.2,
            }
          });

          if (response.text) {
            currentResponseText += response.text;
          }

          if (!response.functionCalls || response.functionCalls.length === 0) {
            break;
          }

          const functionResponses = [];
          contents.push({
            role: 'model',
            parts: response.functionCalls.map(call => ({ functionCall: call }))
          });

          for (const call of response.functionCalls) {
            const { name, args } = call;
            if (!name) continue;
            
            toolsUsed.push(name);
            actionTaken = `Executed ${name}`;
            
            try {
              console.log(`Executing AI Tool: ${name}`, args);
              const result = await AIToolHandlers.execute(name, args, { userId, role: userRole });
              
              if (result.leads) affectedRecords.count = result.leads.length;
              if (result.task) affectedRecords.taskId = result.task.id;

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
          contents.push({ role: 'function', parts: functionResponses });
        }
      }

      if (conversationId) {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: prompt
        });
        
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'model',
          content: currentResponseText
        });
      }

      // Detailed Audit Log in DB
      await PermissionEngine.logAction({
        userId,
        role: userRole,
        prompt,
        actionTaken,
        toolsUsed,
        affectedRecords,
        status: 'success',
        executionTimeMs: Date.now() - startTime
      });

      return currentResponseText;

    } catch (error: any) {
      console.error("AI Service Error:", error);
      
      // Log Failure
      await PermissionEngine.logAction({
        userId,
        role: userRole,
        prompt,
        actionTaken: 'Failed Execution',
        toolsUsed,
        affectedRecords: {},
        status: 'failure',
        errorMessage: error.message,
        executionTimeMs: Date.now() - startTime
      });

      throw error;
    }
  }

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
