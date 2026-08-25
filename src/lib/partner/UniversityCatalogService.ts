import { supabase } from '../supabase';

export const universityCatalogService = {
  // Get all approved universities and courses
  async searchCatalog(filters?: { universityId?: string; courseLevel?: string }) {
    let query = supabase
      .from('universities')
      .select(`
        id,
        name,
        country,
        city,
        ranking,
        accreditation,
        website,
        courses (
          id,
          name,
          level,
          specialization,
          duration,
          tuition_fee,
          currency,
          intake_months,
          eligibility_criteria
        )
      `)
      .eq('status', 'Active')
      .order('name');

    if (filters?.universityId) {
      query = query.eq('id', filters.universityId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching university catalog:', error);
      throw error;
    }

    // Filter courses client-side if needed since Supabase embedded filtering can be complex
    if (filters?.courseLevel && data) {
      return data.map(uni => ({
        ...uni,
        courses: uni.courses.filter(c => c.level === filters.courseLevel)
      })).filter(uni => uni.courses.length > 0);
    }

    return data;
  }
};
