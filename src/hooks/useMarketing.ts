import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Campaign, NurturingJourney } from '../types/marketing';
import { toast } from 'sonner';

export const useMarketing = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [journeys, setJourneys] = useState<NurturingJourney[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      // Transform snake_case to camelCase
      const formattedCampaigns: Campaign[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        platform: c.platform,
        budget: Number(c.budget),
        spend: Number(c.spend),
        startDate: c.start_date,
        endDate: c.end_date,
        status: c.status,
        owner: c.owner_id || 'System',
        goal: c.goal,
        utm: {
          source: c.utm_source,
          medium: c.utm_medium,
          campaign: c.utm_campaign,
          term: c.utm_term,
          content: c.utm_content
        },
        metrics: {
          impressions: c.metrics_impressions,
          clicks: c.metrics_clicks,
          leadsGenerated: c.metrics_leads_generated,
          admissions: c.metrics_admissions,
          revenue: Number(c.metrics_revenue)
        },
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));

      setCampaigns(formattedCampaigns);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJourneys = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('marketing_journeys')
        .select(`
          *,
          steps:marketing_journey_steps(*)
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      const formattedJourneys: NurturingJourney[] = (data || []).map((j: any) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        trigger: j.trigger_event,
        enrolled: j.enrolled_count,
        completed: j.completed_count,
        conversionRate: Number(j.conversion_rate),
        steps: (j.steps || []).sort((a: any, b: any) => a.step_order - b.step_order).map((s: any) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          config: s.config
        })),
        createdAt: j.created_at,
        updatedAt: j.updated_at
      }));

      setJourneys(formattedJourneys);
    } catch (err: any) {
      console.error('Error fetching journeys:', err);
      setError(err);
      toast.error('Failed to load journeys');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = async (campaignData: Partial<Campaign>) => {
    try {
      const { error: supabaseError } = await supabase
        .from('marketing_campaigns')
        .insert([{
          name: campaignData.name,
          type: campaignData.type,
          platform: campaignData.platform,
          budget: campaignData.budget,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          status: campaignData.status || 'Draft',
          goal: campaignData.goal
        }]);

      if (supabaseError) throw supabaseError;
      toast.success('Campaign created successfully');
      await fetchCampaigns();
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      toast.error('Failed to create campaign');
      throw err;
    }
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('marketing_campaigns')
        .update({ status })
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      toast.success('Campaign status updated');
      await fetchCampaigns();
    } catch (err: any) {
      console.error('Error updating campaign status:', err);
      toast.error('Failed to update campaign status');
      throw err;
    }
  };

  const updateJourneyStatus = async (id: string, status: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('marketing_journeys')
        .update({ status })
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      toast.success('Journey status updated');
      await fetchJourneys();
    } catch (err: any) {
      console.error('Error updating journey status:', err);
      toast.error('Failed to update journey status');
      throw err;
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchJourneys();
  }, [fetchCampaigns, fetchJourneys]);

  return {
    campaigns,
    journeys,
    loading,
    error,
    createCampaign,
    updateCampaignStatus,
    updateJourneyStatus,
    refreshCampaigns: fetchCampaigns,
    refreshJourneys: fetchJourneys
  };
};