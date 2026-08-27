import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileText, CheckCircle2, Circle, AlertCircle, 
  Copy, Check, Clock, User, Phone, Mail, FileCheck2, GraduationCap, Calendar, Eye, Download, Trash2, Loader2 
} from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { useDocuments } from '../../hooks/useDocuments';
import { Admission, AdmissionStage, AdmissionChecklistItem } from '../../types/admission';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '../ConfirmDialog';

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

export function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { admissions, updateAdmission, isLoading } = useAdmissions();
  
  const admission = admissions.find(a => a.id === id);
  const [copied, setCopied] = useState<string | null>(null);
  const [localChecklist, setLocalChecklist] = useState<AdmissionChecklistItem[]>([]);
  
  // Safe to pass admission?.id; useDocuments should handle undefined gracefully
  const { documents, isLoading: isDocsLoading, uploadDocument, deleteDocument, getSignedUrl } = useDocuments(admission?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return <div className="p-8">Loading admission details...</div>;
  }

  if (!admission) {
    return <div className="p-8">Admission not found</div>;
  }

  const currentStageIndex = STAGES.indexOf(admission.stage);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadDocument(file, 'General Document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    setLocalChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    toast.success('Checklist updated');
  };

  const advanceStage = async (stageName: AdmissionStage) => {
    // Validations
    if (stageName === 'Documents Verified') {
      // Document upload is no longer mandatory to advance.
      // const allDocsUploaded = documents.length > 0;
      // if (!allDocsUploaded) {
      //   toast.error('Cannot verify documents before upload.');
      //   return;
      // }
    }
    
    if (stageName === 'LMS Credentials Received') {
      const isVerified = STAGES.indexOf(admission.stage) >= STAGES.indexOf('University Verification');
      if (!isVerified) {
        toast.error('Cannot mark LMS received before university verification.');
        return;
      }
    }

    if (stageName === 'Admission Completed') {
      if (!admission.enrollmentNumber) {
        toast.error('Cannot mark admission complete without enrollment number.');
        return;
      }
    }
    
    await updateAdmission(admission.id, { stage: stageName });
    toast.success(`Stage advanced to ${stageName}`);

    // Automations
    if (stageName === 'Documents Pending') {
      toast.info('Automation: Document collection task created.');
      toast.info('Automation: Notification sent to counselor for pending documents.');
    }
    if (stageName === 'Fee Payment Completed') {
      toast.info('Automation: Accounts department has been notified of the fee payment.');
    }
    if (stageName === 'University Verification') {
      toast.info('Automation: Counselor notified that university verification is in progress.');
    }
    if (stageName === 'Enrollment Number Received') {
      toast.info('Automation: Counselor notified of Enrollment Number.');
    }
    if (stageName === 'LMS Credentials Received') {
      toast.info('Automation: Counselor notified of LMS credentials.');
      setTimeout(() => {
        if (admission.enrollmentNumber) {
          advanceStage('Admission Completed');
          toast.success('Automation: Admission marked as completed!');
        } else {
          toast.info('Automation: Add Enrollment Number to automatically complete admission.');
        }
      }, 1500);
    }
  };
  
  const getStageColor = (index: number) => {
    if (index < currentStageIndex) return "bg-green-500 border-green-500 text-white"; // Completed
    if (index === currentStageIndex) return "bg-blue-500 border-blue-500 text-white"; // Current
    return "bg-card border-muted-foreground/30 text-muted-foreground"; // Pending
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admissions')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {admission.studentName}
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {admission.id}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{admission.course} • {admission.university}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Progress & Checklist */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Tracker */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Admission Progress</h3>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{Math.round((currentStageIndex / (STAGES.length - 1)) * 100)}%</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-muted rounded-full" />
              
              <div className="space-y-6">
                {STAGES.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const isNext = index === currentStageIndex + 1;
                  
                  return (
                    <div key={stage} className="relative flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm z-10 transition-colors",
                        getStageColor(index)
                      )}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                      </div>
                      
                      <div className="flex-1 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className={cn(
                            "font-semibold text-sm",
                            isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {stage}
                          </h4>
                          {isNext && (
                            <button 
                              onClick={() => advanceStage(stage)}
                              className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20"
                            >
                              Mark as Completed
                            </button>
                          )}
                        </div>
                        {isCurrent && (
                          <p className="text-xs text-blue-500 font-medium mt-1">
                            Currently in this stage.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-primary" />
                Admission Checklist
              </h3>
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border/50">
                {localChecklist.filter(c => c.completed).length} / {localChecklist.length} Completed
              </span>
            </div>
            
            <div className="space-y-3">
              {localChecklist.map((item) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                    item.completed ? "bg-muted/30 border-border" : "bg-card border-border hover:border-primary/40 hover:bg-muted/10 shadow-sm"
                  )}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  <button className={cn(
                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                    item.completed ? "bg-primary border-primary text-white" : "border-muted-foreground hover:border-primary text-transparent"
                  )}>
                    <Check className={cn("w-3 h-3", item.completed ? "text-white" : "hover:text-primary")} />
                  </button>
                  <span className={cn(
                    "text-sm font-medium pt-0.5",
                    item.completed ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Details & Documents */}
        <div className="space-y-6">
          
          {/* Admission Info */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Admission Info</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Intake / Session</p>
                  <p className="text-sm font-medium text-foreground">{admission.intake || 'N/A'} • {admission.academicSession || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Assigned Counselor</p>
                  <p className="text-sm font-medium text-foreground">{admission.counselorName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expected Completion</p>
                  <p className="text-sm font-medium text-foreground">
                    {admission.expectedCompletionDate ? new Date(admission.expectedCompletionDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Student Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Email</p>
                  <p className="text-sm font-medium text-foreground">{admission.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Phone</p>
                  <p className="text-sm font-medium text-foreground">{admission.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Program</p>
                  <p className="text-sm font-medium text-foreground">{admission.course}</p>
                  <p className="text-xs text-muted-foreground">{admission.university}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ID Information */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Identifiers</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">ABC ID</p>
                {admission.abcId ? ( 
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-sm font-medium font-mono">{admission.abcId}</span>
                    <button 
                      onClick={() => handleCopy(admission.abcId!, 'abc')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copy ABC ID"
                    >
                      {copied === 'abc' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed border-border bg-muted/10 text-xs text-muted-foreground flex items-center justify-center">
                    Not created yet
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">DEB ID</p>
                {admission.debId ? ( 
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-sm font-medium font-mono">{admission.debId}</span>
                    <button 
                      onClick={() => handleCopy(admission.debId!, 'deb')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copy DEB ID"
                    >
                      {copied === 'deb' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed border-border bg-muted/10 text-xs text-muted-foreground flex items-center justify-center">
                    Not created yet
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Enrollment Number</p>
                {admission.enrollmentNumber ? ( 
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-sm font-medium font-mono">{admission.enrollmentNumber}</span>
                    <button 
                      onClick={() => handleCopy(admission.enrollmentNumber!, 'enrollment')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copy Enrollment Number"
                    >
                      {copied === 'enrollment' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed border-border bg-muted/10 text-xs text-muted-foreground flex items-center justify-center">
                    <input 
                      type="text" 
                      placeholder="Enter Enrollment Number" 
                      className="bg-transparent border-none focus:outline-none w-full text-center"
                      onBlur={async (e) => {
                        if (e.target.value) {
                          await updateAdmission(admission.id, { enrollmentNumber: e.target.value });
                          toast.success('Enrollment Number saved');
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Documents</h3>
            </div>
            
            <div className="space-y-3">
              {isDocsLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[150px]">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.size && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{doc.size}</span>}
                          {doc.status === 'Verified' ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                          ) : doc.status === 'Pending' ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider"><AlertCircle className="w-3 h-3" /> Pending</span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">{doc.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={async () => {
                          const url = await getSignedUrl(doc.id);
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm({
                            title: 'Delete Document',
                            message: 'Are you sure you want to delete this document?',
                            confirmLabel: 'Delete',
                            variant: 'danger'
                          })) {
                            await deleteDocument(doc.id);
                          }
                        }}
                        className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 border border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground text-sm">
                  No documents uploaded yet
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
