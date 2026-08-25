import { Lead, ProgramEligibilityRule } from '../../types/schema';

export type EligibilityStatus = 
  | 'VERIFIED_ELIGIBLE' 
  | 'LIKELY_ELIGIBLE' 
  | 'CONDITIONAL' 
  | 'MANUAL_REVIEW' 
  | 'NOT_ELIGIBLE' 
  | 'INSUFFICIENT_DATA';

export interface RuleResult {
  ruleName: string;
  status: 'PASS' | 'FAIL' | 'MANUAL_REVIEW' | 'INSUFFICIENT_DATA' | 'CONDITIONAL';
  description: string;
}

export interface EligibilityEvaluation {
  overallStatus: EligibilityStatus;
  ruleResults: RuleResult[];
  programId: string;
}

export class EligibilityEngine {
  /**
   * Evaluate a lead's profile against a set of rules for a specific program.
   */
  static evaluate(lead: Lead, rule: ProgramEligibilityRule): EligibilityEvaluation {
    const results: RuleResult[] = [];
    const conds = rule.conditions || {};

    let hasInsufficientData = false;
    let hasFailed = false;
    let hasManualReview = false;
    let hasConditional = false;

    // 1. Education Level & Degree Check
    if (conds.requiresGraduation) {
      if (!lead.graduationDegree && lead.education !== 'Graduate' && lead.education !== 'Post Graduate') {
        if (!lead.education) {
          results.push({ ruleName: 'Graduation Degree', status: 'INSUFFICIENT_DATA', description: 'Education history is missing.' });
          hasInsufficientData = true;
        } else {
          results.push({ ruleName: 'Graduation Degree', status: 'FAIL', description: 'Requires a Bachelor\'s degree.' });
          hasFailed = true;
        }
      } else {
        results.push({ ruleName: 'Graduation Degree', status: 'PASS', description: 'Graduation requirement met.' });
      }
    }

    // 2. Minimum Percentage Check
    if (conds.minimumPercentage && conds.minimumPercentage > 0) {
      const targetPercent = conds.requiresGraduation ? lead.graduationPercentage : (lead.graduationPercentage || lead.twelfthPercentage);
      
      if (!targetPercent) {
        results.push({ 
          ruleName: 'Minimum Percentage', 
          status: 'INSUFFICIENT_DATA', 
          description: `Minimum ${conds.minimumPercentage}% required, but student score is not recorded.` 
        });
        hasInsufficientData = true;
      } else if (targetPercent >= conds.minimumPercentage) {
        results.push({ 
          ruleName: 'Minimum Percentage', 
          status: 'PASS', 
          description: `Score of ${targetPercent}% meets the ${conds.minimumPercentage}% requirement.` 
        });
      } else {
        results.push({ 
          ruleName: 'Minimum Percentage', 
          status: 'FAIL', 
          description: `Score of ${targetPercent}% is below the required ${conds.minimumPercentage}%.` 
        });
        hasFailed = true;
      }
    }

    // 3. Backlog Rules
    if (conds.checkBacklogs) {
      if (lead.graduationBacklogs === undefined) {
        results.push({ ruleName: 'Backlog Status', status: 'INSUFFICIENT_DATA', description: 'Backlog information is missing.' });
        hasInsufficientData = true;
      } else if (lead.graduationBacklogs > 0) {
        if (conds.allowedBacklogs === 0) {
          results.push({ ruleName: 'Backlog Status', status: 'FAIL', description: 'Backlogs are not allowed for this program.' });
          hasFailed = true;
        } else if (conds.allowedBacklogs >= lead.graduationBacklogs) {
          results.push({ ruleName: 'Backlog Status', status: 'PASS', description: `Student has ${lead.graduationBacklogs} backlogs, which is within the allowed limit of ${conds.allowedBacklogs}.` });
        } else if (conds.allowBacklogsWithManualReview) {
          results.push({ ruleName: 'Backlog Status', status: 'MANUAL_REVIEW', description: 'Backlogs require manual verification with the university.' });
          hasManualReview = true;
        } else {
          results.push({ ruleName: 'Backlog Status', status: 'FAIL', description: `Student has ${lead.graduationBacklogs} backlogs, exceeding allowed limit.` });
          hasFailed = true;
        }
      } else {
        results.push({ ruleName: 'Backlog Status', status: 'PASS', description: 'No backlogs reported.' });
      }
    }

    // Determine overall status based on Critical Principle
    let overallStatus: EligibilityStatus = 'VERIFIED_ELIGIBLE';

    if (hasFailed) {
      overallStatus = 'NOT_ELIGIBLE';
    } else if (hasInsufficientData) {
      overallStatus = 'INSUFFICIENT_DATA';
    } else if (hasManualReview) {
      overallStatus = 'MANUAL_REVIEW';
    } else if (hasConditional) {
      overallStatus = 'CONDITIONAL';
    } else if (results.length === 0) {
      // If there were no rules to evaluate, we can't definitively say verified eligible. 
      // But typically, active programs have some base rule.
      overallStatus = 'LIKELY_ELIGIBLE';
    }

    return {
      overallStatus,
      ruleResults: results,
      programId: rule.courseId
    };
  }
}
