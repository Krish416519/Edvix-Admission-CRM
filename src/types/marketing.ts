export type CampaignStatus = 'Active' | 'Paused' | 'Draft' | 'Completed' | 'Archived';
export type CampaignPlatform = 'Google Ads' | 'Meta Ads' | 'Instagram' | 'LinkedIn' | 'YouTube' | 'Website' | 'Organic SEO' | 'Referral' | 'Partner' | 'Offline';
export type CampaignType = 'Lead Generation' | 'Brand Awareness' | 'Retargeting' | 'Email Nurture' | 'WhatsApp Blast';

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  platform: CampaignPlatform;
  budget: number;
  spend: number;
  startDate: string;
  endDate?: string;
  status: CampaignStatus;
  owner: string;
  goal: string;
  utm: UTMParameters;
  metrics: {
    impressions: number;
    clicks: number;
    leadsGenerated: number;
    admissions: number;
    revenue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NurturingJourney {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Paused';
  trigger: string;
  enrolled: number;
  completed: number;
  conversionRate: number;
  steps: JourneyStep[];
  createdAt: string;
  updatedAt: string;
}

export interface JourneyStep {
  id: string;
  type: 'Email' | 'WhatsApp' | 'Delay' | 'Assign' | 'Condition';
  name: string;
  config: any;
}
