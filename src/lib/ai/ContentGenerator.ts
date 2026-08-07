import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'missing_key';
const ai = apiKey !== 'missing_key' ? new GoogleGenAI({ apiKey }) : null;

export class ContentGenerator {
  static async draftMessage(
    leadId: string, 
    channel: 'WhatsApp' | 'Email' | 'Note' | 'Agenda',
    context?: string
  ): Promise<string> {
    if (!ai) return "Gemini API is not configured.";

    // Gather lead context
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return "Lead not found.";

    let systemPrompt = `You are an expert Admission Counselor drafting a message for a student lead.
Lead Name: ${lead.name}
Status: ${lead.status}
Priority: ${lead.priority}
Course/Interest: ${lead.course_id || 'Not specified'}
City: ${lead.city || 'Unknown'}`;

    if (context) {
      systemPrompt += `\nAdditional Context / User Request: ${context}`;
    }

    let instruction = "";
    if (channel === 'WhatsApp') {
      instruction = "Draft a very short, friendly, and persuasive WhatsApp message. Use emojis. Keep it under 50 words. Do not include subject lines.";
    } else if (channel === 'Email') {
      instruction = "Draft a professional email. Include a compelling Subject Line at the top (Subject: ...). Keep it persuasive but formal.";
    } else if (channel === 'Note') {
      instruction = "Draft a concise summary note of the lead's current situation and recommended next steps for internal team members.";
    } else if (channel === 'Agenda') {
      instruction = "Draft a bulleted meeting agenda for a counseling call with this student.";
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: instruction }] }],
        config: {
          systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
          temperature: 0.7
        }
      });

      return response.text || '';
    } catch (e: any) {
      console.error(`AI Drafting Error (${channel}):`, e);
      return "Error generating draft. Please try again.";
    }
  }
}
