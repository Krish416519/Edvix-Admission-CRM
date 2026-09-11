import { Call } from '../types/telephony';
import { CallFilterState, CounselorUser } from '../types/callFilter';

export function matchCallFilters(
  call: Call,
  filters: CallFilterState,
  userMap: Map<string, CounselorUser>,
  currentUserId?: string
): boolean {
  // 1. Search Query & Scope
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const cleanPhoneQuery = q.replace(/[^0-9]/g, '');

    const leadName = (call.leadName || '').toLowerCase();
    const leadPhone = (call.leadPhone || '').toLowerCase();
    const cleanLeadPhone = leadPhone.replace(/[^0-9]/g, '');
    const counselorUser = call.counselorId ? userMap.get(call.counselorId) : null;
    const counselorName = (call.counselorName || counselorUser?.name || '').toLowerCase();
    const outcome = (call.outcome || '').toLowerCase();
    const notes = (call.notes || '').toLowerCase();
    const transcript = (call.transcript || '').toLowerCase();

    if (filters.searchField === 'phone') {
      const matchRaw = leadPhone.includes(q);
      const matchClean = cleanPhoneQuery.length >= 3 && cleanLeadPhone.includes(cleanPhoneQuery);
      if (!matchRaw && !matchClean) return false;
    } else if (filters.searchField === 'lead') {
      if (!leadName.includes(q)) return false;
    } else if (filters.searchField === 'counselor') {
      if (!counselorName.includes(q)) return false;
    } else {
      // 'all'
      const matchLead = leadName.includes(q);
      const matchPhone = leadPhone.includes(q) || (cleanPhoneQuery.length >= 3 && cleanLeadPhone.includes(cleanPhoneQuery));
      const matchCounselor = counselorName.includes(q);
      const matchOutcome = outcome.includes(q);
      const matchNotes = notes.includes(q);
      const matchTranscript = transcript.includes(q);

      if (!matchLead && !matchPhone && !matchCounselor && !matchOutcome && !matchNotes && !matchTranscript) {
        return false;
      }
    }
  }

  // 2. Counselor / User
  if (filters.counselorId !== 'all') {
    if (filters.counselorId === 'me') {
      if (currentUserId && call.counselorId !== currentUserId) {
        return false;
      }
    } else {
      if (call.counselorId !== filters.counselorId) {
        return false;
      }
    }
  }

  // 3. Designation-wise filter
  if (filters.designationId !== 'all') {
    const counselorUser = call.counselorId ? userMap.get(call.counselorId) : null;
    if (!counselorUser || counselorUser.designationId !== filters.designationId) {
      return false;
    }
  }

  // 4. Direction
  if (filters.direction !== 'all') {
    if (call.direction !== filters.direction) {
      return false;
    }
  }

  // 5. Statuses
  if (filters.statuses.length > 0) {
    if (!filters.statuses.includes(call.status)) {
      return false;
    }
  }

  // 6. Outcomes / Dispositions
  if (filters.outcomes.length > 0) {
    const callOutcome = (call.outcome || '').toLowerCase();
    const match = filters.outcomes.some(o => callOutcome.includes(o.toLowerCase()));
    if (!match) return false;
  }

  // 7. Sentiment
  if (filters.sentiment !== 'all') {
    const callSentiment = (call.aiSentiment || '').toLowerCase();
    if (callSentiment !== filters.sentiment) {
      return false;
    }
  }

  // 8. Duration
  if (filters.durationPreset !== 'all') {
    const dur = call.durationSeconds || 0;
    if (filters.durationPreset === 'under_1m' && dur >= 60) return false;
    if (filters.durationPreset === '1_to_5m' && (dur < 60 || dur > 300)) return false;
    if (filters.durationPreset === '5_to_15m' && (dur < 300 || dur > 900)) return false;
    if (filters.durationPreset === 'over_15m' && dur <= 900) return false;
  }

  // 9. Dates
  const callDate = new Date(call.createdAt);
  const now = new Date();

  if (filters.datePreset === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (callDate < startOfToday) return false;
  } else if (filters.datePreset === 'yesterday') {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (callDate < startOfYesterday || callDate >= endOfYesterday) return false;
  } else if (filters.datePreset === 'last_7_days') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (callDate < sevenDaysAgo) return false;
  } else if (filters.datePreset === 'last_30_days') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (callDate < thirtyDaysAgo) return false;
  } else if (filters.datePreset === 'custom') {
    if (filters.customStartDate) {
      const from = new Date(filters.customStartDate);
      if (callDate < from) return false;
    }
    if (filters.customEndDate) {
      const to = new Date(filters.customEndDate);
      to.setHours(23, 59, 59, 999);
      if (callDate > to) return false;
    }
  }

  // 10. Flags
  if (filters.hasRecording && !call.recordingUrl) return false;
  if (filters.hasAiSummary && (!call.aiSummary || call.aiSummary.trim().length === 0)) return false;
  if (filters.hasObjections && (!call.aiObjections || call.aiObjections.length === 0)) return false;
  if (filters.hasFollowUp && !call.nextFollowUp) return false;

  return true;
}
