import { Admission } from '../types/admission';

// All mock data removed — admissions are now stored in Supabase
export let mockAdmissions: Admission[] = [];

export const updateAdmission = (_id: string, _updates: Partial<Admission>) => {
  // No-op: all updates now handled by useAdmissions hook via Supabase
};
