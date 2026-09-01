import { useState } from 'react';
import { Plus, GripVertical, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { useLeadFields } from '../../hooks/useLeadFields';
import { LeadFormField } from '../../types/schema';
import { toast } from 'sonner';

export function LeadFieldsManager() {
  const { fields, isLoading, addField, updateField, deleteField } = useLeadFields();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<LeadFormField>>({
    fieldName: '',
    fieldLabel: '',
    fieldType: 'text',
    isRequired: false,
    options: [],
    isActive: true,
  });

  const handleSave = async () => {
    if (!formData.fieldLabel || !formData.fieldName) {
      toast.error('Field Name and Label are required');
      return;
    }

    if (editingId) {
      const res = await updateField(editingId, formData);
      if (res.success) {
        toast.success('Field updated successfully');
        setEditingId(null);
      } else {
        toast.error('Failed to update field');
      }
    } else {
      // Auto-generate fieldName if empty based on label
      const name = formData.fieldName || formData.fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const res = await addField({ ...formData, fieldName: name, displayOrder: fields.length + 1 });
      if (res.success) {
        toast.success('Field added successfully');
        setIsAdding(false);
      } else {
        toast.error('Failed to add field: ' + res.error);
      }
    }
  };

  const renderFieldForm = (isEdit = false) => (
    <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Field Label</label>
          <input 
            type="text" 
            value={formData.fieldLabel || ''} 
            onChange={(e) => {
              const label = e.target.value;
              const name = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
              setFormData({...formData, fieldLabel: label, fieldName: isEdit ? formData.fieldName : name})
            }}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            placeholder="e.g. Target Program"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Key (Field Name)</label>
          <input 
            type="text" 
            value={formData.fieldName || ''} 
            disabled={isEdit}
            onChange={(e) => setFormData({...formData, fieldName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
            placeholder="e.g. target_program"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Field Type</label>
          <select 
            value={formData.fieldType || 'text'} 
            onChange={(e) => setFormData({...formData, fieldType: e.target.value as any})}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
          >
            <option value="text">Text Input</option>
            <option value="number">Number</option>
            <option value="select">Dropdown Select</option>
            <option value="date">Date Picker</option>
            <option value="boolean">Checkbox (Yes/No)</option>
          </select>
        </div>
        
        {formData.fieldType === 'select' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Options (Comma separated)</label>
            <input 
              type="text" 
              value={(formData.options || []).join(', ')} 
              onChange={(e) => setFormData({...formData, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              placeholder="MBA, B.Tech, Ph.D"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.isRequired || false} 
            onChange={(e) => setFormData({...formData, isRequired: e.target.checked})}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Required Field
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.isActive || false} 
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <button 
          onClick={() => { setIsAdding(false); setEditingId(null); }}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> Save Field
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Lead Form Configuration</h2>
          <p className="text-sm text-muted-foreground">Customize the fields displayed when adding or editing a lead.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ fieldName: '', fieldLabel: '', fieldType: 'text', isRequired: false, options: [], isActive: true });
            setIsAdding(true);
            setEditingId(null);
          }}
          disabled={isAdding}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Custom Field
        </button>
      </div>

      {isAdding && renderFieldForm()}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded-lg w-full"></div>
          ))}
        </div>
      ) : fields.length === 0 && !isAdding ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No custom fields</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">You haven't configured any custom fields for leads yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50">
              {editingId === field.id ? (
                <div className="p-4">{renderFieldForm(true)}</div>
              ) : (
                <div className="flex items-center p-4 gap-4">
                  <div className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="font-medium truncate">{field.fieldLabel}</p>
                      <p className="text-xs text-muted-foreground font-mono">{field.fieldName}</p>
                    </div>
                    <div className="hidden md:block">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {field.fieldType}
                      </span>
                    </div>
                    <div>
                      {field.isRequired ? (
                        <span className="text-xs text-red-500 font-medium">Required</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Optional</span>
                      )}
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setFormData(field);
                          setEditingId(field.id);
                          setIsAdding(false);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this field?')) {
                            deleteField(field.id);
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
