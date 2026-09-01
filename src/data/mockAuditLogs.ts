import { AuditLog } from '../types/audit';

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

export let mockAuditLogs: AuditLog[] = [
  {
    id: 'AUD-001',
    action: 'Created',
    entityType: 'Lead',
    entityId: 'LD-1001',
    title: 'Lead Created',
    description: 'Lead Aarav Patel was captured from Facebook Ads.',
    userName: 'System',
    timestamp: twoDaysAgo.toISOString(),
    leadId: 'LD-1001'
  },
  {
    id: 'AUD-002',
    action: 'Status Changed',
    entityType: 'Lead',
    entityId: 'LD-1001',
    title: 'Lead Status Changed',
    description: 'Status updated from Inquiry to Cold.',
    previousValue: 'Inquiry',
    newValue: 'Cold',
    userId: 'mock-counselor-id',
    userName: 'System Counselor',
    userRole: 'Counselor',
    timestamp: twoDaysAgo.toISOString(),
    leadId: 'LD-1001'
  },
  {
    id: 'AUD-003',
    action: 'Login',
    entityType: 'User',
    entityId: 'USR-1',
    title: 'User Login',
    description: 'Successful login from desktop browser.',
    userId: 'mock-counselor-id',
    userName: 'System Counselor',
    userRole: 'Counselor',
    timestamp: yesterday.toISOString(),
    ipAddress: '192.168.1.10'
  },
  {
    id: 'AUD-004',
    action: 'Updated',
    entityType: 'Lead',
    entityId: 'LD-1002',
    title: 'Lead Updated',
    description: 'Updated preferred course for Priya Singh.',
    previousValue: 'BBA',
    newValue: 'MBA HR',
    userId: 'mock-counselor-id',
    userName: 'System Counselor',
    userRole: 'Counselor',
    timestamp: now.toISOString(),
    leadId: 'LD-1002'
  }
];

type Listener = (logs: AuditLog[]) => void;
const listeners: Listener[] = [];

export const subscribeAuditLogs = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
  const newLog: AuditLog = {
    ...log,
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString()
  };
  mockAuditLogs = [newLog, ...mockAuditLogs];
  listeners.forEach(listener => listener(mockAuditLogs));
  return newLog;
};
