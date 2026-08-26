import React, { useState } from 'react';
import { Lead } from '../../../../types/schema';
import { Save, X, Edit2, GraduationCap, Briefcase, Target, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { EditProfileModal } from './EditProfileModal';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ProfileSection({ title, icon: Icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 md:mb-6">
      <div 
        className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/60 touch-manipulation"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
      {isOpen && (
        <div className="p-3 sm:p-4 md:p-5 border-t border-border bg-card/50">
          {children}
        </div>
      )}
    </div>
  );
}

export function OverviewTab({ lead, onUpdateLead }: { lead: Lead, onUpdateLead: (data: Partial<Lead>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const handleSave = (updatedData: Partial<Lead>) => {
    onUpdateLead(updatedData);
    setIsEditing(false);
  };

  const renderField = (label: string, name: keyof Lead, value: any, type: string = 'text') => (
    <div className="flex flex-col gap-1.5" key={name}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="text-sm font-medium text-foreground py-2 border-b border-transparent">
        {type === 'checkbox' ? (
          value ? 'Yes' : 'No'
        ) : (
          value || <span className="text-muted-foreground italic">Not specified</span>
        )}
      </div>
    </div>
  );



  return (
    <div className="p-3 sm:p-4 md:p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-card/95 backdrop-blur-sm z-10 py-2 sm:py-3 border-b border-border">
        <h2 className="text-base sm:text-lg md:text-xl font-bold">360° Student Profile</h2>
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs sm:text-sm font-semibold transition-colors active:scale-95 touch-manipulation"
        >
          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
        </button>
      </div>

      <div className="space-y-2">
        <ProfileSection title="Personal Information" icon={Target}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Full Name', 'name', lead.name)}
            {renderField('Phone Number', 'phone', lead.phone)}
            {renderField('Email Address', 'email', lead.email)}
            {renderField('State', 'state', lead.state)}
            {renderField('City', 'city', lead.city)}
          </div>
        </ProfileSection>

        <ProfileSection title="Academic Profile" icon={GraduationCap}>
          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">10th Standard</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Board', 'tenthBoard', lead.tenthBoard)}
            {renderField('Passing Year', 'tenthPassingYear', lead.tenthPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'tenthPercentage', lead.tenthPercentage, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">12th / Diploma</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Board', 'twelfthBoard', lead.twelfthBoard)}
            {renderField('Stream', 'twelfthStream', lead.twelfthStream)}
            {renderField('Passing Year', 'twelfthPassingYear', lead.twelfthPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'twelfthPercentage', lead.twelfthPercentage, 'number')}
          </div>
          
          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Graduation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Degree', 'graduationDegree', lead.graduationDegree)}
            {renderField('University', 'graduationUniversity', lead.graduationUniversity)}
            {renderField('Passing Year', 'graduationPassingYear', lead.graduationPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'graduationPercentage', lead.graduationPercentage, 'number')}
            {renderField('Mode', 'graduationMode', lead.graduationMode)}
            {renderField('Active Backlogs', 'graduationBacklogs', lead.graduationBacklogs, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Post-Graduation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
            {renderField('Degree', 'postGraduationDegree', lead.postGraduationDegree)}
            {renderField('University', 'postGraduationUniversity', lead.postGraduationUniversity)}
            {renderField('Passing Year', 'postGraduationPassingYear', lead.postGraduationPassingYear, 'number')}
            {renderField('Percentage/CGPA', 'postGraduationPercentage', lead.postGraduationPercentage, 'number')}
          </div>

          <h4 className="text-sm font-bold text-muted-foreground mb-4 border-b border-border pb-1">Other Academic Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Gap Years', 'gapYears', lead.gapYears, 'number')}
            <div className="col-span-1 md:col-span-2">
              {renderField('Gap Explanation', 'gapExplanation', lead.gapExplanation)}
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="Professional Profile" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Employment Status', 'employmentStatus', lead.employmentStatus)}
            {renderField('Company', 'company', lead.company)}
            {renderField('Job Title', 'jobTitle', lead.jobTitle)}
            {renderField('Industry', 'industry', lead.industry)}
            {renderField('Years of Experience', 'yearsOfExperience', lead.yearsOfExperience, 'number')}
            {renderField('Annual Salary Range', 'annualIncome', lead.annualIncome)}
          </div>
        </ProfileSection>

        <ProfileSection title="Career & Admission Requirements" icon={Building}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {renderField('Current Goal', 'careerGoal', lead.careerGoal)}
            {renderField('Target Role', 'targetRole', lead.targetRole)}
            {renderField('Target Program', 'course', lead.course)}
            {renderField('Preferred Specialization', 'preferredSpecialization', lead.preferredSpecialization)}
            {renderField('Preferred University', 'university', lead.university)}
            {renderField('Preferred Intake', 'preferredIntake', lead.preferredIntake)}
            {renderField('Preferred Mode', 'preferredLearningMode', lead.preferredLearningMode)}
            {renderField('Budget Range', 'budget', lead.budget)}
            {renderField('Need EMI Option?', 'needEmi', lead.needEmi, 'checkbox')}
            {renderField('Need Scholarship?', 'needScholarship', lead.needScholarship, 'checkbox')}
            {renderField('Need Placement Support?', 'needPlacementSupport', lead.needPlacementSupport, 'checkbox')}
            {renderField('University Brand Preference', 'universityBrandPreference', lead.universityBrandPreference)}
            {renderField('Urgency', 'urgency', lead.urgency)}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              {renderField('Motivation / Notes', 'motivation', lead.motivation)}
            </div>
          </div>
        </ProfileSection>
      </div>

      <EditProfileModal 
        lead={lead}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
      />
    </div>
  );
}
