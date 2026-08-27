import { useState } from 'react';
import { Lead } from '../../../../types/schema';
import { useAdmissions } from '../../../../hooks/useAdmissions';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import { Admission } from '../../../../types/admission';
import { AdmissionGating } from '../../../../lib/counseling/AdmissionGating';
import { toast } from 'sonner';

export function AdmissionTab({ lead }: { lead: Lead }) {
  const navigate = useNavigate();
  const { admissions, addAdmission, isLoading } = useAdmissions();
  
  const admission = admissions.find(a => a.leadId === lead.id);

  const initiateAdmission = async () => {
    // Phase 2 Gating Check
    const gatingResult = await AdmissionGating.checkEligibility(lead.id);
    if (!gatingResult.allowed) {
       toast.error(`Admission Blocked: ${gatingResult.reason}`);
       return;
    }
    
    const res = await addAdmission({
      leadId: lead.id,
      studentName: lead.name,
      email: lead.email,
      phone: lead.phone,
      courseId: typeof lead.course === 'object' ? (lead.course as any)?.id : undefined,
      universityId: typeof lead.university === 'object' ? (lead.university as any)?.id : undefined,
      stage: 'Application Started',
      intake: 'Jul',
      academicSession: `${new Date().getFullYear()}-${new Date().getFullYear()+1}`,
      counselorName: 'Current User'
    });
    
    if (res.success) {
      toast.success('Admission initiated successfully!');
    } else {
      toast.error('Failed to initiate admission');
    }
  };

  return (
    <div className="p-6 animate-in fade-in duration-300 h-full flex flex-col">
      <h3 className="text-lg font-bold mb-6">Admission Journey</h3>
      
      {admission ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-2">Admission in Progress</h4>
          <p className="text-sm text-muted-foreground mb-6">
            Student is currently in the <span className="font-semibold text-primary">{admission.stage}</span> stage.
          </p>
          
          <button
            onClick={() => navigate(`/admissions/${admission.id}`)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            View Admission Profile <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 border border-dashed border-border rounded-xl p-8 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h4 className="text-lg font-bold text-foreground mb-2">No Admission Record</h4>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            This student has not started their admission process yet. Initiate admission when the student is ready to enroll.
          </p>
          <button
            onClick={initiateAdmission}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            Initiate Admission
          </button>
        </div>
      )}
    </div>
  );
}
