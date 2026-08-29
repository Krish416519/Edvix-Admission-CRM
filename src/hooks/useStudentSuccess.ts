import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnrollmentStatus =
  | 'Admission Confirmed'
  | 'Payment Pending'
  | 'Payment Completed'
  | 'Enrollment Initiated'
  | 'Enrollment Submitted'
  | 'Enrollment Confirmed'
  | 'Student ID Pending'
  | 'Student ID Received'
  | 'LMS Access Pending'
  | 'LMS Access Activated'
  | 'Orientation Pending'
  | 'Active Student'
  | 'Completed'
  | 'Withdrawn'
  | 'Deferred';

export const ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'Admission Confirmed',
  'Payment Pending',
  'Payment Completed',
  'Enrollment Initiated',
  'Enrollment Submitted',
  'Enrollment Confirmed',
  'Student ID Pending',
  'Student ID Received',
  'LMS Access Pending',
  'LMS Access Activated',
  'Orientation Pending',
  'Active Student',
  'Completed',
  'Withdrawn',
  'Deferred',
];

export const DEFAULT_CHECKLIST_ITEMS = [
  'Admission Confirmed',
  'Fee Paid',
  'Enrollment Form Submitted',
  'University Registration Done',
  'Student ID Received',
  'LMS Access Activated',
  'Orientation Attended',
  'Welcome Communication Sent',
  'Academic Contact Established',
];

export interface StudentEnrollment {
  id: string;
  admissionId: string;
  enrollmentStatus: EnrollmentStatus;
  healthScore: number;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical';
  studentIdNumber?: string;
  universityRegistrationId?: string;
  lmsStatus?: string;
  lmsAccessRequestedAt?: string;
  lmsAccessActivatedAt?: string;
  orientationStatus?: string;
  orientationDate?: string;
  successExecutiveId?: string;
  lastEngagementDate?: string;
  nextActionRecommendation?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  admission?: any;
  successExecutive?: { id: string; full_name: string };
}

export interface EnrollmentChecklist {
  id: string;
  enrollmentId: string;
  itemName: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}

export interface StudentSupportTicket {
  id: string;
  ticketNumber: string;
  enrollmentId: string;
  subject: string;
  description: string;
  category: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: string;
  assignedTo?: string;
  reportedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; full_name: string };
  messages?: StudentSupportMessage[];
}

export interface StudentSupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender?: { full_name: string };
}

// ─── useStudentSuccess ────────────────────────────────────────────────────────

export function useStudentSuccess() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          admission:admissions(
            id, admission_number, student_name, email, phone,
            admission_status, current_stage, university_id, course_id,
            university:universities(id, name),
            course:courses(id, name),
            lead:leads(id, first_name, last_name, partner_id)
          ),
          successExecutive:users!student_enrollments_success_executive_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setEnrollments((data || []).map(mapEnrollment));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createEnrollment = async (admissionId: string) => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('student_enrollments')
      .insert({ admission_id: admissionId, enrollment_status: 'Admission Confirmed' })
      .select()
      .single();
    if (err) { toast.error('Failed to create enrollment'); throw err; }
    // Seed default checklist
    await supabase.from('enrollment_checklists').insert(
      DEFAULT_CHECKLIST_ITEMS.map((item, i) => ({
        enrollment_id: data.id,
        item_name: item,
        is_completed: i === 0, // "Admission Confirmed" is auto-completed
        completed_at: i === 0 ? new Date().toISOString() : null,
        completed_by: i === 0 ? user.id : null,
      }))
    );
    toast.success('Enrollment created successfully');
    await fetch();
    return data;
  };

  const updateEnrollment = async (id: string, updates: Partial<{
    enrollmentStatus: EnrollmentStatus;
    studentIdNumber: string;
    universityRegistrationId: string;
    lmsStatus: string;
    lmsAccessRequestedAt: string;
    lmsAccessActivatedAt: string;
    orientationStatus: string;
    orientationDate: string;
    successExecutiveId: string;
    nextActionRecommendation: string;
    healthScore: number;
    riskLevel: string;
  }>) => {
    const dbUpdates: any = {};
    if (updates.enrollmentStatus) dbUpdates.enrollment_status = updates.enrollmentStatus;
    if (updates.studentIdNumber !== undefined) dbUpdates.student_id_number = updates.studentIdNumber;
    if (updates.universityRegistrationId !== undefined) dbUpdates.university_registration_id = updates.universityRegistrationId;
    if (updates.lmsStatus !== undefined) dbUpdates.lms_status = updates.lmsStatus;
    if (updates.lmsAccessRequestedAt !== undefined) dbUpdates.lms_access_requested_at = updates.lmsAccessRequestedAt;
    if (updates.lmsAccessActivatedAt !== undefined) dbUpdates.lms_access_activated_at = updates.lmsAccessActivatedAt;
    if (updates.orientationStatus !== undefined) dbUpdates.orientation_status = updates.orientationStatus;
    if (updates.orientationDate !== undefined) dbUpdates.orientation_date = updates.orientationDate;
    if (updates.successExecutiveId !== undefined) dbUpdates.success_executive_id = updates.successExecutiveId;
    if (updates.nextActionRecommendation !== undefined) dbUpdates.next_action_recommendation = updates.nextActionRecommendation;
    if (updates.healthScore !== undefined) dbUpdates.health_score = updates.healthScore;
    if (updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;

    const { error: err } = await supabase.from('student_enrollments').update(dbUpdates).eq('id', id);
    if (err) { toast.error('Failed to update enrollment'); throw err; }
    toast.success('Enrollment updated');
    await fetch();
  };

  return { enrollments, isLoading, error, fetch, createEnrollment, updateEnrollment };
}

