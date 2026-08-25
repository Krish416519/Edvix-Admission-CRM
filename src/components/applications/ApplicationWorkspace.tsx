import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, Upload, Shield, X, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DocumentChecklist } from './DocumentChecklist';
import { DocumentVerificationPanel } from './DocumentVerificationPanel';

interface ApplicationWorkspaceProps {
  admissionId: string;
  onClose?: () => void;
  role?: 'Admin' | 'Counselor' | 'Partner';
}

export function ApplicationWorkspace({ admissionId, onClose, role = 'Counselor' }: ApplicationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'checklist' | 'verification' | 'timeline'>('checklist');

  // Mock data for the workspace based on the admission entity
  const application = {
    id: admissionId,
    application_number: 'APP-2026-001024',
    student_name: 'Rahul Kumar',
    university_name: 'Stanford University',
    course_name: 'MBA (Global)',
    status: 'Documents Under Review',
    readiness_score: 80,
    missing_mandatory_docs: 1,
    payment_status: 'Pending',
    next_action: 'Verify Degree Certificate',
    created_at: '2026-08-10T10:00:00Z',
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Area */}
      <div className="bg-card border-b border-border p-6 shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{application.student_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {application.application_number}
              </span>
            </div>
            <p className="text-muted-foreground">{application.course_name} at {application.university_name}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="text-sm text-muted-foreground mb-1">Application Status</div>
            <div className="font-semibold text-foreground">{application.status}</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 relative overflow-hidden">
            <div className="text-sm text-muted-foreground mb-1">Readiness Score</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-black text-emerald-500">{application.readiness_score}%</div>
              {application.readiness_score === 100 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            </div>
            {/* Progress bar background */}
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500" style={{ width: `${application.readiness_score}%` }} />
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <div className="text-sm mb-1 flex items-center gap-1.5 opacity-80">
              <AlertCircle className="w-4 h-4" /> Missing Documents
            </div>
            <div className="font-semibold text-lg">{application.missing_mandatory_docs} Required</div>
          </div>
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
            <div className="text-sm mb-1 opacity-80">Next Action</div>
            <div className="font-semibold">{application.next_action}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('checklist')}
            className={cn(
              "py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'checklist' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <FileText className="w-4 h-4" /> Document Checklist
          </button>
          
          {(role === 'Admin' || role === 'Counselor') && (
            <button
              onClick={() => setActiveTab('verification')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === 'verification' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Shield className="w-4 h-4" /> Verification & AI
            </button>
          )}

          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'timeline' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Clock className="w-4 h-4" /> Timeline
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-muted/10 p-6">
        <div className="h-full max-w-6xl mx-auto">
          {activeTab === 'checklist' && <DocumentChecklist admissionId={admissionId} role={role} />}
          {activeTab === 'verification' && <DocumentVerificationPanel admissionId={admissionId} />}
          {activeTab === 'timeline' && (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              Timeline view coming soon... (Integrates with existing CRM timeline)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
