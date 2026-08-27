import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIAssistantService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    // In a real implementation this would preferably be an edge function to avoid exposing the key,
    // but for the purpose of the client side composer tool, we will use the same pattern.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processMessage(content: string, action: 'improve' | 'professional' | 'concise' | 'translate', targetLanguage?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let prompt = '';
    switch (action) {
      case 'improve':
        prompt = `Improve the grammar and clarity of this message:\n\n${content}`;
        break;
      case 'professional':
        prompt = `Rewrite this message to be highly professional and polite suitable for an educational counselor speaking to a student:\n\n${content}`;
        break;
      case 'concise':
        prompt = `Make this message very concise and to the point:\n\n${content}`;
        break;
      case 'translate':
        prompt = `Translate this message to ${targetLanguage || 'English'}:\n\n${content}`;
        break;
    }

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      console.error('AI Error:', e);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateReply(context: any, recentMessages: any[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const history = recentMessages.slice(-5).map(m => `${m.sender_type}: ${m.content}`).join('\n');
    
    const prompt = `
      You are an AI assistant for an educational counselor at Edvix CRM.
      Generate a helpful, professional reply to the student.
      Do not invent fees, scholarships, or placement guarantees.
      
      Student Context:
      Name: ${context.lead_name || 'Student'}
      
      Recent Chat History:
      ${history}
      
      Suggested reply:
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      console.error('AI Error:', e);
      throw new Error('Failed to generate AI reply');
    }
  }
}

export const aiAssistantService = new AIAssistantService();
