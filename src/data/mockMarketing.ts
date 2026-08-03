import { Campaign, NurturingJourney } from '../types/marketing';
import { subDays, addDays } from 'date-fns';

const now = new Date();

export const mockCampaigns: Campaign[] = [
  {
    id: 'CMP-1001',
    name: 'Fall 2026 MBA Admissions',
    type: 'Lead Generation',
    platform: 'Meta Ads',
    budget: 150000,
    spend: 45000,
    startDate: subDays(now, 15).toISOString(),
    endDate: addDays(now, 45).toISOString(),
    status: 'Active',
    owner: 'Priya Singh (Marketing Head)',
    goal: '100 Admissions',
    utm: { source: 'facebook', medium: 'cpc', campaign: 'fall_2026_mba' },
    metrics: {
      impressions: 450000,
      clicks: 12500,
      leadsGenerated: 850,
      admissions: 42,
      revenue: 21000000
    },
    createdAt: subDays(now, 16).toISOString(),
    updatedAt: subDays(now, 1).toISOString()
  },
  {
    id: 'CMP-1002',
    name: 'B.Tech Search Intent',
    type: 'Lead Generation',
    platform: 'Google Ads',
    budget: 250000,
    spend: 180000,
    startDate: subDays(now, 45).toISOString(),
    endDate: addDays(now, 15).toISOString(),
    status: 'Active',
    owner: 'Rahul Sharma',
    goal: '250 Admissions',
    utm: { source: 'google', medium: 'search', campaign: 'btech_intent' },
    metrics: {
      impressions: 120000,
      clicks: 8400,
      leadsGenerated: 1200,
      admissions: 110,
      revenue: 88000000
    },
    createdAt: subDays(now, 50).toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: 'CMP-1003',
    name: 'Organic SEO - Law Programs',
    type: 'Brand Awareness',
    platform: 'Organic SEO',
    budget: 0,
    spend: 0,
    startDate: subDays(now, 180).toISOString(),
    status: 'Active',
    owner: 'SEO Team',
    goal: 'Top 3 Ranking for Law keywords',
    utm: { source: 'organic', medium: 'seo' },
    metrics: {
      impressions: 800000,
      clicks: 45000,
      leadsGenerated: 3200,
      admissions: 85,
      revenue: 42500000
    },
    createdAt: subDays(now, 180).toISOString(),
    updatedAt: subDays(now, 2).toISOString()
  },
  {
    id: 'CMP-1004',
    name: 'Drop-off Retargeting',
    type: 'Retargeting',
    platform: 'Instagram',
    budget: 50000,
    spend: 12000,
    startDate: subDays(now, 5).toISOString(),
    endDate: addDays(now, 25).toISOString(),
    status: 'Active',
    owner: 'Priya Singh',
    goal: 'Convert pending applications',
    utm: { source: 'instagram', medium: 'cpc', campaign: 'retargeting_dropoffs' },
    metrics: {
      impressions: 50000,
      clicks: 1200,
      leadsGenerated: 85,
      admissions: 12,
      revenue: 6000000
    },
    createdAt: subDays(now, 7).toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: 'CMP-1005',
    name: 'Winter Batch WhatsApp Blast',
    type: 'WhatsApp Blast',
    platform: 'Offline', // technically internal DB broadcast
    budget: 5000,
    spend: 2500,
    startDate: subDays(now, 2).toISOString(),
    status: 'Completed',
    owner: 'Rahul Sharma',
    goal: 'Re-engage old leads',
    utm: { source: 'whatsapp', medium: 'broadcast', campaign: 'winter_batch_blast' },
    metrics: {
      impressions: 10000,
      clicks: 850,
      leadsGenerated: 120,
      admissions: 5,
      revenue: 1500000
    },
    createdAt: subDays(now, 4).toISOString(),
    updatedAt: subDays(now, 2).toISOString()
  }
];

export const mockJourneys: NurturingJourney[] = [
  {
    id: 'JNY-001',
    name: 'New Lead Welcome Sequence',
    status: 'Active',
    trigger: 'Lead Created',
    enrolled: 4500,
    completed: 4100,
    conversionRate: 15.2,
    createdAt: subDays(now, 60).toISOString(),
    updatedAt: subDays(now, 10).toISOString(),
    steps: [
      { id: 's1', type: 'WhatsApp', name: 'Welcome Message & E-Brochure', config: {} },
      { id: 's2', type: 'Delay', name: 'Wait 1 Day', config: { duration: '24h' } },
      { id: 's3', type: 'Email', name: 'University Infrastructure Tour', config: {} },
      { id: 's4', type: 'Assign', name: 'Assign to Counselor', config: {} }
    ]
  },
  {
    id: 'JNY-002',
    name: 'Fee Payment Reminder',
    status: 'Active',
    trigger: 'Stage = Fee Pending',
    enrolled: 850,
    completed: 600,
    conversionRate: 42.8,
    createdAt: subDays(now, 90).toISOString(),
    updatedAt: subDays(now, 5).toISOString(),
    steps: [
      { id: 's1', type: 'Email', name: 'Fee Invoice & Payment Link', config: {} },
      { id: 's2', type: 'Delay', name: 'Wait 3 Days', config: { duration: '72h' } },
      { id: 's3', type: 'Condition', name: 'If Not Paid', config: {} },
      { id: 's4', type: 'WhatsApp', name: 'Urgent Payment Reminder', config: {} }
    ]
  }
];
