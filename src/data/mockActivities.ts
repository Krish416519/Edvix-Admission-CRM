import { Activity } from '../types/activity';

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

export const mockActivities: Activity[] = [
  {
    id: 'ACT-001',
    leadId: 'LD-1001',
    type: 'lead_created',
    content: 'Lead captured from Facebook Ads campaign.',
    date: threeDaysAgo.toISOString(),
    author: 'System'
  },
  {
    id: 'ACT-002',
    leadId: 'LD-1001',
    type: 'status_change',
    content: 'Status changed from Inquiry to Cold.',
    date: threeDaysAgo.toISOString(),
    author: 'System Counselor',
    metadata: {
      oldStatus: 'Inquiry',
      newStatus: 'Cold'
    }
  },
  {
    id: 'ACT-003',
    leadId: 'LD-1001',
    type: 'call',
    content: 'Outbound call - Connected. Discussed admission requirements and timeline.',
    duration: '5m 20s',
    date: twoDaysAgo.toISOString(),
    author: 'System Counselor',
    status: 'Completed'
  },
  {
    id: 'ACT-004',
    leadId: 'LD-1001',
    type: 'status_change',
    content: 'Status changed from Cold to Warm.',
    date: twoDaysAgo.toISOString(),
    author: 'System Counselor',
    metadata: {
      oldStatus: 'Cold',
      newStatus: 'Warm'
    }
  },
  {
    id: 'ACT-005',
    leadId: 'LD-1001',
    type: 'whatsapp',
    content: 'Sent brochure for Amity University and placement records.',
    date: twoDaysAgo.toISOString(),
    author: 'System Counselor'
  },
  {
    id: 'ACT-006',
    leadId: 'LD-1001',
    type: 'email',
    content: 'Follow up on application status and requested missing documents.',
    subject: 'Application Next Steps',
    date: yesterday.toISOString(),
    author: 'System Counselor'
  },
  {
    id: 'ACT-007',
    leadId: 'LD-1001',
    type: 'note',
    content: 'Student is very interested in the CSE program. Will discuss with parents about the fee structure.',
    date: yesterday.toISOString(),
    author: 'System Counselor'
  },
  {
    id: 'ACT-008',
    leadId: 'LD-1001',
    type: 'task',
    content: 'Collect 12th marksheet from student.',
    date: now.toISOString(),
    author: 'System Counselor',
    status: 'Pending',
    dueDate: new Date(now.getTime() + 86400000).toISOString()
  }
];
