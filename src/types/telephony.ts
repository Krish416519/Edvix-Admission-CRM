export type TelephonyProviderType = 'Twilio' | 'Exotel' | 'Knowlarity' | 'MyOperator' | 'CloudTalk' | 'CustomSIP';

export interface TelephonyProvider {
  id: string;
  name: string;
  providerType: TelephonyProviderType;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'missed' | 'failed' | 'voicemail' | 'busy' | 'no-answer';
export type CallDirection = 'inbound' | 'outbound';
export type CallEventType = 'initiated' | 'ringing' | 'answered' | 'hold' | 'unhold' | 'mute' | 'unmute' | 'transfer' | 'conference_join' | 'conference_leave' | 'disconnect' | 'failed';
export type RecordingAccessLevel = 'admin' | 'manager' | 'counselor' | 'all';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Call {
  id: string;
  leadId: string;
  counselorId: string;
  providerId?: string;
  providerCallId?: string;
  direction: CallDirection;
  status: CallStatus;
  durationSeconds: number;
  recordingUrl?: string;
  
  // Lead / Counselor info (denormalized for display)
  leadName?: string;
  leadPhone?: string;
  counselorName?: string;
  
  // Outcome & Logging
  outcome?: string;
  notes?: string;
  tags?: string[];
  nextFollowUp?: string;
  
  // AI Fields
  transcript?: string;
  aiSummary?: string;
  aiSentiment?: string;
  aiObjections?: string[];
  aiActionItems?: string[];
  aiRecommendedNextSteps?: string[];
  aiFollowUpEmail?: string;
  aiWhatsappMessage?: string;
  aiLeadScoreDelta?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CallEvent {
  id: string;
  callId: string;
  eventType: CallEventType;
  eventData: Record<string, any>;
  performedBy?: string;
  createdAt: string;
}

export interface CallRecording {
  id: string;
  callId: string;
  recordingUrl: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  isEncrypted: boolean;
  accessLevel: RecordingAccessLevel;
  transcriptionStatus: TranscriptionStatus;
  createdAt: string;
}

export interface CallAuditEntry {
  id: string;
  callId?: string;
  userId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// --- Stats & Report Types ---

export interface CallCenterStats {
  activeCalls: number;
  totalToday: number;
  totalYesterday: number;
  missedToday: number;
  completedToday: number;
  avgDurationSeconds: number;
  totalDurationSeconds: number;
  inboundToday: number;
  outboundToday: number;
}

export interface CounselorCallStats {
  counselorId: string;
  counselorName: string;
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  connectionRate: number;
}

export interface CallReportData {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  failedCalls: number;
  avgDuration: number;
  connectionRate: number;
  sentimentDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  dailyCallVolume: { date: string; count: number }[];
}

// --- Call Outcome Options ---
export const CALL_OUTCOMES = [
  'Interested',
  'Not Interested',
  'Call Back Later',
  'Voicemail',
  'No Answer',
  'Wrong Number',
  'Documents Discussed',
  'Fee Discussed',
  'Scholarship Inquiry',
  'Application Started',
  'Admission Confirmed',
] as const;

export const CALL_TAGS = [
  'Hot Lead',
  'Fee Concern',
  'Documents Pending',
  'Parent Involved',
  'Scholarship',
  'EMI Required',
  'University Query',
  'Course Change',
  'Callback Requested',
  'Escalation',
] as const;

export type CallOutcome = typeof CALL_OUTCOMES[number];
export type CallTag = typeof CALL_TAGS[number];
