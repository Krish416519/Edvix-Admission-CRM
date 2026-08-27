import { useState } from 'react';
import { Task, TaskType, TaskPriority } from '../../../types/task';
import { X, Calendar, Clock, User, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLeads } from '../../../hooks/useLeads';

interface TaskFormDialogProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}

export function TaskFormDialog({ task, isOpen, onClose, onSave }: TaskFormDialogProps) {
  const { leads } = useLeads();
  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      title: '',
      type: 'Call',
      priority: 'Medium',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '10:00',
      description: '',
      leadId: '',
    }
  );

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const taskTypes: TaskType[] = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Reminder', 'Document Collection', 'Fee Reminder', 'Admission Follow-up', 'Custom Task'];
  const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-end md:justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-card md:border md:border-border shadow-2xl md:rounded-xl rounded-t-3xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 ease-out">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Task Title *</label>
                <input 
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Follow up on fee payment"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Task Type</label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {taskTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
                  <select 
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2"><Calendar className="w-4 h-4"/> Due Date</label>
                  <input 
                    type="date"
                    name="dueDate"
                    value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2"><Clock className="w-4 h-4"/> Due Time</label>
                  <input 
                    type="time"
                    name="dueTime"
                    value={formData.dueTime || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2"><User className="w-4 h-4"/> Related Lead (Optional)</label>
                <select 
                  name="leadId"
                  value={formData.leadId || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} ({lead.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2"><FileText className="w-4 h-4"/> Description & Notes</label>
                <textarea 
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any specific instructions or context for this task..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

            </div>
          </form>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-3 bg-muted/20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="task-form"
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            {task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
