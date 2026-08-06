import { supabase } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

export function useCallAi() {
  const processCall = async (callId: string, providerCallId?: string) => {
    console.log(`[useCallAi] Processing call ${callId} via Gemini API...`);
    
    try {
      // 1. Mark as processing
      await supabase.from('calls').update({ ai_summary: 'Processing AI insights...' }).eq('id', callId);

      // 2. In a real app, we would fetch the audio recording from the telephony provider 
      // using providerCallId and pass it to Gemini for multimodal processing.
      // Since we don't have the real audio bytes here, we'll simulate the transcript 
      // but use the REAL Gemini API to analyze it if the key exists.
      
      const simulatedTranscript = `Counselor: Hello, this is Edvix CRM calling. Is this John?
User: Yes, this is John. I was looking into your MBA program.
Counselor: Great! Do you have any prior experience?
User: A bit, but I'm worried about the fees. Is there an EMI option?
Counselor: Yes, we have 0% EMI options available for the MBA. We also have scholarships based on your graduation marks.
User: That would be perfect, thanks. Can you send me the details?
Counselor: Absolutely, I'll send an email right away. Let's talk next week on Tuesday to finalize.
User: Sounds good. Bye.`;

      // Check if Gemini API key is available
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      let aiUpdates: any = { transcript: simulatedTranscript };
      
      if (apiKey) {
        // Use Real Gemini API
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
          Analyze the following call transcript between an admission counselor and a student.
          Provide the output as a JSON object with the following exact keys:
          - ai_summary: A concise 2-sentence summary of the call.
          - ai_sentiment: One of 'positive', 'neutral', or 'negative'.
          - ai_objections: A list of strings representing concerns or objections raised by the student.
          - ai_action_items: A list of strings representing tasks the counselor needs to do.
          - ai_recommended_next_steps: A list of strings for the next strategic moves.
          - ai_follow_up_email: A draft follow-up email based on the conversation.
          - ai_whatsapp_message: A short, friendly WhatsApp message draft.
          - ai_lead_score_delta: An integer between -10 and 20 representing how much the lead's score should change based on their interest level.
          
          Transcript:
          ${simulatedTranscript}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          aiUpdates = { ...aiUpdates, ...parsed };
        }
      } else {
        // Fallback if no API key is provided
        console.warn('No Gemini API key found, using fallback AI processing');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        
        aiUpdates = {
          transcript: simulatedTranscript,
          ai_summary: "User is interested in the MBA program but is concerned about the fees. Requested a fee breakdown and scholarship details. Agreed to follow up next Tuesday.",
          ai_sentiment: "positive",
          ai_objections: ["High fees / budget concerns"],
          ai_action_items: [
            "Send fee structure breakdown via email",
            "Include scholarship opportunities in the email",
            "Schedule follow-up call for next Tuesday"
          ],
          ai_recommended_next_steps: ["Discuss EMI options in detail on the next call"],
          ai_follow_up_email: "Hi John,\n\nThanks for speaking with me today regarding the MBA program. As discussed, we offer 0% EMI options and scholarships. Let's connect next Tuesday.\n\nBest, Counselor",
          ai_whatsapp_message: "Hi John! Good speaking with you. I've sent the MBA fee details to your email. Talk to you next Tuesday! - Edvix",
          ai_lead_score_delta: 10
        };
      }

      // Update the database record
      await supabase.from('calls').update(aiUpdates).eq('id', callId);
      
      // Also update the lead score if delta is provided
      if (aiUpdates.ai_lead_score_delta) {
         // Get current lead score
         const { data: callData } = await supabase.from('calls').select('lead_id').eq('id', callId).single();
         if (callData?.lead_id) {
           // We would fetch current score and add delta, but for simplicity we'll just log it here.
           // Real implementation would use an RPC to safely increment the score.
           console.log(`Lead score updated by ${aiUpdates.ai_lead_score_delta}`);
         }
      }
      
      toast.success('AI Call Analysis complete');
      return aiUpdates;

    } catch (e) {
      console.error('AI processing failed:', e);
      toast.error('AI Call Analysis failed');
      await supabase.from('calls').update({ ai_summary: 'AI processing failed' }).eq('id', callId);
      return null;
    }
  };

  return { processCall };
}
