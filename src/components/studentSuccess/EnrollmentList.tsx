import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentSuccess, ENROLLMENT_STATUSES, EnrollmentStatus } from '../../hooks/useStudentSuccess';
import {
  GraduationCap, Search, Plus, AlertTriangle,
  ChevronRight, Activity, Clock, Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CreateEnrollmentModal } from './modals/CreateEnrollmentModal';

const STATUS_COLORS: Record<string, string> = {
  'Admission Confirmed': 'bg-blue-500/10 text-blue-600',
  'Payment Pending': 'bg-amber-500/10 text-amber-600',
  'Payment Completed': 'bg-teal-500/10 text-teal-600',
  'Enrollment Initiated': 'bg-indigo-500/10 text-indigo-600',
  'Enrollment Submitted': 'bg-violet-500/10 text-violet-600',
  'Enrollment Confirmed': 'bg-purple-500/10 text-purple-600',
  'Student ID Pending': 'bg-orange-500/10 text-orange-600',
  'Student ID Received': 'bg-cyan-500/10 text-cyan-600',
  'LMS Access Pending': 'bg-yellow-500/10 text-yellow-600',
  'LMS Access Activated': 'bg-lime-500/10 text-lime-600',
  'Orientation Pending': 'bg-pink-500/10 text-pink-600',
  'Active Student': 'bg-emerald-500/10 text-emerald-600',
  'Completed': 'bg-green-500/10 text-green-600',
  'Withdrawn': 'bg-red-500/10 text-red-600',
  'Deferred': 'bg-gray-500/10 text-gray-500',
};

const RISK_COLORS: Record<string, string> = {
  'Low Risk': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'Medium Risk': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'High Risk': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'Critical': 'bg-red-500/10 text-red-600 border-red-200',
};

export function EnrollmentList() {
  const { enrollments, isLoading } = useStudentSuccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = enrollments.filter(e => {
    const matchSearch = !searchTerm || 
      e.admission?.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.admission?.university?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.admission?.admission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.studentIdNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.enrollmentStatus === statusFilter;
    const matchRisk = riskFilter === 'all' || e.riskLevel === riskFilter;
    return matchSearch && matchStatus && matchRisk;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enrollments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Post-admission student lifecycle management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Enrollment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students, universities..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">All Statuses</option>
          {ENROLLMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">All Risk Levels</option>
          <option value="Low Risk">Low Risk</option>
          <option value="Medium Risk">Medium Risk</option>
          <option value="High Risk">High Risk</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* Summary Counts */}
      <div className="flex flex-wrap gap-2">
        {(['Onboarding', 'Active Student', 'LMS Access Pending', 'Orientation Pending'] as const).map(label => {
          const count = label === 'Onboarding'
            ? enrollments.filter(e => ['Admission Confirmed','Payment Pending','Enrollment Initiated','Enrollment Submitted'].includes(e.enrollmentStatus)).length
            : label === 'LMS Access Pending'
              ? enrollments.filter(e => e.enrollmentStatus === 'LMS Access Pending').length
              : label === 'Orientation Pending'
                ? enrollments.filter(e => e.orientationStatus === 'Pending').length
                : enrollments.filter(e => e.enrollmentStatus === label).length;
          return (
            <span key={label} className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
              {label}: {count}
            </span>
          );
        })}
      </div>

      {/* Enrollments Table/Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="p-4 bg-card border border-border rounded-xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-3 bg-muted rounded w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-border rounded-xl bg-card">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-foreground font-semibold">No enrollments found</p>
          <p className="text-muted-foreground text-sm mt-1">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Click "New Enrollment" to start tracking student lifecycle'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(enrollment => (
            <Link
              key={enrollment.id}
              to={`/student-success/enrollments/${enrollment.id}`}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                {enrollment.admission?.student_name?.charAt(0) ?? 'S'}
              </div>

              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {enrollment.admission?.student_name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {enrollment.admission?.university?.name ?? '—'} · {enrollment.admission?.course?.name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Admission: {enrollment.admission?.admission_number ?? '—'}
                  {enrollment.studentIdNumber && ` · Student ID: ${enrollment.studentIdNumber}`}
                </p>
              </div>

              {/* Health Score */}
              <div className="hidden md:flex flex-col items-center shrink-0">
                <div className="relative w-10 h-10">
                  <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${(enrollment.healthScore / 100) * 88} 88`}
                      className={enrollment.healthScore >= 70 ? 'text-emerald-500' : enrollment.healthScore >= 40 ? 'text-amber-500' : 'text-red-500'}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                    {enrollment.healthScore}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">Score</span>
              </div>

              {/* Status badges */}
              <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", STATUS_COLORS[enrollment.enrollmentStatus] || 'bg-muted text-muted-foreground')}>
                  {enrollment.enrollmentStatus}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", RISK_COLORS[enrollment.riskLevel])}>
                  {enrollment.riskLevel}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateEnrollmentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
