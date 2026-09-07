import { supabase } from './supabase';
import { Lead } from '../types/schema';

/**
 * Lightweight lead creation without initializing full table subscriptions or query pipelines.
 */
export async function createLeadDirect(leadData: Partial<Lead>, user: any) {
  if (!user) throw new Error('Not authenticated');

  const newLeadData: Record<string, any> = {
    first_name: leadData.firstName || leadData.name?.split(' ')[0] || '',
    last_name: leadData.lastName || leadData.name?.split(' ').slice(1).join(' ') || '',
    email: leadData.email,
    phone: leadData.phone,
    alternate_phone: leadData.alternatePhone,
    state: leadData.state,
    city: leadData.city,
    country: leadData.country,
    budget: leadData.budget,
    lead_source: leadData.leadSource || leadData.source || 'Direct',
    lead_status: leadData.leadStatus || leadData.status || 'New',
    priority: leadData.priority || 'Medium',
    lead_score: leadData.leadScore ?? leadData.score ?? 0,
    preferred_language: leadData.preferredLanguage,
    counseling_mode: leadData.counselingMode,
    course_id: leadData.courseId || null,
    university_id: leadData.universityId || null,
    assigned_counselor: leadData.assignedCounselor || leadData.counselorId || user?.id,
    partner_id: user.role === 'Partner' ? user.id : undefined,
    organization_id: user.activeOrganizationId,

    age: leadData.age,
    gender: leadData.gender,
    education: leadData.education,
    graduation_percentage: leadData.graduationPercentage,
    twelfth_percentage: leadData.twelfthPercentage,
    tenth_percentage: leadData.tenthPercentage,
    current_occupation: leadData.currentOccupation,
    years_of_experience: leadData.yearsOfExperience,
  };

  const { data, error } = await supabase
    .from('leads')
    .insert([newLeadData])
    .select()
    .single();

  if (error) throw error;
  return data;
}
