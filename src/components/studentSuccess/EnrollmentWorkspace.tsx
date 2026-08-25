import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useStudentSuccess, useEnrollmentChecklist, useStudentSupportTickets,
  ENROLLMENT_STATUSES, EnrollmentStatus
} from '../../hooks/useStudentSuccess';
import {
  ArrowLeft, GraduationCap, CheckCircle, Circle, Plus, LifeBuoy,
  Activity, AlertTriangle, Edit2, Save, X, ChevronDown, Lightbulb,
  Building2, CreditCard, User, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  'Admission Confirmed': 'bg-blue-500/10 text-blue-600',
  'Payment Pending': 'bg-amber-500/10 text-amber-600',
  'Enrollment Initiated': 'bg-indigo-500/10 text-indigo-600',
  'LMS Access Pending': 'bg-yellow-500/10 text-yellow-600',
  'LMS Access Activated': 'bg-lime-500/10 text-lime-600',
  'Orientation Pending': 'bg-pink-500/10 text-pink-600',
  'Active Student': 'bg-emerald-500/10 text-emerald-600',
  'Completed': 'bg-green-500/10 text-green-600',
  'Withdrawn': 'bg-red-500/10 text-red-600',
};

const RISK_COLORS: Record<string, string> = {
  'Low Risk': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'Medium Risk': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'High Risk': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'Critical': 'bg-red-500/10 text-red-600 border-red-200',
};

