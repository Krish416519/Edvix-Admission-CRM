import { LLMClient } from './LLMClient';
import { supabase } from '../supabase';
import { Lead, University, Course, ProgramEligibilityRule, ProgramFee } from '../../types/schema';
import { EligibilityEngine, EligibilityStatus, EligibilityEvaluation } from '../counseling/EligibilityEngine';
import { FeeCalculator, FeeCalculationResult } from '../counseling/FeeCalculator';
import { ProfileReadiness } from '../counseling/ProfileReadiness';

export interface AIRecommendationResult {
  topUniversities: Array<{
    code: string;
    name: string;
    courseName: string;
    courseId: string;
    compatibilityScore: number;
    eligibilityStatus: EligibilityStatus;
    eligibilityExplanation: string;
    matchScore: number;
    reason: string;
    pros: string[];
    cons: string[];
    feeBreakdown: {
      total: number;
      semester: number;
      registration: number;
    };
    estimatedPayable: number;
    isFeeFinal: boolean;
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
  /**
   * Deterministic matching combined with LLM qualitative insights.
   */
  static async generate(leadId: string): Promise<AIRecommendationResult | null> {
    try {
      // 1. Fetch Lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
        
      if (!lead) throw new Error('Lead not found');

      // 2. Fetch Universities and Courses with Rules and Fees
      const { data: universitiesData } = await supabase
        .from('universities')
        .select('*, courses(*, program_eligibility_rules(*), program_fees(*))')
        .eq('status', 'Active');
        
      if (!universitiesData || universitiesData.length === 0) throw new Error('No universities found');

      // 3. Deterministic Evaluation
      const evaluatedMatches = [];
      const userBudget = parseInt(lead.budget?.replace(/[^0-9]/g, '') || '0', 10);

      for (const uni of universitiesData) {
        if (!uni.courses) continue;
        
        for (const course of uni.courses) {
          // Pre-filter by interest if possible
          if (lead.course && lead.course !== course.name && !lead.course.includes('Any')) {
            // Very strict filter - in reality we might want fuzzy matching, but for now we skip exact mismatches if a course is specified
            // Let's just do soft matching below instead.
          }
          
          // Rule evaluation
          let eligibility: EligibilityEvaluation = { overallStatus: 'LIKELY_ELIGIBLE', ruleResults: [], programId: course.id };
          const rules = course.program_eligibility_rules;
          if (rules && rules.length > 0) {
             // Take the active rule
             const activeRule = rules.find((r: any) => r.status === 'Active') || rules[0];
             eligibility = EligibilityEngine.evaluate(lead, activeRule);
          }
          
          // If definitively NOT_ELIGIBLE or INSUFFICIENT_DATA and it's a hard blocker, maybe score low.
          // Let's calculate fee
          const fees = course.program_fees || [];
          const feeResult = FeeCalculator.calculate(fees);
          
          // Calculate Deterministic Match Score (0-100)
          let matchScore = 0;
          
          // a. Program Match (30 pts)
          // Simple heuristic: Does course name match preferred specialization or course?
          const courseStr = (course.name || '').toLowerCase();
          const targetStr = (lead.preferred_specialization || lead.course || '').toLowerCase();
          if (targetStr && courseStr.includes(targetStr)) {
            matchScore += 30; // Exact/Related
          } else if (targetStr) {
            matchScore += 10; // Alternative
          } else {
             matchScore += 15; // Unknown preference
          }
          
          // b. Eligibility Confidence (25 pts)
          if (eligibility.overallStatus === 'VERIFIED_ELIGIBLE') matchScore += 25;
          else if (eligibility.overallStatus === 'LIKELY_ELIGIBLE') matchScore += 20;
          else if (eligibility.overallStatus === 'CONDITIONAL') matchScore += 15;
          else if (eligibility.overallStatus === 'MANUAL_REVIEW') matchScore += 10;
          // NOT_ELIGIBLE = 0, INSUFFICIENT_DATA = 5
          else if (eligibility.overallStatus === 'INSUFFICIENT_DATA') matchScore += 5;
          
          // c. Budget Match (20 pts)
          if (feeResult.estimatedPayable > 0 && userBudget > 0) {
             if (feeResult.estimatedPayable <= userBudget) matchScore += 20;
             else if (feeResult.estimatedPayable <= userBudget * 1.1) matchScore += 10; // slightly above
             else matchScore += 0; // Above
          } else {
             matchScore += 10; // Unknown fee/budget
          }
          
          // d. Career Match & e. Preferences (25 pts total - simplified)
          matchScore += 15; // Assuming baseline career alignment for now.
          
          evaluatedMatches.push({
             uni,
             course,
             eligibility,
             feeResult,
             matchScore
          });
        }
      }

      // Sort by Match Score Descending
      evaluatedMatches.sort((a, b) => b.matchScore - a.matchScore);
      const topMatches = evaluatedMatches.slice(0, 5); // Take top 5

      // 4. Prepare LLM Payload for qualitative insights (Talking points, Pros/Cons, Objection Handling)
      const leadProfile = {
        name: lead.first_name + ' ' + (lead.last_name || ''),
        age: lead.age,
        education: lead.education,
        graduationPercentage: lead.graduation_percentage,
        budget: lead.budget,
        careerGoal: lead.career_goal,
      };

      const topProfilesForLLM = topMatches.map(m => ({
        code: m.uni.code,
        universityName: m.uni.name,
        courseName: m.course.name,
        matchScore: m.matchScore,
        eligibilityStatus: m.eligibility.overallStatus,
        estimatedPayable: m.feeResult.estimatedPayable,
        isFeeFinal: m.feeResult.isFinal
      }));

      // 5. Construct Prompt for Soft Insights
      const prompt = `
You are the Edvix Principal AI Counselor.
The deterministic Recommendation Engine has already evaluated the student and found the following Top 5 Matches.

Student Profile:
${JSON.stringify(leadProfile, null, 2)}

Top Matches (Deterministic Results):
${JSON.stringify(topProfilesForLLM, null, 2)}

Your task is ONLY to generate the qualitative soft data: reasons, pros, cons, and counseling assistance talking points.

Output ONLY a valid JSON object matching this schema exactly, with NO markdown formatting around it:
{
  "topUniversities": [
    {
      "code": "string",
      "reason": "Detailed string explaining why it fits the student's career goal.",
      "pros": ["string"],
      "cons": ["string"],
      "scholarshipOpportunities": ["string"],
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

      const responseText = await LLMClient.generateJson(prompt, "You are a professional JSON output generator.", 0.2);
      
      if (!responseText) throw new Error('Empty response from AI');

      // 6. Merge Deterministic Data with LLM Insights
      const llmResult = JSON.parse(responseText);
      
      const mergedTopUniversities = topMatches.map(m => {
         const llmData = llmResult.topUniversities?.find((x: any) => x.code === m.uni.code) || {};
         return {
            code: m.uni.code,
            name: m.uni.name,
            courseName: m.course.name,
            courseId: m.course.id,
            compatibilityScore: m.matchScore, // Legacy field mapping
            matchScore: m.matchScore,
            eligibilityStatus: m.eligibility.overallStatus,
            eligibilityExplanation: m.eligibility.ruleResults.map(r => r.description).join(' | '),
            feeBreakdown: { total: m.feeResult.estimatedPayable, semester: 0, registration: 0 },
            estimatedPayable: m.feeResult.estimatedPayable,
            isFeeFinal: m.feeResult.isFinal,
            emiEstimate: FeeCalculator.calculateEmi(m.feeResult.estimatedPayable, 0, 12).emi,
            // LLM augmented fields
            reason: llmData.reason || 'Strong deterministic match.',
            pros: llmData.pros || [],
            cons: llmData.cons || [],
            scholarshipOpportunities: llmData.scholarshipOpportunities || [],
            admissionTimeline: llmData.admissionTimeline || 'Rolling',
            requiredDocuments: llmData.requiredDocuments || [],
            expectedOutcome: llmData.expectedOutcome || 'N/A'
         };
      });

      const finalResult: AIRecommendationResult = {
         topUniversities: mergedTopUniversities,
         counselorAssistance: llmResult.counselorAssistance,
         insights: llmResult.insights
      };
      
      return finalResult;

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
