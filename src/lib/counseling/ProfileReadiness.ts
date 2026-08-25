import { Lead, ProgramEligibilityRule } from '../../types/schema';

export interface ReadinessResult {
  isReady: boolean;
  missingRequiredFields: string[];
  missingOptionalFields: string[];
  completenessPercentage: number;
}

export class ProfileReadiness {
  /**
   * Checks if a lead has the required fields to be evaluated against a specific rule set.
   * If no rule is provided, it checks general academic completeness.
   */
  static evaluate(lead: Lead, rules?: ProgramEligibilityRule[]): ReadinessResult {
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];
    
    // Core fields always required for any meaningful matching
    if (!lead.education) missingRequired.push('Highest Education Level');
    if (!lead.careerGoal) missingOptional.push('Career Goal');
    if (!lead.budget) missingOptional.push('Budget Preference');
    
    // If rules are provided, we check specific conditions
    // Assuming conditions JSON structure like { requiredDegree: true, minimumPercentage: 50, checkBacklogs: true }
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const conds = rule.conditions || {};
        
        if (conds.requiresGraduation && !lead.graduationDegree) {
          if (!missingRequired.includes('Graduation Degree')) missingRequired.push('Graduation Degree');
        }
        
        if (conds.minimumPercentage && conds.minimumPercentage > 0) {
          // Check percentage based on their highest education
          if (conds.requiresGraduation && !lead.graduationPercentage) {
            if (!missingRequired.includes('Graduation Percentage')) missingRequired.push('Graduation Percentage');
          } else if (!conds.requiresGraduation && !lead.twelfthPercentage && !lead.graduationPercentage) {
             if (!missingRequired.includes('12th or Graduation Percentage')) missingRequired.push('12th or Graduation Percentage');
          }
        }
        
        if (conds.checkBacklogs && lead.graduationBacklogs === undefined) {
           if (!missingRequired.includes('Backlog Status')) missingRequired.push('Backlog Status');
        }
      }
    } else {
      // General heuristic if no specific rules are provided
      if (lead.education && ['Graduate', 'Post Graduate'].includes(lead.education)) {
        if (!lead.graduationPercentage) missingRequired.push('Graduation Percentage');
        if (lead.graduationBacklogs === undefined) missingRequired.push('Backlog Status');
      } else if (lead.education && ['12th Pass'].includes(lead.education)) {
        if (!lead.twelfthPercentage) missingRequired.push('12th Percentage');
      }
    }

    // Professional info
    if (lead.currentOccupation === 'Working Professional' && !lead.yearsOfExperience) {
      missingOptional.push('Years of Experience');
    }

    // Calculate generic completeness percentage
    // Let's assume a basic set of 10 fields for a 100% profile
    const coreFields = [
      lead.firstName,
      lead.email,
      lead.phone,
      lead.education,
      lead.graduationPercentage || lead.twelfthPercentage,
      lead.careerGoal,
      lead.budget,
      lead.city,
      lead.course || lead.preferredSpecialization,
      lead.urgency
    ];
    
    const filledFields = coreFields.filter(f => f !== undefined && f !== null && f !== '').length;
    const completenessPercentage = Math.round((filledFields / coreFields.length) * 100);

    return {
      isReady: missingRequired.length === 0,
      missingRequiredFields: missingRequired,
      missingOptionalFields: missingOptional,
      completenessPercentage
    };
  }
}