function ChecklistSection({ enrollmentId }: { enrollmentId: string }) {
  const { items, isLoading, toggleItem, addItem } = useEnrollmentChecklist(enrollmentId);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const completedCount = items.filter(i => i.isCompleted).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    await addItem(newItem.trim());
    setNewItem('');
    setAdding(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Enrollment Checklist</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{completedCount}/{items.length} completed</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-emerald-600">{progress}%</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id, !item.isCompleted)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left group"
          >
            {item.isCompleted
              ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            }
            <span className={cn("text-sm flex-1", item.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
              {item.itemName}
            </span>
            {item.completedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.completedAt).toLocaleDateString()}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-border">
        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="New checklist item..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button onClick={handleAdd} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        )}
      </div>
    </div>
  );
}

function SupportTicketsSection({ enrollmentId }: { enrollmentId: string }) {
  const { tickets, isLoading, createTicket, updateTicketStatus } = useStudentSupportTickets(enrollmentId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'Enrollment Issue', priority: 'Normal' as const });

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) { toast.error('Fill in subject and description'); return; }
    await createTicket({ enrollmentId, ...form });
    setForm({ subject: '', description: '', category: 'Enrollment Issue', priority: 'Normal' });
    setShowForm(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Support Tickets</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Ticket
        </button>
      </div>

      {showForm && (
        <div className="p-5 border-b border-border bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 bg-background border border-input rounded-lg text-sm">
              {['Enrollment Issue','LMS Issue','University Issue','Payment Issue','Document Issue','Academic Query','General Support'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
              className="px-3 py-2 bg-background border border-input rounded-lg text-sm">
              {['Low', 'Normal', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder="Subject..."
            value={form.subject}
            onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
          />
          <textarea
            placeholder="Describe the issue..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Submit</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <LifeBuoy className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No support tickets</p>
          </div>
        )}
        {tickets.map(ticket => (
          <div key={ticket.id} className="px-5 py-3.5 flex items-start gap-3">
            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", {
              'bg-red-500': ticket.priority === 'Urgent',
              'bg-orange-500': ticket.priority === 'High',
              'bg-amber-500': ticket.priority === 'Normal',
              'bg-muted-foreground': ticket.priority === 'Low',
            })} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{ticket.status}</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
              <p className="text-xs text-muted-foreground">{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnrollmentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { enrollments, updateEnrollment } = useStudentSuccess();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const enrollment = enrollments.find(e => e.id === id);

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <GraduationCap className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Enrollment not found or loading...</p>
        <Link to="/student-success/enrollments" className="mt-4 text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Enrollments
        </Link>
      </div>
    );
  }

  const startEdit = () => {
    setEditData({
      enrollmentStatus: enrollment.enrollmentStatus,
      studentIdNumber: enrollment.studentIdNumber || '',
      universityRegistrationId: enrollment.universityRegistrationId || '',
      lmsStatus: enrollment.lmsStatus || 'Pending',
      orientationStatus: enrollment.orientationStatus || 'Pending',
      nextActionRecommendation: enrollment.nextActionRecommendation || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await updateEnrollment(enrollment.id, editData);
    setEditing(false);
    setSaving(false);
  };

  const adm = enrollment.admission;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back & Header */}
      <div className="flex items-center gap-4">
        <Link to="/student-success/enrollments" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{adm?.student_name ?? 'Student'} — Enrollment Workspace</h1>
          <p className="text-sm text-muted-foreground">{adm?.admission_number} · {adm?.university?.name} · {adm?.course?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button onClick={startEdit} className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors text-sm">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-sm">Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* Health Score Banner */}
      <div className={cn("p-4 rounded-xl border flex items-center gap-4", RISK_COLORS[enrollment.riskLevel])}>
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{enrollment.riskLevel} — Health Score: {enrollment.healthScore}/100</p>
          {enrollment.nextActionRecommendation && (
            <p className="text-xs mt-0.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> {enrollment.nextActionRecommendation}
            </p>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status Card */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Enrollment Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Enrollment Status</label>
                {editing ? (
                  <select value={editData.enrollmentStatus} onChange={e => setEditData((p: any) => ({ ...p, enrollmentStatus: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm">
                    {ENROLLMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <div className={cn("mt-1 px-3 py-1.5 rounded-lg text-sm font-medium w-fit", STATUS_COLORS[enrollment.enrollmentStatus] || 'bg-muted text-muted-foreground')}>
                    {enrollment.enrollmentStatus}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">LMS Status</label>
                {editing ? (
                  <select value={editData.lmsStatus} onChange={e => setEditData((p: any) => ({ ...p, lmsStatus: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm">
                    {['Pending', 'Requested', 'Activated', 'Issue Reported'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-foreground font-medium">{enrollment.lmsStatus || 'Pending'}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Student ID</label>
                {editing ? (
                  <input type="text" value={editData.studentIdNumber} onChange={e => setEditData((p: any) => ({ ...p, studentIdNumber: e.target.value }))}
                    placeholder="Enter student ID..." className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm" />
                ) : (
                  <p className="mt-1 text-sm text-foreground font-medium">{enrollment.studentIdNumber || <span className="text-muted-foreground italic">Pending</span>}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">University Reg. ID</label>
                {editing ? (
                  <input type="text" value={editData.universityRegistrationId} onChange={e => setEditData((p: any) => ({ ...p, universityRegistrationId: e.target.value }))}
                    placeholder="Enter reg. ID..." className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm" />
                ) : (
                  <p className="mt-1 text-sm text-foreground font-medium">{enrollment.universityRegistrationId || <span className="text-muted-foreground italic">Pending</span>}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Orientation</label>
                {editing ? (
                  <select value={editData.orientationStatus} onChange={e => setEditData((p: any) => ({ ...p, orientationStatus: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm">
                    {['Pending', 'Scheduled', 'Attended', 'Missed', 'Not Required'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-foreground font-medium">{enrollment.orientationStatus || 'Pending'}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Assigned Executive</label>
                <p className="mt-1 text-sm text-foreground font-medium">
                  {enrollment.successExecutive?.full_name || <span className="text-muted-foreground italic">Unassigned</span>}
                </p>
              </div>
            </div>

            {editing && (
              <div>
                <label className="text-xs text-muted-foreground">Next Action / Recommendation</label>
                <input type="text" value={editData.nextActionRecommendation}
                  onChange={e => setEditData((p: any) => ({ ...p, nextActionRecommendation: e.target.value }))}
                  placeholder="e.g. Follow up regarding LMS activation..."
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-lg text-sm" />
              </div>
            )}
          </div>

          {/* Checklist */}
          <ChecklistSection enrollmentId={enrollment.id} />

          {/* Support Tickets */}
          <SupportTicketsSection enrollmentId={enrollment.id} />
        </div>

        {/* Right col — Student Info */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> Student Info
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: adm?.student_name },
                { label: 'Email', value: adm?.email },
                { label: 'Phone', value: adm?.phone },
                { label: 'Admission #', value: adm?.admission_number },
                { label: 'Admission Stage', value: adm?.current_stage },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm text-foreground font-medium">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> University & Program
            </h3>
            <div className="space-y-3">
              {[
                { label: 'University', value: adm?.university?.name },
                { label: 'Program', value: adm?.course?.name },
                { label: 'Intake', value: adm?.intake },
                { label: 'Session', value: adm?.academic_session },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm text-foreground font-medium">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Lifecycle Timestamps
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Enrollment Created', value: enrollment.createdAt },
                { label: 'Last Updated', value: enrollment.updatedAt },
                { label: 'LMS Requested', value: enrollment.lmsAccessRequestedAt },
                { label: 'LMS Activated', value: enrollment.lmsAccessActivatedAt },
                { label: 'Orientation Date', value: enrollment.orientationDate },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm text-foreground font-medium">
                    {value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
