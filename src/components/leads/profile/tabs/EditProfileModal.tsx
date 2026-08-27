import { useState, useEffect } from 'react';
import { Lead } from '../../../../types/schema';
import { X, Save, GraduationCap, Briefcase, Target, Building } from 'lucide-react';
import { toast } from 'sonner';

interface EditProfileModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
}

export function EditProfileModal({ lead, isOpen, onClose, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        state: lead.state || '',
        city: lead.city || '',
        
        // Academic Profile
        tenthBoard: lead.tenthBoard || '',
        tenthPassingYear: lead.tenthPassingYear || undefined,
        tenthPercentage: lead.tenthPercentage || undefined,
        twelfthBoard: lead.twelfthBoard || '',
        twelfthStream: lead.twelfthStream || '',
        twelfthPassingYear: lead.twelfthPassingYear || undefined,
        twelfthPercentage: lead.twelfthPercentage || undefined,
        graduationDegree: lead.graduationDegree || '',
        graduationUniversity: lead.graduationUniversity || '',
        graduationPassingYear: lead.graduationPassingYear || undefined,
        graduationPercentage: lead.graduationPercentage || undefined,
        graduationMode: lead.graduationMode || '',
        graduationBacklogs: lead.graduationBacklogs || 0,
        postGraduationDegree: lead.postGraduationDegree || '',
        postGraduationUniversity: lead.postGraduationUniversity || '',
        postGraduationPercentage: lead.postGraduationPercentage || undefined,
        postGraduationPassingYear: lead.postGraduationPassingYear || undefined,
        gapYears: lead.gapYears || 0,
        gapExplanation: lead.gapExplanation || '',
        
        // Professional Profile
        employmentStatus: lead.employmentStatus || '',
        company: lead.company || '',
        jobTitle: lead.jobTitle || '',
        yearsOfExperience: lead.yearsOfExperience || undefined,
        industry: lead.industry || '',
        annualIncome: lead.annualIncome || undefined,
        
        // Career Profile
        careerGoal: lead.careerGoal || '',
        targetRole: lead.targetRole || '',
        motivation: lead.motivation || '',
        
        // Admission Requirements
        course: lead.course || '', 
        preferredSpecialization: lead.preferredSpecialization || '',
        university: lead.university || '', 
        preferredIntake: lead.preferredIntake || '',
        budget: lead.budget || '',
        needEmi: lead.needEmi ?? undefined,
        needScholarship: lead.needScholarship ?? undefined,
        preferredLearningMode: lead.preferredLearningMode || '',
        needPlacementSupport: lead.needPlacementSupport ?? undefined,
        universityBrandPreference: lead.universityBrandPreference || '',
        urgency: lead.urgency || '',
      });
    }
  }, [isOpen, lead]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = value ? parseFloat(value) : undefined;
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSave = () => {
    onSave(formData);
    toast.success('360° Profile updated successfully');
    onClose();
  };

  const renderField = (label: string, name: keyof Lead, value: any, type: string = 'text', options?: string[]) => (
    <div className="flex flex-col gap-1.5" key={name}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {type === 'checkbox' ? (
         <div className="flex items-center h-9">
            <input 
              type="checkbox"
              name={name}
              checked={!!value}
              onChange={handleChange}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
            />
         </div>
      ) : options ? (
        <select
          name={name}
          value={value || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select...</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : type === 'textarea' ? (
         <textarea 
          name={name}
          value={value || ''}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      ) : (
        <input 
          type={type}
          name={name}
          value={value || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full max-w-4xl max-h-[90vh] bg-card border border-border shadow-2xl rounded-xl z-50 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Edit 360° Student Profile
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Personal Information */}
          <section>
             <h3 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
               <Target className="w-4 h-4 text-muted-foreground" /> Personal Information
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {renderField('Full Name', 'name', formData.name)}
                {renderField('Phone Number', 'phone', formData.phone)}
                {renderField('Email Address', 'email', formData.email)}
                {renderField('State', 'state', formData.state)}
                {renderField('City', 'city', formData.city)}
             </div>
          </section>

          {/* Academic Profile */}
          <section>
             <h3 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
               <GraduationCap className="w-4 h-4 text-muted-foreground" /> Academic Profile
             </h3>
             
             <h4 className="text-xs font-bold text-muted-foreground mb-3">10th Standard</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
               {renderField('Board', 'tenthBoard', formData.tenthBoard)}
               {renderField('Passing Year', 'tenthPassingYear', formData.tenthPassingYear, 'number')}
               {renderField('Percentage/CGPA', 'tenthPercentage', formData.tenthPercentage, 'number')}
             </div>

             <h4 className="text-xs font-bold text-muted-foreground mb-3">12th / Diploma</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
               {renderField('Board', 'twelfthBoard', formData.twelfthBoard)}
               {renderField('Stream', 'twelfthStream', formData.twelfthStream, 'text', ['Science', 'Commerce', 'Arts', 'Diploma', 'Not Applicable'])}
               {renderField('Passing Year', 'twelfthPassingYear', formData.twelfthPassingYear, 'number')}
               {renderField('Percentage/CGPA', 'twelfthPercentage', formData.twelfthPercentage, 'number')}
             </div>
             
             <h4 className="text-xs font-bold text-muted-foreground mb-3">Graduation</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
               {renderField('Degree', 'graduationDegree', formData.graduationDegree)}
               {renderField('University', 'graduationUniversity', formData.graduationUniversity)}
               {renderField('Passing Year', 'graduationPassingYear', formData.graduationPassingYear, 'number')}
               {renderField('Percentage/CGPA', 'graduationPercentage', formData.graduationPercentage, 'number')}
               {renderField('Mode', 'graduationMode', formData.graduationMode, 'text', ['Regular', 'Distance', 'Online', 'Unknown'])}
               {renderField('Active Backlogs', 'graduationBacklogs', formData.graduationBacklogs, 'number')}
             </div>

             <h4 className="text-xs font-bold text-muted-foreground mb-3">Post-Graduation</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
               {renderField('Degree', 'postGraduationDegree', formData.postGraduationDegree)}
               {renderField('University', 'postGraduationUniversity', formData.postGraduationUniversity)}
               {renderField('Passing Year', 'postGraduationPassingYear', formData.postGraduationPassingYear, 'number')}
               {renderField('Percentage/CGPA', 'postGraduationPercentage', formData.postGraduationPercentage, 'number')}
             </div>

             <h4 className="text-xs font-bold text-muted-foreground mb-3">Other Academic Details</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
               {renderField('Gap Years', 'gapYears', formData.gapYears, 'number')}
               <div className="col-span-1 md:col-span-2">
                 {renderField('Gap Explanation', 'gapExplanation', formData.gapExplanation, 'textarea')}
               </div>
             </div>
          </section>

          {/* Professional Profile */}
          <section>
             <h3 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
               <Briefcase className="w-4 h-4 text-muted-foreground" /> Professional Profile
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
               {renderField('Employment Status', 'employmentStatus', formData.employmentStatus, 'text', ['Fresher', 'Working Professional', 'Self Employed', 'Business Owner', 'Student', 'Other'])}
               {renderField('Company', 'company', formData.company)}
               {renderField('Job Title', 'jobTitle', formData.jobTitle)}
               {renderField('Industry', 'industry', formData.industry)}
               {renderField('Years of Experience', 'yearsOfExperience', formData.yearsOfExperience, 'number')}
               {renderField('Annual Salary Range', 'annualIncome', formData.annualIncome, 'text', ['< 3 LPA', '3-5 LPA', '5-10 LPA', '10-20 LPA', '20+ LPA'])}
             </div>
          </section>

          {/* Career & Admission Requirements */}
          <section>
             <h3 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
               <Building className="w-4 h-4 text-muted-foreground" /> Career & Admission Requirements
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
               {renderField('Current Goal', 'careerGoal', formData.careerGoal, 'text', ['Career Growth', 'Career Switch', 'Promotion', 'Higher Education', 'Degree Completion', 'Job Search', 'Business Growth', 'Other'])}
               {renderField('Target Role', 'targetRole', formData.targetRole)}
               {renderField('Target Program', 'course', formData.course)}
               {renderField('Preferred Specialization', 'preferredSpecialization', formData.preferredSpecialization)}
               {renderField('Preferred University', 'university', formData.university)}
               {renderField('Preferred Intake', 'preferredIntake', formData.preferredIntake)}
               {renderField('Preferred Mode', 'preferredLearningMode', formData.preferredLearningMode, 'text', ['Online', 'Distance', 'Regular'])}
               {renderField('Budget Range', 'budget', formData.budget, 'text', ['< ₹50,000', '₹50,000 - ₹1L', '₹1L - ₹2L', '₹2L+'])}
               {renderField('Need EMI Option?', 'needEmi', formData.needEmi, 'checkbox')}
               {renderField('Need Scholarship?', 'needScholarship', formData.needScholarship, 'checkbox')}
               {renderField('Need Placement Support?', 'needPlacementSupport', formData.needPlacementSupport, 'checkbox')}
               {renderField('University Brand Preference', 'universityBrandPreference', formData.universityBrandPreference, 'text', ['High (Tier 1)', 'Medium (Tier 2)', 'Low (Tier 3)', 'Any'])}
               {renderField('Urgency', 'urgency', formData.urgency, 'text', ['Low', 'Medium', 'High', 'Immediate'])}
               <div className="col-span-1 md:col-span-2 lg:col-span-3">
                 {renderField('Motivation / Notes', 'motivation', formData.motivation, 'textarea')}
               </div>
             </div>
          </section>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <button 
            onClick={onClose}
            className="px-4 py-2 hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </>
  );
}
