import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';

export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLead() {
      if (!user || !id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('leads')
          .select(`
            *,
            counselor:users!leads_counselor_id_fkey(name),
            university:universities(name),
            course:courses(name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          const mappedLead: Lead = {
            id: data.id,
            leadNumber: data.lead_number,
            firstName: data.first_name,
            lastName: data.last_name,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            email: data.email,
            phone: data.phone,
            alternatePhone: data.alternate_phone,
            state: data.state,
            city: data.city,
            country: data.country,
            budget: data.budget,
            leadSource: data.lead_source,
            source: data.lead_source, // legacy map
            leadStatus: data.lead_status,
            status: data.lead_status, // legacy map
            priority: data.priority,
            leadScore: data.lead_score,
            score: data.lead_score, // legacy map
            
            preferredLanguage: data.preferred_language,
            counselingMode: data.counseling_mode,
            notesCount: data.notes_count,
            tasksCount: data.tasks_count,
            admissionStatus: data.admission_status,
            
            assignedCounselor: data.assigned_counselor,
            counselorId: data.assigned_counselor, // legacy map
            universityId: data.university_id,
            courseId: data.course_id,
            
            counselor: data.counselor?.name || 'Unassigned',
            university: data.university?.name || 'Not Selected',
            course: data.course?.name || 'Not Selected',
            
            aiScore: data.ai_score,
            aiInsights: data.ai_insights,
            aiSuggestedNextAction: data.ai_suggested_next_action,
            aiSummary: data.ai_summary,
            aiObjectionDetected: data.ai_objection_detected,

            // ── Academic Profile ────────────────────────────────────────────
            tenthBoard: data.tenth_board,
            tenthPassingYear: data.tenth_passing_year,
            tenthPercentage: data.tenth_percentage,
            twelfthBoard: data.twelfth_board,
            twelfthStream: data.twelfth_stream,
            twelfthPassingYear: data.twelfth_passing_year,
            twelfthPercentage: data.twelfth_percentage,
            graduationDegree: data.graduation_degree,
            graduationUniversity: data.graduation_university,
            graduationPassingYear: data.graduation_passing_year,
            graduationPercentage: data.graduation_percentage,
            graduationMode: data.graduation_mode,
            graduationBacklogs: data.graduation_backlogs,
            postGraduationDegree: data.post_graduation_degree,
            postGraduationUniversity: data.post_graduation_university,
            postGraduationPassingYear: data.post_graduation_passing_year,
            postGraduationPercentage: data.post_graduation_percentage,
            gapYears: data.gap_years,
            gapExplanation: data.gap_explanation,
            education: data.education,

            // ── Professional Profile ────────────────────────────────────────
            employmentStatus: data.employment_status,
            company: data.company,
            jobTitle: data.job_title,
            industry: data.industry,
            yearsOfExperience: data.years_of_experience,
            annualIncome: data.annual_income,

            // ── Career & Admission Requirements ────────────────────────────
            careerGoal: data.career_goal,
            targetRole: data.target_role,
            motivation: data.motivation,
            preferredSpecialization: data.preferred_specialization,
            preferredIntake: data.preferred_intake,
            preferredLearningMode: data.preferred_learning_mode,
            needEmi: data.need_emi,
            needScholarship: data.need_scholarship,
            needPlacementSupport: data.need_placement_support,
            universityBrandPreference: data.university_brand_preference,
            urgency: data.urgency,

            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          setLead(mappedLead);
        }
      } catch (err: any) {
        console.error('Error fetching lead:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLead();
  }, [user?.id, id]);

  const updateLead = async (updates: Partial<Lead>) => {
    if (!id) return { success: false, error: 'No ID' };
    
    try {
      const payload: any = {};
      if (updates.firstName !== undefined) payload.first_name = updates.firstName;
      if (updates.lastName !== undefined) payload.last_name = updates.lastName;
      if (updates.name !== undefined) {
         payload.first_name = updates.name.split(' ')[0];
         payload.last_name = updates.name.split(' ').slice(1).join(' ');
      }
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.alternatePhone !== undefined) payload.alternate_phone = updates.alternatePhone;
      if (updates.state !== undefined) payload.state = updates.state;
      if (updates.city !== undefined) payload.city = updates.city;
      if (updates.country !== undefined) payload.country = updates.country;
      if (updates.leadStatus !== undefined) payload.lead_status = updates.leadStatus;
      if (updates.status !== undefined) payload.lead_status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.leadScore !== undefined) payload.lead_score = updates.leadScore;
      if (updates.score !== undefined) payload.lead_score = updates.score;
      if (updates.assignedCounselor !== undefined) payload.assigned_counselor = updates.assignedCounselor;
      if (updates.counselorId !== undefined) payload.assigned_counselor = updates.counselorId;
      if (updates.universityId !== undefined) payload.university_id = updates.universityId;
      if (updates.courseId !== undefined) payload.course_id = updates.courseId;

      // ── Academic Profile ──────────────────────────────────────────────────
      if (updates.tenthBoard !== undefined) payload.tenth_board = updates.tenthBoard;
      if (updates.tenthPassingYear !== undefined) payload.tenth_passing_year = updates.tenthPassingYear;
      if (updates.tenthPercentage !== undefined) payload.tenth_percentage = updates.tenthPercentage;
      if (updates.twelfthBoard !== undefined) payload.twelfth_board = updates.twelfthBoard;
      if (updates.twelfthStream !== undefined) payload.twelfth_stream = updates.twelfthStream;
      if (updates.twelfthPassingYear !== undefined) payload.twelfth_passing_year = updates.twelfthPassingYear;
      if (updates.twelfthPercentage !== undefined) payload.twelfth_percentage = updates.twelfthPercentage;
      if (updates.graduationDegree !== undefined) payload.graduation_degree = updates.graduationDegree;
      if (updates.graduationUniversity !== undefined) payload.graduation_university = updates.graduationUniversity;
      if (updates.graduationPassingYear !== undefined) payload.graduation_passing_year = updates.graduationPassingYear;
      if (updates.graduationPercentage !== undefined) payload.graduation_percentage = updates.graduationPercentage;
      if (updates.graduationMode !== undefined) payload.graduation_mode = updates.graduationMode;
      if (updates.graduationBacklogs !== undefined) payload.graduation_backlogs = updates.graduationBacklogs;
      if (updates.postGraduationDegree !== undefined) payload.post_graduation_degree = updates.postGraduationDegree;
      if (updates.postGraduationUniversity !== undefined) payload.post_graduation_university = updates.postGraduationUniversity;
      if (updates.postGraduationPassingYear !== undefined) payload.post_graduation_passing_year = updates.postGraduationPassingYear;
      if (updates.postGraduationPercentage !== undefined) payload.post_graduation_percentage = updates.postGraduationPercentage;
      if (updates.gapYears !== undefined) payload.gap_years = updates.gapYears;
      if (updates.gapExplanation !== undefined) payload.gap_explanation = updates.gapExplanation;

      // ── Professional Profile ──────────────────────────────────────────────
      if (updates.employmentStatus !== undefined) payload.employment_status = updates.employmentStatus;
      if (updates.company !== undefined) payload.company = updates.company;
      if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
      if (updates.industry !== undefined) payload.industry = updates.industry;
      if (updates.yearsOfExperience !== undefined) payload.years_of_experience = updates.yearsOfExperience;
      if (updates.annualIncome !== undefined) payload.annual_income = updates.annualIncome;

      // ── Career & Admission Requirements ───────────────────────────────────
      if (updates.careerGoal !== undefined) payload.career_goal = updates.careerGoal;
      if (updates.targetRole !== undefined) payload.target_role = updates.targetRole;
      if (updates.motivation !== undefined) payload.motivation = updates.motivation;
      if (updates.preferredSpecialization !== undefined) payload.preferred_specialization = updates.preferredSpecialization;
      if (updates.preferredIntake !== undefined) payload.preferred_intake = updates.preferredIntake;
      if (updates.preferredLearningMode !== undefined) payload.preferred_learning_mode = updates.preferredLearningMode;
      if (updates.budget !== undefined) payload.budget = updates.budget;
      if (updates.needEmi !== undefined) payload.need_emi = updates.needEmi;
      if (updates.needScholarship !== undefined) payload.need_scholarship = updates.needScholarship;
      if (updates.needPlacementSupport !== undefined) payload.need_placement_support = updates.needPlacementSupport;
      if (updates.universityBrandPreference !== undefined) payload.university_brand_preference = updates.universityBrandPreference;
      if (updates.urgency !== undefined) payload.urgency = updates.urgency;
      if (updates.education !== undefined) payload.education = updates.education;
      
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) throw error;
      
      setLead(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const refreshLead = async () => {
    if (!id || !user) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          counselor:users!leads_counselor_id_fkey(name),
          university:universities(name),
          course:courses(name)
        `)
        .eq('id', id)
        .single();
      if (error || !data) return;
      setLead(prev => prev ? {
        ...prev,
        leadStatus: data.lead_status,
        status: data.lead_status,
        assignedCounselor: data.assigned_counselor,
        updatedAt: data.updated_at,
        latestDispositionId: data.latest_disposition_id,
      } : null);
    } catch (_) {}
  };

  return { lead, isLoading, error, updateLead, refreshLead };
}