// ─── useEnrollmentChecklist ───────────────────────────────────────────────────

export function useEnrollmentChecklist(enrollmentId: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<EnrollmentChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('enrollment_checklists')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('created_at');
    setItems((data || []).map(r => ({
      id: r.id, enrollmentId: r.enrollment_id, itemName: r.item_name,
      isCompleted: r.is_completed, completedAt: r.completed_at,
      completedBy: r.completed_by, createdAt: r.created_at,
    })));
    setIsLoading(false);
  }, [enrollmentId]);

  useEffect(() => { if (enrollmentId) fetch(); }, [fetch, enrollmentId]);

  const toggleItem = async (itemId: string, completed: boolean) => {
    await supabase.from('enrollment_checklists').update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user?.id : null,
    }).eq('id', itemId);
    await fetch();
  };

  const addItem = async (itemName: string) => {
    await supabase.from('enrollment_checklists').insert({ enrollment_id: enrollmentId, item_name: itemName });
    await fetch();
  };

  return { items, isLoading, toggleItem, addItem, refetch: fetch };
}

// ─── useStudentSupportTickets ─────────────────────────────────────────────────

export function useStudentSupportTickets(enrollmentId?: string) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<StudentSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('student_support_tickets')
      .select(`*, assignee:users!student_support_tickets_assigned_to_fkey(id, full_name)`)
      .order('created_at', { ascending: false });

    if (enrollmentId) query = query.eq('enrollment_id', enrollmentId);

    const { data } = await query;
    setTickets((data || []).map(r => ({
      id: r.id, ticketNumber: r.ticket_number, enrollmentId: r.enrollment_id,
      subject: r.subject, description: r.description, category: r.category,
      priority: r.priority, status: r.status, assignedTo: r.assigned_to,
      reportedBy: r.reported_by, resolvedAt: r.resolved_at,
      createdAt: r.created_at, updatedAt: r.updated_at,
      assignee: r.assignee,
    })));
    setIsLoading(false);
  }, [enrollmentId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createTicket = async (data: {
    enrollmentId: string; subject: string; description: string;
    category: string; priority: StudentSupportTicket['priority'];
  }) => {
    const { error } = await supabase.from('student_support_tickets').insert({
      enrollment_id: data.enrollmentId, subject: data.subject,
      description: data.description, category: data.category,
      priority: data.priority, reported_by: user?.id,
    });
    if (error) { toast.error('Failed to create ticket'); throw error; }
    toast.success('Support ticket created');
    await fetch();
  };

  const updateTicketStatus = async (ticketId: string, status: string, assignedTo?: string) => {
    const updates: any = { status };
    if (assignedTo) updates.assigned_to = assignedTo;
    if (status === 'Resolved' || status === 'Closed') updates.resolved_at = new Date().toISOString();
    await supabase.from('student_support_tickets').update(updates).eq('id', ticketId);
    toast.success('Ticket updated');
    await fetch();
  };

  return { tickets, isLoading, createTicket, updateTicketStatus, refetch: fetch };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapEnrollment(r: any): StudentEnrollment {
  return {
    id: r.id,
    admissionId: r.admission_id,
    enrollmentStatus: r.enrollment_status,
    healthScore: r.health_score,
    riskLevel: r.risk_level,
    studentIdNumber: r.student_id_number,
    universityRegistrationId: r.university_registration_id,
    lmsStatus: r.lms_status,
    lmsAccessRequestedAt: r.lms_access_requested_at,
    lmsAccessActivatedAt: r.lms_access_activated_at,
    orientationStatus: r.orientation_status,
    orientationDate: r.orientation_date,
    successExecutiveId: r.success_executive_id,
    lastEngagementDate: r.last_engagement_date,
    nextActionRecommendation: r.next_action_recommendation,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    admission: r.admission,
    successExecutive: r.successExecutive,
  };
}
