import React, { useState } from 'react';
import { Lead } from '../../../../types/schema';
import { Save, X, Edit2, GraduationCap, Briefcase, Target, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ProfileSection({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div 
        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
      {isOpen && (
        <div className="p-5 border-t border-border bg-card/50">
          {children}
        </div>
      )}
    </div>
  );
}

export function OverviewTab({ lead, onUpdateLead }: { lead: Lead, onUpdateLead: (data: Partial<Lead>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
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
    course: lead.course || '', // Used as Target Program
    preferredSpecialization: lead.preferredSpecialization || '',
    university: lead.university || '', // Used as Preferred University
    preferredIntake: lead.preferredIntake || '',
    budget: lead.budget || '',
    needEmi: lead.needEmi ?? undefined,
    needScholarship: lead.needScholarship ?? undefined,
    preferredLearningMode: lead.preferredLearningMode || '',
    needPlacementSupport: lead.needPlacementSupport ?? undefined,
    universityBrandPreference: lead.universityBrandPreference || '',
    urgency: lead.urgency || '',
  });

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
    onUpdateLead(formData);
    setIsEditing(false);
    toast.success('360° Profile updated successfully');
  };

  const renderField = (label: string, name: keyof Lead, value: any, type: string = 'text', options?: string[]) => (
    <div className="flex flex-col gap-1.5" key={name}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {isEditing ? (
        type === 'checkbox' ? (
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
        )
      ) : (
        <div className="text-sm font-medium text-foreground py-2 border-b border-transparent">
          {type === 'checkbox' ? (
            value ? 'Yes' : 'No'
          ) : (
            value || <span className="text-muted-foreground italic">Not specified</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-card/80 backdrop-blur-md z-10 py-2">
        <h2 className="text-xl font-bold">360° Student Profile</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-semibold transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <ProfileSection title="Personal Information" icon={Target}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Full Name', 'name', formData.name)}
            {renderField('Phone Number', 'phone', formData.phone)}
            {renderField('Email Address', 'email', formData.email)}
            {renderField('State', 'state', formData.state)}
            {renderField('City', 'city', formData.city)}
          </div>
        </ProfileSection>

        <ProfileSection title="Academic Profile" icon={GraduationCap}>
          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">10th Standard</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Board', 'tenthBoard', formData.tenthBoard)}
            {renderField('Passing Year', 'tenthPassingYear', formData.tenthPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'tenthPercentage', formData.tenthPercentage, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">12th / Diploma</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Board', 'twelfthBoard', formData.twelfthBoard)}
            {renderField('Stream', 'twelfthStream', formData.twelfthStream, 'text', ['Science', 'Commerce', 'Arts', 'Diploma', 'Not Applicable'])}
            {renderField('Passing Year', 'twelfthPassingYear', formData.twelfthPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'twelfthPercentage', formData.twelfthPercentage, 'number')}
          </div>
          
          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Graduation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Degree', 'graduationDegree', formData.graduationDegree)}
            {renderField('University', 'graduationUniversity', formData.graduationUniversity)}
            {renderField('Passing Year', 'graduationPassingYear', formData.graduationPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'graduationPercentage', formData.graduationPercentage, 'number')}
            {renderField('Mode', 'graduationMode', formData.graduationMode, 'text', ['Regular', 'Distance', 'Online', 'Unknown'])}
            {renderField('Active Backlogs', 'graduationBacklogs', formData.graduationBacklogs, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Post-Graduation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Degree', 'postGraduationDegree', formData.postGraduationDegree)}
            {renderField('University', 'postGraduationUniversity', formData.postGraduationUniversity)}
            {renderField('Passing Year', 'postGraduationPassingYear', formData.postGraduationPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'postGraduationPercentage', formData.postGraduationPercentage, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Other Academic Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Gap Years', 'gapYears', formData.gapYears, 'number')}
            <div className="col-span-1 md:col-span-2">
              {renderField('Gap Explanation', 'gapExplanation', formData.gapExplanation, 'textarea')}
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="Professional Profile" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Employment Status', 'employmentStatus', formData.employmentStatus, 'text', ['Fresher', 'Working Professional', 'Self Employed', 'Business Owner', 'Student', 'Other'])}
            {renderField('Company', 'company', formData.company)}
            {renderField('Job Title', 'jobTitle', formData.jobTitle)}
            {renderField('Industry', 'industry', formData.industry)}
            {renderField('Years of Experience', 'yearsOfExperience', formData.yearsOfExperience, 'number')}
            {renderField('Annual Salary Range', 'annualIncome', formData.annualIncome, 'text', ['< 3 LPA', '3-5 LPA', '5-10 LPA', '10-20 LPA', '20+ LPA'])}
          </div>
        </ProfileSection>

        <ProfileSection title="Career & Admission Requirements" icon={Building}>
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
        </ProfileSection>
      </div>
    </div>
  );
}
