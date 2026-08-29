import { Lead, LeadActivity } from '../types/schema';

// Helper to simulate network delay for AI streaming effect
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AIInsights {
  summary: string;
  conversionProbability: number;
  conversionStatus: 'Cold' | 'Warm' | 'Hot' | 'Ready to Convert';
  nextBestAction: string;
  recommendedFollowUpTime: string;
  riskAlerts: string[];
}

export const aiService = {
  async generateLeadInsights(lead: Lead, activities: LeadActivity[]): Promise<AIInsights> {
    // In a real scenario, this would call the Gemini API. 
    // Here we use intelligent rule-based generation to simulate the AI.
    
    await delay(600); // Simulate AI thinking time

    // Calculate dynamic conversion score
     let score = 30; // base score
    if (lead.status === 'Hot' || lead.status === 'Qualified') score += 20;
    if (lead.status === 'Application') score += 35;
    if (lead.status === 'Docs Pending') score += 45;
    if (lead.status === 'Admitted') score = 100;
    
    // Boost based on activities
    const recentActivityCount = activities.filter(a => a.createdAt && new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    score += Math.min(recentActivityCount * 5, 20);

    // Penalize if no recent follow up
    if (lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date()) {
      score -= 15;
    }

    score = Math.max(0, Math.min(100, score));

    let status: AIInsights['conversionStatus'] = 'Cold';
    if (score >= 85) status = 'Ready to Convert';
    else if (score >= 60) status = 'Hot';
    else if (score >= 40) status = 'Warm';

    // Generate Summary
    const summary = `Student is interested in ${lead.course || 'a program'}. Preferred university: ${lead.university || 'Not specified'}. ${
      lead.status === 'Docs Pending' ? 'Currently waiting for documents.' : ''
    } Last contacted: ${activities.length > 0 && activities[0].createdAt ? new Date(activities[0].createdAt).toLocaleDateString() : 'Never'}.`;

    // Next best action
    let nextBestAction = 'Send introduction email and brochure.';
    if (lead.status === 'Cold' || lead.status === 'Inquiry') nextBestAction = 'Call today to qualify the lead.';
    else if (lead.status === 'Hot' || lead.status === 'Interested') nextBestAction = 'Share scholarship details and discuss EMI options.';
    else if (lead.status === 'Application') nextBestAction = 'Assist with application form completion.';
    else if (lead.status === 'Docs Pending') nextBestAction = 'Request pending documents (Marksheet/ID).';
    else if (lead.status === 'Admitted') nextBestAction = 'Send welcome kit and onboarding details.';

    // Risk Alerts
    const riskAlerts: string[] = [];
    if (lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date()) {
      riskAlerts.push('No follow-up for 3 days');
    }
    if (lead.status === 'Docs Pending' && score < 70) {
      riskAlerts.push('Documents pending too long');
    }
    if (score >= 80 && lead.status !== 'Admitted' && recentActivityCount === 0) {
      riskAlerts.push('High-value lead ignored');
    }

    // Recommended Follow-up Time
    let recommendedFollowUpTime = 'Today at 4:00 PM';
    if (lead.status === 'Qualified') recommendedFollowUpTime = 'Tomorrow morning';
    if (lead.status === 'Docs Pending') recommendedFollowUpTime = 'In 2 days';

    return {
      summary,
      conversionProbability: score,
      conversionStatus: status,
      nextBestAction,
      recommendedFollowUpTime,
      riskAlerts
    };
  },

  async generateFollowUpMessage(lead: Lead, type: 'WhatsApp' | 'Email' | 'SMS' | 'Call Script'): Promise<string> {
    await delay(800); // Simulate API latency
    
    const uni = lead.university || 'the university';
    const course = lead.course || 'your preferred course';
    
    switch (type) {
      case 'WhatsApp':
        return `Hi ${lead.name},\n\nHope you're doing well! I'm reaching out regarding your admission process for ${course} at ${uni}. \n\nYou are currently at the '${lead.status}' stage. Let me know if you need any help with scholarships or pending documents.\n\nBest,\nYour Counselor`;
      case 'Email':
        return `Subject: Update on your admission for ${course}\n\nDear ${lead.name},\n\nWe noticed that your application for ${course} at ${uni} is currently marked as '${lead.status}'.\n\nPlease let us know if you need assistance with EMI options, or completing any pending steps.\n\nWarm regards,\nEdvix Admissions Team`;
      case 'SMS':
        return `Hi ${lead.name}, reminder regarding your admission for ${course} at ${uni}. Please complete your pending steps. Reply for help!`;
      case 'Call Script':
        return `Opening: "Hello ${lead.name}, this is your counselor from Edvix. I'm calling about your interest in the ${course} at ${uni}..."\n\nKey Points to discuss:\n- Current stage is ${lead.status}\n- Address any scholarship or EMI queries\n- Ask for pending documents if any.`;
    }
  },

  getObjectionHandlingReplies(): { objection: string; reply: string }[] {
    return [
      { objection: 'Fees are high', reply: 'I understand budget is a concern. We have tied up with multiple finance partners for 0% EMI options. Additionally, based on your profile, you might be eligible for a scholarship up to 20%.' },
      { objection: 'Need more time', reply: 'Take your time, but keep in mind that the current batch is filling up fast and the early bird scholarship expires in 3 days. Can I block a tentative seat for you?' },
      { objection: 'Parents not convinced', reply: 'I completely understand. Choosing a career path is a family decision. Would you like me to schedule a counseling session with your parents to address their concerns?' },
      { objection: 'Placement concerns', reply: 'This university has a stellar placement record of 92% for this course, with top recruiters like TCS, Infosys, and Wipro. The average package is around 6 LPA.' },
      { objection: 'UGC / DEB approval', reply: 'Rest assured, all the universities we partner with are 100% UGC-entitled and DEB approved for online and distance education.' }
    ];
  }
};
