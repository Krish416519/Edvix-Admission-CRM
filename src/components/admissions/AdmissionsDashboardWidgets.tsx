import React from 'react';
import { Admission, AdmissionStage } from '../../types/admission';
import { 
  GraduationCap, CheckCircle2, FileText, IndianRupee, 
  Building, Key, Clock
} from 'lucide-react';

const STAGES: AdmissionStage[] = [
  'Admission Confirmed',
  'Application Started',
  'Documents Pending',
  'Documents Uploaded',
  'Documents Verified',
  'ABC ID Created',
  'DEB ID Created',
  'University Verification',
  'Fee Payment Pending',
  'Fee Payment Completed',
  'Enrollment Number Received',
  'LMS Credentials Received',
  'Admission Completed'
];

export function AdmissionsDashboardWidgets({ admissions }: { admissions: Admission[] }) {
  const inProgress = admissions.filter(a => a.stage !== 'Admission Completed').length;
  
  // Use rolling 24 hours to avoid midnight rollover confusion
  const completedToday = admissions.filter(a => {
    if (a.stage !== 'Admission Completed') return false;
    const diff = Date.now() - new Date(a.updatedAt).getTime();
    return diff <= 24 * 60 * 60 * 1000;
  }).length;

  const pendingDocs = admissions.filter(a => a.stage === 'Documents Pending').length;
  const pendingPayments = admissions.filter(a => a.stage === 'Fee Payment Pending').length;
  const univVerification = admissions.filter(a => a.stage === 'University Verification').length;
  const lmsPending = admissions.filter(a => STAGES.indexOf(a.stage) < STAGES.indexOf('LMS Credentials Received') && STAGES.indexOf(a.stage) >= STAGES.indexOf('University Verification')).length;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6 overflow-x-auto pb-2 hide-scrollbar">
      <Widget title="In Progress" value={inProgress} icon={<GraduationCap className="w-4 h-4 text-blue-500" />} />
      <Widget title="Completed Today" value={completedToday} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} />
      <Widget title="Pending Docs" value={pendingDocs} icon={<FileText className="w-4 h-4 text-amber-500" />} />
      <Widget title="Pending Payments" value={pendingPayments} icon={<IndianRupee className="w-4 h-4 text-red-500" />} />
      <Widget title="Univ. Verification" value={univVerification} icon={<Building className="w-4 h-4 text-purple-500" />} />
      <Widget title="LMS Pending" value={lmsPending} icon={<Key className="w-4 h-4 text-emerald-500" />} />
      <Widget title="Avg. Time" value="14 Days" icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
    </div>
  );
}

function Widget({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm min-w-[140px] flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-muted rounded-lg">{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">{title}</h3>
      </div>
    </div>
  );
}
