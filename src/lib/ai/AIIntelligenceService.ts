import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type {
  AIRecommendation,
  AIRecommendationType,
  AIRecommendationPriority,
  AIRecommendationStatus,
  AILeadScore,
  AINextBestAction,
  AIFollowUpIntelligence,
  AIAnomaly,
  AIDataQualityIssue,
  AICallPreparation,
  AIConversionInsight,
} from '../../types/ai-intelligence';

function uuid(): string {
  return crypto.randomUUID();
}

function generateId(): string {
  return uuid();
}

export interface CreateRecommendationInput {
  type: AIRecommendationType;
  priority: AIRecommendationPriority;
  title: string;
  message: string;
  entityType?: 'lead' | 'student' | 'partner' | 'university' | 'payment' | 'admission';
  entityId?: string;
  entityName?: string;
  reason?: string;
  evidence?: string;
  suggestedAction?: string;
  confidence?: 'high' | 'medium' | 'low';
  ownerId?: string;
}

export const AIIntelligenceService = {
  async createRecommendation(input: CreateRecommendationInput): Promise<AIRecommendation> {
    const recommendation: AIRecommendation = {
      id: generateId(),
      ...input,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('ai_recommendations').insert({
      id: recommendation.id,
      type: recommendation.type,
      priority: recommendation.priority,
      title: recommendation.title,
      message: recommendation.message,
      entity_type: recommendation.entityType,
      entity_id: recommendation.entityId,
      entity_name: recommendation.entityName,
      reason: recommendation.reason,
      evidence: recommendation.evidence,
      suggested_action: recommendation.suggestedAction,
      confidence: recommendation.confidence,
      status: recommendation.status,
      owner_id: recommendation.ownerId,
      created_at: recommendation.createdAt,
    });

    if (error) {
      logger.error('Failed to create AI recommendation:', error);
      throw error;
    }

    return recommendation;
  },

  async getRecommendations(filters?: {
    status?: AIRecommendationStatus;
    type?: AIRecommendationType;
    priority?: AIRecommendationPriority;
    ownerId?: string;
    limit?: number;
  }): Promise<AIRecommendation[]> {
    let query = supabase
      .from('ai_recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.ownerId) query = query.eq('owner_id', filters.ownerId);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
      logger.error('Failed to fetch AI recommendations:', error);
      return [];
    }

    return (data || []).map(mapDbToRecommendation);
  },

  async updateRecommendationStatus(
    id: string,
    status: AIRecommendationStatus,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'viewed') updateData.viewed_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    if (status === 'rejected' || status === 'accepted') updateData.dismissed_at = new Date().toISOString();

    const { error } = await supabase
      .from('ai_recommendations')
      .update(updateData)
      .eq('id', id);

    if (error) {
      logger.error('Failed to update recommendation status:', error);
    }
  },

  async getLeadScore(leadId: string): Promise<AILeadScore | null> {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, lead_score, conversion_probability, temperature, drop_off_risk')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      logger.error('Failed to fetch lead score:', error);
      return null;
    }

    const factors: string[] = [];
    if (lead.conversion_probability && lead.conversion_probability > 0.7) factors.push('High conversion probability');
    if (lead.temperature === 'Hot') factors.push('Hot lead temperature');
    if (lead.drop_off_risk === 'High') factors.push('High drop-off risk');

    return {
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
      score: lead.lead_score || 0,
      topFactors: factors,
      confidence: lead.conversion_probability && lead.conversion_probability > 0.6 ? 'high' : lead.conversion_probability && lead.conversion_probability > 0.3 ? 'medium' : 'low',
      temperature: lead.temperature as 'Hot' | 'Warm' | 'Cold' | undefined,
      conversionProbability: lead.conversion_probability,
      dropOffRisk: lead.drop_off_risk as 'Low' | 'Medium' | 'High' | undefined,
      lastUpdated: new Date().toISOString(),
    };
  },

  async getNextBestActions(limit = 10): Promise<AINextBestAction[]> {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, ai_suggested_next_action, lead_score, drop_off_risk, lead_status')
      .in('lead_status', ['Qualified', 'Interested', 'Connected'])
      .order('lead_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch next best actions:', error);
      return [];
    }

    return (leads || []).map((lead) => {
      const action = mapAction(lead.ai_suggested_next_action);
      return {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
        action: action.type,
        actionLabel: action.label,
        reason: lead.ai_suggested_next_action || 'High priority lead requiring attention',
        priority: lead.drop_off_risk === 'High' ? 'high' : lead.lead_score && lead.lead_score > 70 ? 'high' : 'medium',
        confidence: lead.lead_score && lead.lead_score > 60 ? 'high' : 'medium',
      };
    });
  },

  async getFollowUpIntelligence(limit = 20): Promise<AIFollowUpIntelligence[]> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, next_action_date, lead_status, drop_off_risk')
       .in('lead_status', ['Qualified', 'Hot', 'Warm'])
      .order('next_action_date', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch follow-up intelligence:', error);
      return [];
    }

    return (leads || []).map((lead) => {
      const lastContact = lead.next_action_date ? new Date(lead.next_action_date) : null;
      const daysSince = lastContact ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const isOverdue = lastContact ? lastContact < new Date() : true;

      return {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
        lastContactDate: lead.next_action_date,
        daysSinceContact: daysSince,
        isOverdue,
        riskLevel: lead.drop_off_risk === 'High' || daysSince > 7 ? 'High' : daysSince > 3 ? 'Medium' : 'Low',
        suggestedAction: isOverdue ? 'Send follow-up message' : 'Schedule check-in call',
        reason: isOverdue ? `No contact for ${daysSince} days` : 'Regular follow-up due',
      };
    });
  },

  async getAnomalies(): Promise<AIAnomaly[]> {
    const { data, error } = await supabase
      .from('ai_anomalies')
      .select('*')
      .eq('resolved', false)
      .order('detected_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Failed to fetch anomalies:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      typeLabel: row.type_label,
      description: row.description,
      severity: row.severity,
      detectedAt: row.detected_at,
      expectedRange: row.expected_range,
      actualValue: row.actual_value,
      resolved: row.resolved,
    }));
  },

  async getDataQualityIssues(limit = 20): Promise<AIDataQualityIssue[]> {
    const issues: AIDataQualityIssue[] = [];
    const now = new Date().toISOString();

    const { data: duplicateLeads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, phone, email')
      .not('phone', 'is', null)
      .limit(100);

    if (duplicateLeads) {
      const phoneMap = new Map<string, typeof duplicateLeads>();
      for (const lead of duplicateLeads) {
        if (!lead.phone) continue;
        const existing = phoneMap.get(lead.phone);
        if (existing && existing.length > 0) {
          issues.push({
            id: generateId(),
            issueType: 'duplicate',
            entityType: 'lead',
            entityId: lead.id,
            entityName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
            issue: 'Duplicate phone number detected',
            evidence: `Phone ${lead.phone} shared with ${existing.length} other lead(s)`,
            suggestedResolution: 'Review and merge duplicate records',
            severity: 'Medium',
            createdAt: now,
          });
        } else {
          phoneMap.set(lead.phone, [lead]);
        }
      }
    }

    const { data: incompleteApps } = await supabase
      .from('admissions')
      .select('id, lead_id, status')
      .eq('status', 'Documents Pending')
      .limit(20);

    if (incompleteApps) {
      for (const app of incompleteApps) {
        issues.push({
          id: generateId(),
          issueType: 'incomplete_application',
          entityType: 'application',
          entityId: app.id,
          issue: 'Application pending documents',
          evidence: `Admission ${app.id} has been pending documents`,
          suggestedResolution: 'Contact student for missing documents',
          severity: 'Low',
          createdAt: now,
        });
      }
    }

    return issues.slice(0, limit);
  },

  async getCallPreparation(leadId: string): Promise<AICallPreparation | null> {
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, lead_status, ai_summary,
        ai_suggested_next_action
      `)
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      logger.error('Failed to fetch call preparation:', error);
      return null;
    }

    const { data: communications } = await supabase
      .from('lead_activities')
      .select('content, type, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
      summary: lead.ai_summary || `Lead is in ${lead.lead_status} stage`,
      intent: lead.ai_suggested_next_action,
      previousCommunication: (communications || []).map((c) => c.content),
      interestedPrograms: lead.ai_suggested_next_action ? [lead.ai_suggested_next_action] : [],
      interestedUniversities: [],
      objections: [],
      pendingActions: lead.ai_suggested_next_action ? [lead.ai_suggested_next_action] : [],
      suggestedTalkingPoints: [
        'Ask about their preferred learning mode',
        'Discuss career goals and program fit',
        'Address any concerns about fees or duration',
      ],
      missingInfo: !lead.ai_suggested_next_action ? ['Next action'] : [],
    };
  },

  async getConversionInsights(): Promise<AIConversionInsight[]> {
    const insights: AIConversionInsight[] = [];

    const { data: sourceData } = await supabase
      .rpc('get_bi_source_performance');

    if (sourceData && Array.isArray(sourceData)) {
      for (const item of sourceData.slice(0, 5)) {
        insights.push({
          metric: item.source || 'Unknown',
          value: item.conversion_rate || 0,
          insight: `${item.source}: ${item.conversion_rate || 0}% conversion rate`,
          category: 'source',
        });
      }
    }

    const { data: counselorData } = await supabase
      .rpc('get_bi_counselor_performance');

    if (counselorData && Array.isArray(counselorData)) {
      for (const item of counselorData.slice(0, 5)) {
        insights.push({
          metric: item.counselor_name || 'Unknown',
          value: item.conversion_rate || 0,
          insight: `${item.counselor_name}: ${item.conversion_rate || 0}% conversion`,
          category: 'counseler',
        });
      }
    }

    return insights;
  },

  async trackFeedback(recommendationId: string, userId: string, rating: 'helpful' | 'not_helpful' | 'incorrect' | 'irrelevant', comment?: string): Promise<void> {
    const { error } = await supabase.from('ai_feedback').insert({
      recommendation_id: recommendationId,
      user_id: userId,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to track AI feedback:', error);
    }
  },

  async getStats(): Promise<{
    totalRecommendations: number;
    newRecommendations: number;
    acceptedRecommendations: number;
    activeAnomalies: number;
    dataQualityIssues: number;
  }> {
    const { count: totalRecs } = await supabase
      .from('ai_recommendations')
      .select('*', { count: 'exact', head: true });

    const { count: newRecs } = await supabase
      .from('ai_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    const { count: acceptedRecs } = await supabase
      .from('ai_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');

    const { count: activeAnomalies } = await supabase
      .from('ai_anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    return {
      totalRecommendations: totalRecs || 0,
      newRecommendations: newRecs || 0,
      acceptedRecommendations: acceptedRecs || 0,
      activeAnomalies: activeAnomalies || 0,
      dataQualityIssues: 0,
    };
  },
};

function mapDbToRecommendation(row: Record<string, unknown>): AIRecommendation {
  return {
    id: row.id as string,
    type: row.type as AIRecommendationType,
    priority: row.priority as AIRecommendationPriority,
    title: row.title as string,
    message: row.message as string,
    entityType: row.entity_type as AIRecommendation['entityType'],
    entityId: row.entity_id as string,
    entityName: row.entity_name as string,
    reason: row.reason as string,
    evidence: row.evidence as string,
    suggestedAction: row.suggested_action as string,
    confidence: row.confidence as AIRecommendation['confidence'],
    status: row.status as AIRecommendationStatus,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    viewedAt: row.viewed_at as string,
    completedAt: row.completed_at as string,
    dismissedAt: row.dismissed_at as string,
  };
}

function mapAction(action: string | null): { type: AINextBestAction['action']; label: string } {
  if (!action) return { type: 'call', label: 'Call' };

  const lower = action.toLowerCase();
  if (lower.includes('whatsapp')) return { type: 'whatsapp', label: 'WhatsApp' };
  if (lower.includes('email')) return { type: 'email', label: 'Email' };
  if (lower.includes('follow')) return { type: 'follow_up', label: 'Follow Up' };
  if (lower.includes('schedule') || lower.includes('meeting')) return { type: 'schedule_meeting', label: 'Schedule Meeting' };
  if (lower.includes('document')) return { type: 'request_documents', label: 'Request Documents' };
  if (lower.includes('application')) return { type: 'create_application', label: 'Create Application' };
  if (lower.includes('escalate')) return { type: 'escalate', label: 'Escalate' };
  if (lower.includes('comparison')) return { type: 'send_comparison', label: 'Send Comparison' };
  if (lower.includes('info')) return { type: 'send_info', label: 'Send Information' };
  return { type: 'call', label: 'Call' };
}
