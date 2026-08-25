import { supabase } from '../supabase';

export interface PartnerProfile {
  id: string;
  company_name: string;
  partner_type: string;
  kyc_status: string;
  tier_id: string;
  tier_name?: string;
  commission_multiplier?: number;
  total_revenue_generated: number;
}

export const partnerService = {
  // Get current partner profile
  async getProfile(): Promise<PartnerProfile | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('partner_profiles')
      .select(`
        *,
        partner_tiers (
          name,
          commission_multiplier
        )
      `)
      .eq('id', userData.user.id)
      .single();

    if (error) {
      console.error('Error fetching partner profile:', error);
      return null;
    }

    return {
      ...data,
      tier_name: data.partner_tiers?.name,
      commission_multiplier: data.partner_tiers?.commission_multiplier
    };
  },

  // Submit Lead with Duplicate Protection
  async submitLead(leadData: any) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Duplicate Check: Email or Phone
    const { data: existingLeads, error: checkError } = await supabase
      .from('leads')
      .select('id, email, phone')
      .or(`email.eq.${leadData.email},phone.eq.${leadData.phone}`)
      .limit(1);

    if (checkError) throw checkError;

    if (existingLeads && existingLeads.length > 0) {
      throw new Error('A lead with this email or phone already exists in the system.'); // Generic message as per requirement
    }

    // Map data to match exact Supabase schema
    const newLeadData = {
      first_name: leadData.firstName || leadData.name?.split(' ')[0] || '',
      last_name: leadData.lastName || leadData.name?.split(' ').slice(1).join(' ') || '',
      email: leadData.email,
      phone: leadData.phone,
      state: leadData.state,
      city: leadData.city,
      course: leadData.course,
      university: leadData.university,
      lead_source: 'Partner Portal',
      lead_status: 'New',
      priority: leadData.priority || 'Medium',
      partner_id: userData.user.id
    };

    // Insert new lead
    const { data, error } = await supabase
      .from('leads')
      .insert([newLeadData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get My Leads
  async getMyLeads() {
    // RLS handles isolation automatically
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // KYC Management
  async uploadKYCDocument(file: File, docType: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const filePath = `kyc/${userData.user.id}/${docType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('partner-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
      .from('partner_kyc')
      .insert([{
        partner_id: userData.user.id,
        document_type: docType,
        bucket_name: 'partner-documents',
        storage_path: filePath,
        status: 'Under Review'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // Update Profile status
    await supabase.from('partner_profiles').update({ kyc_status: 'Submitted' }).eq('id', userData.user.id);

    return data;
  }
};
