import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase';
import { Lead, University } from '../../types/schema';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface AIRecommendationResult {
  topUniversities: Array<{
    code: string;
    name: string;
    compatibilityScore: number;
    reason: string;
    pros: string[];
    cons: string[];
    feeBreakdown: {
      total: number;
      semester: number;
      registration: number;
    };
    scholarshipOpportunities: string[];
    emiEstimate: number;
    admissionTimeline: string;
    requiredDocuments: string[];
    expectedOutcome: string;
  }>;
  counselorAssistance: {
    talkingPoints: string[];
    objectionHandling: Array<{ objection: string; response: string }>;
    counselingNotes: string;
    recommendedFollowUp: string;
    whatsappDraft: string;
    emailDraft: string;
  };
  insights: {
    bestValueForMoney: string;
    highestPlacementPotential: string;
    fastestAdmission: string;
    lowestEmi: string;
    highestRoi: string;
    bestForWorkingProfessionals: string;
  };
}

export class RecommendationEngine {
  static async generate(leadId: string): Promise<AIRecommendationResult | null> {
    try {
      // 1. Fetch Lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
        
      if (!lead) throw new Error('Lead not found');

      // 2. Fetch Universities
      const { data: universities } = await supabase
        .from('universities')
        .select('*')
        .eq('status', 'Active');
        
      if (!universities || universities.length === 0) throw new Error('No universities found');

      // 3. Prepare Payload
      const leadProfile = {
        name: lead.first_name + ' ' + (lead.last_name || ''),
        age: lead.age,
        education: lead.education,
        graduationPercentage: lead.graduation_percentage,
        twelfthPercentage: lead.twelfth_percentage,
        tenthPercentage: lead.tenth_percentage,
        currentOccupation: lead.current_occupation,
        yearsOfExperience: lead.years_of_experience,
        budget: lead.budget,
        preferredSpecialization: lead.preferred_specialization,
        preferredLearningMode: lead.preferred_learning_mode,
        careerGoal: lead.career_goal,
        needPlacementSupport: lead.need_placement_support,
        needScholarship: lead.need_scholarship,
        needEmi: lead.need_emi,
        preferredIntake: lead.preferred_intake
      };

      const uniProfiles = universities.map(u => ({
        code: u.code,
        name: u.name,
        ugcApproval: u.ugc_approval,
        naacGrade: u.naac_grade,
        nirfRanking: u.nirf_ranking,
        averageSalary: u.average_salary,
        admissionProcess: u.admission_process,
        eligibility: u.eligibility,
        scholarships: u.scholarships,
        placementSupport: u.placement_support
      }));

      // 4. Construct Prompt
      const prompt = `
You are the Edvix Principal AI Counselor. You have a deep understanding of higher education, career paths, and financial planning.
Your goal is to recommend the absolute best top 5 universities for this student based on their complete profile.

Student Profile:
${JSON.stringify(leadProfile, null, 2)}

Available Universities:
${JSON.stringify(uniProfiles, null, 2)}

Analyze the compatibility based on: budget, eligibility, career goal, work experience, placement preference, learning mode, and academic background.

Output ONLY a valid JSON object matching this schema exactly, with NO markdown formatting around it:
{
  "topUniversities": [
    {
      "code": "string",
      "name": "string",
      "compatibilityScore": number (0-100),
      "reason": "Detailed string explaining why",
      "pros": ["string"],
      "cons": ["string"],
      "feeBreakdown": { "total": number, "semester": number, "registration": number },
      "scholarshipOpportunities": ["string"],
      "emiEstimate": number,
      "admissionTimeline": "string",
      "requiredDocuments": ["string"],
      "expectedOutcome": "string"
    }
  ],
  "counselorAssistance": {
    "talkingPoints": ["string"],
    "objectionHandling": [ { "objection": "string", "response": "string" } ],
    "counselingNotes": "string",
    "recommendedFollowUp": "string",
    "whatsappDraft": "string",
    "emailDraft": "string"
  },
  "insights": {
    "bestValueForMoney": "university name",
    "highestPlacementPotential": "university name",
    "fastestAdmission": "university name",
    "lowestEmi": "university name",
    "highestRoi": "university name",
    "bestForWorkingProfessionals": "university name"
  }
}
      `;

      // 5. Call Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2, // Low temperature for consistent JSON
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from AI');

      // 6. Parse and Return
      const result = JSON.parse(responseText) as AIRecommendationResult;
      
      // We will also save this to the DB in the UI component layer so we can attach generated_by
      return result;

    } catch (error) {
      console.error('Recommendation Engine Error:', error);
      return null;
    }
  }

  static async saveRecommendation(leadId: string, userId: string, result: AIRecommendationResult) {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .insert({
          lead_id: leadId,
          generated_by: userId,
          universities_recommended: result.topUniversities,
          counselor_notes: result.counselorAssistance,
          status: 'Pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Also log activity
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'note',
        subject: 'AI Recommendation Generated',
        content: `AI generated top 5 university recommendations for this student. Top match: ${result.topUniversities[0]?.name} (${result.topUniversities[0]?.compatibilityScore}%)`
      });

      return data;
    } catch (error) {
      console.error('Failed to save recommendation:', error);
      throw error;
    }
  }
}
