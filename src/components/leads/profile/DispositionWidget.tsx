import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { dispositionService } from '../../../lib/dispositionService';
import { DispositionCategory, Disposition, SubDisposition, NextAction } from '../../../types/disposition';
import { LeadStatus } from '../../../types/schema';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { Calendar, Clock, FileText, CheckCircle2, ChevronDown, X, UploadCloud } from 'lucide-react';
import { uploadFileToStorage, generateStoragePath } from '../../../lib/documentStorage';

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div className="relative" ref={ref}>
      <div
        className={`w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none transition-all flex justify-between items-center cursor-pointer ${
          disabled ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={`block truncate pr-2 ${value ? 'text-foreground' : 'text-muted-foreground'}`}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-200 top-full">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground italic">No options</div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  value === opt.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface DispositionWidgetProps {
  leadId: string;
  currentStatus: LeadStatus;
  onSaved: (newStatus?: LeadStatus) => void;
  onCancel: () => void;
}

export function DispositionWidget({ leadId, currentStatus, onSaved, onCancel }: DispositionWidgetProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [subDispositions, setSubDispositions] = useState<SubDisposition[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [selectedSubDisposition, setSelectedSubDisposition] = useState<string>('');
  const [selectedNextAction, setSelectedNextAction] = useState<string>('');
  const [followUpDateTime, setFollowUpDateTime] = useState('');
  const [notes, setNotes] = useState<string>('');
  const [lostReason, setLostReason] = useState<string>('');
  const [competitor, setCompetitor] = useState<string>('');

  // Counseling specific state
  const [counselGender, setCounselGender] = useState('');
  const [counselBudget, setCounselBudget] = useState('');
  const [counselQual, setCounselQual] = useState('');
  const [counselUniv, setCounselUniv] = useState('');
  const [counselCourse, setCounselCourse] = useState('');
  const [counselOtherUniv, setCounselOtherUniv] = useState('');
  const [counselScholarship, setCounselScholarship] = useState('');
  const [counselOffline, setCounselOffline] = useState('');
  const [counselWorking, setCounselWorking] = useState('');

  // Enrollment Details state (For "Semester Fee Paid" sub-disposition)
  const [enrollUniv, setEnrollUniv] = useState('');
  const [enrollProgram, setEnrollProgram] = useState('');
  const [enrollFeeType, setEnrollFeeType] = useState('');
  const [enrollStudentName, setEnrollStudentName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollAppFee, setEnrollAppFee] = useState('');
  const [enrollReceivedAmount, setEnrollReceivedAmount] = useState('');
  const [enrollPaymentType, setEnrollPaymentType] = useState('');
  const [enrollUniScholarship, setEnrollUniScholarship] = useState('');
  const [enrollEdvixScholarship, setEnrollEdvixScholarship] = useState('');
  const [enrollTotalFee, setEnrollTotalFee] = useState('');
  const [enrollDegreeAppId, setEnrollDegreeAppId] = useState('');
  const [enrollScreenshot, setEnrollScreenshot] = useState<File | null>(null);
  const [enrollConversionDate, setEnrollConversionDate] = useState('');
  
  // Loan Specific Details
  const [enrollLoanId, setEnrollLoanId] = useState('');
  const [enrollLoanPartner, setEnrollLoanPartner] = useState('');
  const [enrollLoanTenure, setEnrollLoanTenure] = useState('');
  const [enrollLoanEmail, setEnrollLoanEmail] = useState('');
  const [enrollEdvixScholarshipAmount, setEnrollEdvixScholarshipAmount] = useState('');

  // Loan Rejected Specific Details
  const [lrApplicantName, setLrApplicantName] = useState('');
  const [lrApplicantMobile, setLrApplicantMobile] = useState('');
  const [lrRelationship, setLrRelationship] = useState('');
  const [lrPanCard, setLrPanCard] = useState('');
  const [lrAadhaarCard, setLrAadhaarCard] = useState('');
  const [lrPinCode, setLrPinCode] = useState('');
  const [lrAadhaarMobile, setLrAadhaarMobile] = useState('');
  const [lrAlternateMobile, setLrAlternateMobile] = useState('');
  const [lrAccountName, setLrAccountName] = useState('');
  const [lrBankName, setLrBankName] = useState('');
  const [lrAccountNumber, setLrAccountNumber] = useState('');
  const [lrIfscCode, setLrIfscCode] = useState('');
  const [lrReason, setLrReason] = useState('');
  const [lrPartner, setLrPartner] = useState('');
  const [lrNotes, setLrNotes] = useState('');

  const [universities, setUniversities] = useState<{id: string, name: string}[]>([]);
  const [meetingScreenshot, setMeetingScreenshot] = useState<File | null>(null);
  const [documentLink, setDocumentLink] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.from('universities').select('id, name').order('name').then(res => {
      if (res.data) setUniversities(res.data);
    });
  }, []);

  const activeDisposition = dispositions.find(d => d.id === selectedDisposition);
  const activeSubDisposition = subDispositions.find(sd => sd.id === selectedSubDisposition);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await dispositionService.getCategories();
      setCategories(cats);
    } catch (err) {
      toast.error('Failed to load disposition configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (catId: string) => {
    setSelectedCategory(catId);
    setSelectedDisposition('');
    setSelectedSubDisposition('');
    setSelectedNextAction('');
    setDispositions([]);
    setSubDispositions([]);
    setNextActions([]);
    setFollowUpDateTime('');

    if (!catId) return;
    try {
      const notConnectedCat = categories.find(c => c.name.toUpperCase() === 'NOT CONNECTED');
      if (notConnectedCat && catId === notConnectedCat.id) {
        const disps = await dispositionService.getDispositions(catId);
        setDispositions(disps);
      } else {
        // If 'Connected', fetch all dispositions EXCEPT the 'Not Connected' ones
        const allDisps = await dispositionService.getDispositions();
        const filtered = allDisps.filter(d => d.category_id !== notConnectedCat?.id);
        setDispositions(filtered);
      }
    } catch (err) {
      toast.error('Failed to load dispositions');
    }
  };

  const handleDispositionChange = async (dispId: string) => {
    setSelectedDisposition(dispId);
    setSelectedSubDisposition('');
    setSelectedNextAction('');
    setSubDispositions([]);
    setNextActions([]);
    setFollowUpDateTime('');

    if (!dispId) return;
    try {
      const [subs, actions] = await Promise.all([
        dispositionService.getSubDispositions(dispId),
        dispositionService.getNextActions(dispId)
      ]);
      setSubDispositions(subs);
      setNextActions(actions);
    } catch (err) {
      toast.error('Failed to load options for this disposition');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedDisposition) {
      toast.error('Please select a disposition');
      return;
    }

    if (activeDisposition?.requires_follow_up && !followUpDateTime) {
      toast.error('Follow-up date and time are required');
      return;
    }

    if (activeDisposition?.target_status === 'Lost' && (!lostReason || lostReason.trim() === '')) {
      toast.error('Lost Reason is required when marking a lead as Lost');
      return;
    }

    let finalNotes = notes || '';

    if (activeDisposition?.name === 'Counselled' && activeSubDisposition?.name !== 'Semester Fee Paid') {
      if (!counselGender || !counselBudget || !counselQual || !counselUniv || !counselCourse || !counselOtherUniv || !counselScholarship || !counselOffline || !counselWorking) {
        toast.error('Please fill out all Counseling Details fields');
        return;
      }
      
      const univName = universities.find(u => u.id === counselUniv)?.name || counselUniv;
      const courseName = counselCourse;

      finalNotes = `[Counseling Details]\nGender: ${counselGender}\nBudget: ${counselBudget}\nHighest Qualification: ${counselQual}\nUniversity: ${univName}\nCourse: ${courseName}\nExploring Other University: ${counselOtherUniv}\nEdvix Scholarship Pitched: ${counselScholarship}\nExploring offline Degree: ${counselOffline}\nIs Currently Working: ${counselWorking}\n\n[Additional Notes]\n${notes || 'No additional notes provided.'}`;
    }

    if (activeDisposition?.name === 'Semester Fee Paid') {
      if (!enrollUniv || !enrollProgram || !enrollFeeType || !enrollStudentName || !enrollEmail || !enrollPhone || !enrollAppFee || !enrollReceivedAmount || !enrollPaymentType || !enrollUniScholarship || !enrollEdvixScholarship || !enrollTotalFee || !enrollDegreeAppId || !enrollConversionDate) {
        toast.error('Please fill out all required Enrollment Details fields');
        return;
      }

      if (enrollPaymentType === 'Loan' && (!enrollLoanId || !enrollLoanPartner || !enrollLoanTenure || !enrollLoanEmail)) {
        toast.error('Please fill out all Loan Details fields');
        return;
      }

      if (enrollEdvixScholarship === 'Yes' && !enrollEdvixScholarshipAmount) {
        toast.error('Please specify the Edvix Scholarship Amount');
        return;
      }
      
      const univName = universities.find(u => u.id === enrollUniv)?.name || enrollUniv;
      
      let loanText = '';
      if (enrollPaymentType === 'Loan') {
        loanText = `\nLoan ID: ${enrollLoanId}\nLoan Partner: ${enrollLoanPartner}\nLoan Tenure: ${enrollLoanTenure}\nLoan Sanctioned Email: ${enrollLoanEmail}`;
      }
      
      let scholarshipText = `Edvix Scholarship Opted: ${enrollEdvixScholarship}`;
      if (enrollEdvixScholarship === 'Yes') {
        scholarshipText += `\nEdvix Scholarship Amount: ${enrollEdvixScholarshipAmount}`;
      }

      finalNotes = `[Enrollment Details]\nUniversity: ${univName}\nProgram: ${enrollProgram}\nFee Type: ${enrollFeeType}\nStudent Name: ${enrollStudentName}\nEmail: ${enrollEmail}\nPhone: ${enrollPhone}\nApp Fee: ${enrollAppFee}\nReceived Amount: ${enrollReceivedAmount}\nPayment Type: ${enrollPaymentType}${loanText}\nUni Scholarship: ${enrollUniScholarship}\n${scholarshipText}\nTotal Program Fee: ${enrollTotalFee}\nDegree App ID: ${enrollDegreeAppId}\nConversion Date: ${enrollConversionDate}\n\n[Additional Notes]\n${notes || 'No additional notes provided.'}`;
    }

    if (activeDisposition?.name === 'Loan Rejected') {
      if (!lrApplicantName || !lrApplicantMobile || !lrRelationship || !lrPanCard || !lrAadhaarCard || !lrPinCode || !lrAadhaarMobile || !lrAccountName || !lrBankName || !lrAccountNumber || !lrIfscCode || !lrReason || !lrPartner || !lrNotes) {
        toast.error('Please fill out all required Loan Rejected fields');
        return;
      }
      
      finalNotes = `[Loan Applicant Details]\nName: ${lrApplicantName}\nMobile: ${lrApplicantMobile}\nRelationship: ${lrRelationship}\nPAN: ${lrPanCard}\nAadhaar: ${lrAadhaarCard}\nPIN Code: ${lrPinCode}\nAadhaar Mobile: ${lrAadhaarMobile}\nAlternate Mobile: ${lrAlternateMobile || 'N/A'}\n\n[Bank Account Details]\nAccount Holder: ${lrAccountName}\nBank Name: ${lrBankName}\nAccount Number: ${lrAccountNumber}\nIFSC Code: ${lrIfscCode}\n\n[Rejection Details]\nReason: ${lrReason}\nPartner: ${lrPartner}\nNotes: ${lrNotes}\n\n[Additional Notes]\n${notes || 'No additional notes provided.'}`;
    }

    if (activeDisposition?.requires_note && (!finalNotes || finalNotes.trim() === '')) {
      toast.error('Notes are required for this disposition');
      return;
    }

    if (activeDisposition?.next_action_required && !selectedNextAction) {
      toast.error('Forward Lead Stage is required');
      return;
    }

    if (activeDisposition?.name === 'Document Collected') {
      if (!documentLink.trim() && !documentFile) {
        toast.error('Please provide a document link or upload a document');
        return;
      }
    }

    setIsSaving(true);
    try {
      let uploadedScreenshotUrl = '';
      
      if (meetingScreenshot && activeDisposition?.name === 'Meeting Done') {
        try {
          const path = generateStoragePath(leadId, undefined, meetingScreenshot);
          const uploadedPath = await uploadFileToStorage('documents', path, meetingScreenshot);
          if (uploadedPath) uploadedScreenshotUrl = uploadedPath;
        } catch (err: any) {
          toast.error(`Failed to upload screenshot: ${err.message}`);
          return;
        }
      }

      if (enrollScreenshot && activeDisposition?.name === 'Semester Fee Paid') {
        try {
          const path = generateStoragePath(leadId, undefined, enrollScreenshot);
          const uploadedPath = await uploadFileToStorage('documents', path, enrollScreenshot);
          if (uploadedPath) finalNotes += `\nPayment Screenshot: ${uploadedPath}`;
        } catch (err: any) {
          toast.error(`Failed to upload payment screenshot: ${err.message}`);
          return;
        }
      }

      if (uploadedScreenshotUrl) {
         finalNotes += `\n\n[Meeting Screenshot Uploaded]: ${uploadedScreenshotUrl}`;
      }

      let uploadedDocUrl = '';
      if (documentFile && activeDisposition?.name === 'Document Collected') {
        try {
          const path = generateStoragePath(leadId, undefined, documentFile);
          const uploadedPath = await uploadFileToStorage('documents', path, documentFile);
          const { data } = supabase.storage.from('documents').getPublicUrl(uploadedPath);
          uploadedDocUrl = data.publicUrl;
        } catch (e) {
          console.error("Failed to upload document", e);
          toast.error("Failed to upload document");
          setIsSaving(false);
          return;
        }
      }

      if (activeDisposition?.name === 'Document Collected') {
         if (documentLink.trim()) finalNotes += `\n\n[Document Link]: ${documentLink.trim()}`;
         if (uploadedDocUrl) finalNotes += `\n\n[Document Uploaded]: ${uploadedDocUrl}`;
      }

      let followUpAt = undefined;
      if (followUpDateTime) {
        followUpAt = new Date(followUpDateTime).toISOString();
      }

      await dispositionService.submitDisposition({
        leadId,
        dispositionId: selectedDisposition,
        subDispositionId: selectedSubDisposition || undefined,
        nextActionId: selectedNextAction || undefined,
        notes: finalNotes || undefined,
        followUpAt,
        userId: user.id,
        lostReason: activeDisposition?.target_status === 'Lost' ? lostReason : undefined,
        competitor: activeDisposition?.target_status === 'Lost' ? competitor : undefined
      });

      toast.success('Disposition saved successfully');
      onSaved(activeDisposition?.target_status as LeadStatus | undefined);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save disposition');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
        <h3 className="font-bold text-lg flex items-center gap-2">
          Add Activity
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full font-medium">
            Status: {currentStatus}
          </span>
          <button 
            type="button" 
            onClick={onCancel}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Status *</label>
            <CustomSelect
              value={selectedCategory}
              onChange={handleCategoryChange}
              placeholder="Select Status"
              options={categories
                .filter(c => c.name.toUpperCase() === 'CONTACTED' || c.name.toUpperCase() === 'NOT CONNECTED')
                .map(c => ({
                  value: c.id,
                  label: c.name.toUpperCase() === 'CONTACTED' ? 'Connected' : 'Not Connected'
                }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Sub-Disposition *</label>
            <CustomSelect
              value={selectedDisposition}
              onChange={handleDispositionChange}
              placeholder="Select Sub-Disposition"
              disabled={!selectedCategory}
              options={dispositions.map(d => ({ value: d.id, label: d.name }))}
            />
          </div>

          {activeDisposition?.next_action_required && nextActions.length > 0 && (
            <div className="space-y-1.5 mt-4">
              <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Forward Lead Stage *</label>
              <CustomSelect
                value={selectedNextAction}
                onChange={setSelectedNextAction}
                placeholder="Select Forward Stage"
                options={nextActions.map(na => ({ value: na.id, label: na.name }))}
              />
            </div>
          )}

          {activeDisposition?.name === 'Meeting Done' && (
            <div className="space-y-1.5 mt-4">
              <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5" /> Meeting Screenshot (Optional)
              </label>
              <div className="flex items-center gap-4 bg-background border border-input rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMeetingScreenshot(e.target.files?.[0] || null)}
                  className="w-full text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {meetingScreenshot && (
                  <button type="button" onClick={() => setMeetingScreenshot(null)} className="p-1 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeDisposition?.name === 'Document Collected' && (
            <div className="space-y-1.5 mt-4">
              <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5" /> Document Upload *
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="Enter document link"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                />
                <div className="flex items-center justify-center">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">or</span>
                </div>
                <div className="flex items-center gap-4 bg-background border border-input rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    className="w-full text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {documentFile && (
                    <button type="button" onClick={() => setDocumentFile(null)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Fields based on active disposition */}
        {activeDisposition && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            
            {activeDisposition?.name === 'Semester Fee Paid' && (
              <div className="mt-6 mb-6">
                <h4 className="text-sm font-bold text-primary mb-4">Enrollment Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Enrolled University Name *</label>
                    <CustomSelect
                      value={enrollUniv}
                      onChange={setEnrollUniv}
                      placeholder="Select University"
                      options={universities.map(u => ({ value: u.id, label: u.name }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Enrolled Program Name *</label>
                    <CustomSelect
                      value={enrollProgram}
                      onChange={setEnrollProgram}
                      placeholder="Select Program"
                      options={[
                        { value: 'BTech', label: 'BTech' },
                        { value: 'MBA', label: 'MBA' },
                        { value: 'BBA', label: 'BBA' },
                        { value: 'BCA', label: 'BCA' },
                        { value: 'MCA', label: 'MCA' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Fee Paid Type *</label>
                    <CustomSelect
                      value={enrollFeeType}
                      onChange={setEnrollFeeType}
                      placeholder="Select Fee Type"
                      options={[
                        { value: 'Full Paid', label: 'Full Paid' },
                        { value: 'Yearly Wise', label: 'Yearly Wise' },
                        { value: 'Semester Wise', label: 'Semester Wise' }
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Student Name *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Student Name"
                      value={enrollStudentName}
                      onChange={e => setEnrollStudentName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Enrolled Email ID *</label>
                    <input 
                      type="email"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Email"
                      value={enrollEmail}
                      onChange={e => setEnrollEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Enrolled Phone Number *</label>
                    <input 
                      type="tel"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Phone"
                      value={enrollPhone}
                      onChange={e => setEnrollPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Regis/App Fee *</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Fee Amount"
                      value={enrollAppFee}
                      onChange={e => setEnrollAppFee(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Received Amount *</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Amount"
                      value={enrollReceivedAmount}
                      onChange={e => setEnrollReceivedAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Payment Type *</label>
                    <CustomSelect
                      value={enrollPaymentType}
                      onChange={setEnrollPaymentType}
                      placeholder="Select Payment Type"
                      options={[
                        { value: 'Self', label: 'Self' },
                        { value: 'Loan', label: 'Loan' }
                      ]}
                    />
                  </div>

                  {enrollPaymentType === 'Loan' && (
                    <>
                      <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Loan ID *</label>
                        <input 
                          type="text"
                          className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                          placeholder="Enter Loan ID"
                          value={enrollLoanId}
                          onChange={e => setEnrollLoanId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Unique Loan Partner Name *</label>
                        <CustomSelect
                          value={enrollLoanPartner}
                          onChange={setEnrollLoanPartner}
                          placeholder="Select Unique Loan Partner Name"
                          options={[
                            { value: 'Propelld', label: 'Propelld' },
                            { value: 'Avanse', label: 'Avanse' },
                            { value: 'Fibe', label: 'Fibe' },
                            { value: 'Gray Quest', label: 'Gray Quest' },
                            { value: 'Tcpl (techfino)', label: 'Tcpl (techfino)' },
                            { value: 'Finz Finance', label: 'Finz Finance' },
                            { value: 'Kuhoo', label: 'Kuhoo' },
                            { value: 'Jodo', label: 'Jodo' },
                            { value: 'Auxilo', label: 'Auxilo' },
                            { value: 'Caprion', label: 'Caprion' }
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Unique Tenures *</label>
                        <CustomSelect
                          value={enrollLoanTenure}
                          onChange={setEnrollLoanTenure}
                          placeholder="Select Unique Tenures"
                          options={[
                            { value: '6 Months', label: '6 Months' },
                            { value: '9 Months', label: '9 Months' },
                            { value: '12 Months', label: '12 Months' },
                            { value: '18 Months', label: '18 Months' },
                            { value: '24 Months', label: '24 Months' },
                            { value: '36 Months', label: '36 Months' }
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Loan Sanctioned Mail-ID *</label>
                        <input 
                          type="email"
                          className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                          placeholder="Enter Email"
                          value={enrollLoanEmail}
                          onChange={e => setEnrollLoanEmail(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Uni. Scholarship Amount *</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Amount"
                      value={enrollUniScholarship}
                      onChange={e => setEnrollUniScholarship(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Edvix Scholarship Opted *</label>
                    <CustomSelect
                      value={enrollEdvixScholarship}
                      onChange={setEnrollEdvixScholarship}
                      placeholder="Select Option"
                      options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' }
                      ]}
                    />
                  </div>

                  {enrollEdvixScholarship === 'Yes' && (
                    <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Scholarship Amount *</label>
                      <input 
                        type="number"
                        className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                        placeholder="Enter Amount"
                        value={enrollEdvixScholarshipAmount}
                        onChange={e => setEnrollEdvixScholarshipAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Total Program Fee *</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Fee"
                      value={enrollTotalFee}
                      onChange={e => setEnrollTotalFee(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Degree App ID *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter Degree App ID"
                      value={enrollDegreeAppId}
                      onChange={e => setEnrollDegreeAppId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" /> Payment Screenshot *
                    </label>
                    <div className="flex items-center gap-4 bg-background border border-input rounded-lg px-3 py-1.5 text-sm focus-within:border-primary transition-all h-[42px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEnrollScreenshot(e.target.files?.[0] || null)}
                        className="w-full text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {enrollScreenshot && (
                        <button type="button" onClick={() => setEnrollScreenshot(null)} className="p-1 text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1.5 border-t border-border pt-4 mt-2">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Conversion Date *
                    </label>
                    <input 
                      type="datetime-local"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-all"
                      value={enrollConversionDate}
                      onChange={(e) => setEnrollConversionDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDisposition?.name === 'Loan Rejected' && (
              <div className="mt-6 mb-6">
                <h4 className="text-sm font-bold text-primary mb-4">Loan Applicant Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border mb-6">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Loan Applicant Name *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter applicant name"
                      value={lrApplicantName}
                      onChange={e => setLrApplicantName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Loan Applicant Mobile Number *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter 10-digit mobile number"
                      value={lrApplicantMobile}
                      onChange={e => setLrApplicantMobile(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Relationship with the Learner *</label>
                    <CustomSelect
                      value={lrRelationship}
                      onChange={setLrRelationship}
                      placeholder="Select relationship"
                      options={[
                        { value: 'Self', label: 'Self' },
                        { value: 'Father', label: 'Father' },
                        { value: 'Mother', label: 'Mother' },
                        { value: 'Sibling', label: 'Sibling' },
                        { value: 'Spouse', label: 'Spouse' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">PAN Card Number *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary uppercase"
                      placeholder="E.g. ABCDE1234F"
                      value={lrPanCard}
                      onChange={e => setLrPanCard(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Aadhaar Card Number *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="XXXX XXXX XXXX"
                      value={lrAadhaarCard}
                      onChange={e => setLrAadhaarCard(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">PIN Code (as per Aadhaar Card) *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter 6-digit PIN code"
                      value={lrPinCode}
                      onChange={e => setLrPinCode(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Aadhaar-Registered Mobile Number *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter 10-digit mobile number"
                      value={lrAadhaarMobile}
                      onChange={e => setLrAadhaarMobile(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Alternate Mobile Number</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Optional"
                      value={lrAlternateMobile}
                      onChange={e => setLrAlternateMobile(e.target.value)}
                    />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-primary mb-4">Bank Account Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border mb-6">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Account Holder Name *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter account holder name"
                      value={lrAccountName}
                      onChange={e => setLrAccountName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Bank Name *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter bank name"
                      value={lrBankName}
                      onChange={e => setLrBankName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Account Number *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter account number (6-18 digits)"
                      value={lrAccountNumber}
                      onChange={e => setLrAccountNumber(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">IFSC Code *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary uppercase"
                      placeholder="E.g. SBIN0001234"
                      value={lrIfscCode}
                      onChange={e => setLrIfscCode(e.target.value)}
                    />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-primary mb-4">Rejection Details</h4>
                <div className="grid grid-cols-1 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Reason for Loan Rejection *</label>
                    <CustomSelect
                      value={lrReason}
                      onChange={setLrReason}
                      placeholder="Select reason"
                      options={[
                        { value: 'Poor Average Bank Balance (abb) Score', label: 'Poor Average Bank Balance (abb) Score' },
                        { value: 'Low Cibil Score (below 620)', label: 'Low Cibil Score (below 620)' },
                        { value: 'New-to-cibil (no Credit History)', label: 'New-to-cibil (no Credit History)' },
                        { value: 'High Fixed Obligation To Income Ratio (foir)', label: 'High Fixed Obligation To Income Ratio (foir)' },
                        { value: 'Pin Code Not Serviceable', label: 'Pin Code Not Serviceable' },
                        { value: 'Co-applicant Not A Blood Relative', label: 'Co-applicant Not A Blood Relative' },
                        { value: 'E-nach Not Possible (mobile Number Not Linked To Bank Account)', label: 'E-nach Not Possible (mobile Number Not Linked To Bank Account)' },
                        { value: 'Video Kyc (v-kyc) Language Barrier', label: 'Video Kyc (v-kyc) Language Barrier' },
                        { value: 'Pan Verification Failed', label: 'Pan Verification Failed' },
                        { value: 'Name Mismatch Between Pan And Aadhaar', label: 'Name Mismatch Between Pan And Aadhaar' },
                        { value: 'Age Exceeds Eligibility Criteria', label: 'Age Exceeds Eligibility Criteria' },
                        { value: 'Bank Does Not Support E-nach', label: 'Bank Does Not Support E-nach' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Rejected by Loan Partner *</label>
                    <input 
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter loan partner name"
                      value={lrPartner}
                      onChange={e => setLrPartner(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Notes *</label>
                    <textarea 
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary min-h-[80px]"
                      placeholder="Enter notes"
                      value={lrNotes}
                      onChange={e => setLrNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDisposition.requires_follow_up && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 space-y-1.5">
                <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Follow-up Date & Time *
                </label>
                <input 
                  type="datetime-local"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={followUpDateTime}
                  onChange={(e) => setFollowUpDateTime(e.target.value)}
                  required
                />
              </div>
            )}

            {activeDisposition.name === 'Counselled' && activeDisposition?.name !== 'Semester Fee Paid' && (
              <div className="mt-6">
                <h4 className="text-sm font-bold text-primary mb-4">Counseling Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-secondary/20 p-4 rounded-xl border border-border">
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Gender *</label>
                    <CustomSelect value={counselGender} onChange={setCounselGender} placeholder="Select Gender" options={[
                      { label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Other', value: 'Other' }
                    ]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Budget *</label>
                    <CustomSelect value={counselBudget} onChange={setCounselBudget} placeholder="Select Budget" options={[
                      { label: '< 1 Lac', value: '< 1 Lac' }, { label: '1 Lac - 3 Lacs', value: '1 Lac - 3 Lacs' },
                      { label: '3 Lacs - 5 Lacs', value: '3 Lacs - 5 Lacs' }, { label: '5 Lacs - 10 Lacs', value: '5 Lacs - 10 Lacs' },
                      { label: '10+ Lacs', value: '10+ Lacs' }
                    ]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Highest Qualification *</label>
                    <CustomSelect value={counselQual} onChange={setCounselQual} placeholder="Select Qualification" options={[
                      { label: '10th', value: '10th' }, { label: '12th', value: '12th' },
                      { label: 'Diploma', value: 'Diploma' }, { label: 'Undergraduate', value: 'Undergraduate' },
                      { label: 'Postgraduate', value: 'Postgraduate' }
                    ]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">University Name *</label>
                    <CustomSelect value={counselUniv} onChange={setCounselUniv} placeholder="Select University" options={universities.map(u => ({ label: u.name, value: u.id }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Degree_Counselled For Course *</label>
                    <CustomSelect value={counselCourse} onChange={setCounselCourse} placeholder="Select Course" options={[
                      'MBA', 'BBA', 'BCA', 'MCA', 'B.Com', 'M.Com', 'BA', 'MA', 'B.Sc', 'M.Sc', 'B.Tech', 'M.Tech', 'Diploma', 'BA-JMC', 'MA-JMC', 'MSDS', 'M.Des'
                    ].map(c => ({ label: c, value: c }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Exploring Other University *</label>
                    <CustomSelect value={counselOtherUniv} onChange={setCounselOtherUniv} placeholder="Select Option" options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Edvix Scholarship Pitched *</label>
                    <CustomSelect value={counselScholarship} onChange={setCounselScholarship} placeholder="Select Option" options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Exploring offline Degree *</label>
                    <CustomSelect value={counselOffline} onChange={setCounselOffline} placeholder="Select Option" options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Is Currently Working *</label>
                    <CustomSelect value={counselWorking} onChange={setCounselWorking} placeholder="Select Option" options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} />
                  </div>
                </div>
              </div>
            )}

            {activeDisposition.target_status === 'Lost' && (
              <div className="grid grid-cols-1 gap-4 mt-4 bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                <div className="space-y-1.5">
                  <label className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">
                    {activeDisposition.name === 'Not Interested' ? 'Not Interested Reason' : 'Lost Reason'} <span className="text-destructive">*</span>
                  </label>
                  <CustomSelect
                    value={lostReason}
                    onChange={setLostReason}
                    placeholder="Select Reason"
                    options={activeDisposition.name === 'Not Interested' ? [
                      "Irrelevant Domain/program", "Curriculum Misalignment", "No Academic Partnership",
                      "Preferred Session Type (live Vs. Self-paced)", "Not Offered", "Financial Constraints",
                      "Time Constraints", "Relocating (moving Abroad)", "Unsuitable Faculty", "Course Unavailable",
                      "Not Enquired", "Looking For Job Opportunities Instead", "Linguistic Barrier",
                      "Stopped Responding", "Seeking Information Only, No Intent To Enroll",
                      "Enrolled With Competitor", "Specialization Not Available", "Academically Ineligible",
                      "Test Lead", "Duplicate Lead", "University Scholarship (for Jal Javan Like Cases)",
                      "Want's Distance/offline", "Pursuing Graduation/diploma Holder/pursuing 12th/foreign Student",
                      "Interested In Next Batch"
                    ].map(r => ({ value: r, label: r })) : [
                      "Budget Issue", "Eligibility Issue", "Chose Offline Program",
                      "Competitor Selected", "Duplicate Lead", "Other"
                    ].map(r => ({ value: r, label: r }))}
                  />
                </div>
                {(lostReason === 'Enrolled With Competitor' || lostReason === 'Competitor Selected') && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Competitor (if applicable)</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="E.g., University X"
                      value={competitor}
                      onChange={(e) => setCompetitor(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5 pt-4">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 
            Notes {activeDisposition?.requires_note && <span className="text-destructive">*</span>}
          </label>
          <textarea 
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[80px] resize-y"
            placeholder={activeDisposition?.requires_note ? "Please provide details..." : "Add any additional context..."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required={activeDisposition?.requires_note || false}
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSaving || !selectedDisposition}
            className="flex-1 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Save Disposition
          </button>
        </div>
      </form>
    </div>
  );
}
