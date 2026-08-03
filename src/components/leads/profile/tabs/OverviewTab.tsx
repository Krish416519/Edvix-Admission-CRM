import React, { useState } from 'react';
import { Lead } from '../../../../types/schema';
import { Save, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function OverviewTab({ lead, onUpdateLead }: { lead: Lead, onUpdateLead: (data: Partial<Lead>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    state: lead.state,
    city: lead.city,
    course: lead.course,
    university: lead.university,
    budget: lead.budget,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    onUpdateLead(formData);
    setIsEditing(false);
    toast.success('Lead overview updated');
  };

  const fields = [
    { label: 'Student Name', name: 'name', value: formData.name },
    { label: 'Phone Number', name: 'phone', value: formData.phone },
    { label: 'Email Address', name: 'email', value: formData.email },
    { label: 'State', name: 'state', value: formData.state },
    { label: 'City', name: 'city', value: formData.city },
    { label: 'Preferred Course', name: 'course', value: formData.course },
    { label: 'Preferred University', name: 'university', value: formData.university },
    { label: 'Budget', name: 'budget', value: formData.budget },
  ];

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Overview</h3>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">{field.label}</label>
            {isEditing ? (
              <input 
                type="text"
                name={field.name}
                value={field.value || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <div className="text-sm font-medium text-foreground py-2 border-b border-transparent">
                {field.value || '-'}
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Date Created</label>
          <div className="text-sm font-medium text-foreground py-2">
            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Lead Owner</label>
          <div className="text-sm font-medium text-foreground py-2">
            {typeof lead.counselor === 'string' ? lead.counselor : lead.counselor?.name || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
