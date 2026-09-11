import { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, Zap, Settings, Activity, Plus, GripVertical, 
  Trash2, Clock, ShieldAlert, PlayCircle, CheckCircle2, XCircle, 
  MessageSquare, Mail, UserPlus, CheckSquare, Bell, Sparkles, Copy, 
  Layers, AlertTriangle, Eye, HelpCircle, ChevronDown, Check, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { automationService } from '../../lib/automationService';
import { PREBUILT_TEMPLATES } from '../../lib/automation/prebuiltTemplates';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface WorkflowBuilderProps {
  initialWorkflow?: any;
  onBack: () => void;
  onSaved?: () => void;
}

const TRIGGER_CATEGORIES = [
  {
    category: 'Lead Triggers',
    triggers: [
      { name: 'Lead Created', desc: 'Fires immediately when a new lead enters the CRM' },
      { name: 'Lead Updated', desc: 'Fires when any student field or preference changes' },
      { name: 'Lead Assigned', desc: 'Fires when a lead is assigned or reassigned to a counselor' },
      { name: 'Lead Status Changed', desc: 'Fires when lead transitions to a new stage' },
      { name: 'Lead Score Changed', desc: 'Fires when AI recalculates student intent score' },
    ]
  },
  {
    category: 'Admission & Documents',
    triggers: [
      { name: 'Admission Created', desc: 'Fires when application drafting starts' },
      { name: 'Admission Stage Changed', desc: 'Fires when application advances or regresses' },
      { name: 'Document Uploaded', desc: 'Fires when student uploads marksheets/certificates' },
      { name: 'Document Approved', desc: 'Fires when verification team validates document' },
      { name: 'Document Rejected', desc: 'Fires when verification team rejects a document' },
    ]
  },
  {
    category: 'Finance & Payments',
    triggers: [
      { name: 'Payment Received', desc: 'Fires when seat deposit or tuition fee is marked Paid' },
      { name: 'Payment Pending', desc: 'Fires when fee transaction is initiated/pending' },
      { name: 'Invoice Generated', desc: 'Fires when formal admission invoice is issued' },
    ]
  },
  {
    category: 'Telephony & Tasks',
    triggers: [
      { name: 'Call Completed', desc: 'Fires when counselor wraps up call with disposition' },
      { name: 'Call Missed', desc: 'Fires when outbound or inbound call goes unanswered' },
      { name: 'Call Failed', desc: 'Fires when call fails to connect' },
      { name: 'Task Overdue', desc: 'Fires when counselor follow-up exceeds deadline' },
      { name: 'Task Completed', desc: 'Fires when task checklist item is marked done' },
      { name: 'Manual Trigger', desc: 'Triggered manually by counselor or admin on demand' },
    ]
  }
];

const ACTION_DEFINITIONS = [
  {
    type: 'Send WhatsApp',
    title: 'Send WhatsApp Message',
    icon: MessageSquare,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    desc: 'Instant WhatsApp template or dynamic text greeting'
  },
  {
    type: 'Send Email',
    title: 'Send Formal Email',
    icon: Mail,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    desc: 'Prospectus, fee receipts, or document checklist email'
  },
  {
    type: 'Create Task',
    title: 'Create Counselor Task',
    icon: CheckSquare,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    desc: 'High-priority call, document follow-up, or meeting'
  },
  {
    type: 'Assign Counselor',
    title: 'Assign Counselor (Round-Robin)',
    icon: UserPlus,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    desc: 'Automated queue distribution based on course & workload'
  },
  {
    type: 'Update Lead Status',
    title: 'Update Lead Stage',
    icon: Activity,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    desc: 'Advance lead to Qualified, Application Started, or Enrolled'
  },
  {
    type: 'Generate AI Summary',
    title: 'Compute AI Recommendation Dossier',
    icon: Sparkles,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    desc: 'Gemini AI intelligence summary and counselor pitch points'
  },
  {
    type: 'Delay Action',
    title: 'Wait / Delay Execution',
    icon: Clock,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    desc: 'Pause sequence for X hours or days before next step'
  },
  {
    type: 'Send Notification',
    title: 'Internal Team Alert',
    icon: Bell,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    desc: 'Push notifications to Admissions Director or Managers'
  }
];

const SAMPLE_LEADS_FOR_DRY_RUN = [
  {
    id: 'lead_001',
    first_name: 'Aarav',
    last_name: 'Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    lead_status: 'new',
    course: 'B.Tech Computer Science',
    city: 'Pune',
    lead_score: 85,
    budget: '₹12,00,000'
  },
  {
    id: 'lead_002',
    first_name: 'Priya',
    last_name: 'Patel',
    email: 'priya.patel@example.com',
    phone: '+91 98234 56789',
    lead_status: 'qualified',
    course: 'MBA Healthcare',
    city: 'Mumbai',
    lead_score: 92,
    budget: '₹15,00,000'
  },
  {
    id: 'lead_003',
    first_name: 'Rohan',
    last_name: 'Verma',
    email: 'rohan.verma@example.com',
    phone: '+91 97123 45678',
    lead_status: 'unresponsive',
    course: 'BBA Digital Marketing',
    city: 'Delhi',
    lead_score: 45,
    budget: '₹6,00,000'
  }
];

export function WorkflowBuilder({ initialWorkflow, onBack, onSaved }: WorkflowBuilderProps) {
  const { user } = useAuth();
  const orgId = user?.activeOrganizationId || user?.organizations?.[0]?.id;
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [trigger, setTrigger] = useState(initialWorkflow?.trigger_event || initialWorkflow?.trigger || 'Lead Created');
  const [isTestMode, setIsTestMode] = useState(initialWorkflow?.is_test_mode || false);
  const [isSaving, setIsSaving] = useState(false);

  // Conditions
  const [hasConditions, setHasConditions] = useState(
    Boolean(initialWorkflow?.automation_conditions?.length || initialWorkflow?.conditions?.length)
  );
  const [conditions, setConditions] = useState<Array<{ id: string; field: string; operator: string; value: string; logic: 'AND' | 'OR' }>>(
    (initialWorkflow?.automation_conditions || initialWorkflow?.conditions || []).map((c: any, i: number) => ({
      id: c.id || `cond_${i + 1}`,
      field: c.field || 'lead.status',
      operator: c.operator || 'equals',
      value: c.value_text || c.value || '',
      logic: c.logic || 'AND'
    }))
  );

  // Actions
  const [actions, setActions] = useState<Array<{ id: string; type: string; metadata: any }>>(
    (initialWorkflow?.automation_actions || initialWorkflow?.actions || []).length > 0
      ? (initialWorkflow?.automation_actions || initialWorkflow?.actions).map((a: any, i: number) => ({
          id: a.id || `act_${i + 1}`,
          type: a.action_type || a.type || 'Create Task',
          metadata: a.metadata || {}
        }))
      : [
          {
            id: 'act_1',
            type: 'Send WhatsApp',
            metadata: {
              template_name: 'admission_welcome_pack',
              message_body: 'Hello {{name}}! Welcome to Edvix Admissions. We received your inquiry for {{course}}.'
            }
          },
          {
            id: 'act_2',
            type: 'Create Task',
            metadata: {
              title: 'Initial Student Consultation Call',
              task_type: 'Call',
              due_minutes: 15,
              priority: 'High'
            }
          }
        ]
  );

  // Dry Run State
  const [showDryRunModal, setShowDryRunModal] = useState(false);
  const [selectedDryRunLead, setSelectedDryRunLead] = useState(SAMPLE_LEADS_FOR_DRY_RUN[0]);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // Prebuilt template picker
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(actions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActions(items);
  };

  const addAction = (type: string) => {
    const defaultMeta: Record<string, any> = {};
    if (type === 'Send WhatsApp') {
      defaultMeta.message_body = 'Hi {{name}}, regarding your application for {{course}}...';
      defaultMeta.template_name = 'admission_nudge';
    } else if (type === 'Send Email') {
      defaultMeta.subject = 'Important update regarding your {{course}} admission';
      defaultMeta.template_name = 'general_prospectus';
    } else if (type === 'Create Task') {
      defaultMeta.title = 'Counselor Follow-up Task';
      defaultMeta.task_type = 'Call';
      defaultMeta.priority = 'Medium';
      defaultMeta.due_minutes = 60;
    } else if (type === 'Assign Counselor') {
      defaultMeta.method = 'round_robin';
      defaultMeta.role = 'Academic Counselor';
    } else if (type === 'Update Lead Status') {
      defaultMeta.status = 'contacted';
    } else if (type === 'Delay Action') {
      defaultMeta.hours = 24;
    }

    setActions([
      ...actions,
      {
        id: `act_${Date.now()}`,
        type,
        metadata: defaultMeta
      }
    ]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const updateActionMetadata = (id: string, key: string, val: any) => {
    setActions(actions.map(a => a.id === id ? { ...a, metadata: { ...a.metadata, [key]: val } } : a));
  };

  const addConditionRule = () => {
    setConditions([
      ...conditions,
      {
        id: `cond_${Date.now()}`,
        field: 'lead.status',
        operator: 'equals',
        value: 'new',
        logic: 'AND'
      }
    ]);
    setHasConditions(true);
  };

  const removeConditionRule = (id: string) => {
    const remaining = conditions.filter(c => c.id !== id);
    setConditions(remaining);
    if (remaining.length === 0) setHasConditions(false);
  };

  const updateConditionRule = (id: string, key: string, val: any) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const applyTemplate = (tpl: any) => {
    setName(tpl.name);
    setDescription(tpl.description);
    setTrigger(tpl.trigger);
    setHasConditions(tpl.conditions.length > 0);
    setConditions(tpl.conditions.map((c: any, i: number) => ({
      id: `cond_${i + 1}`,
      field: c.field,
      operator: c.operator,
      value: c.value,
      logic: c.logic || 'AND'
    })));
    setActions(tpl.actions.map((a: any, i: number) => ({
      id: `act_${i + 1}`,
      type: a.type,
      metadata: a.metadata
    })));
    setShowTemplateMenu(false);
    toast.success(`Applied template: "${tpl.name}"`);
  };

  const runDryRun = (lead = selectedDryRunLead) => {
    const workflowObj = {
      trigger_event: trigger,
      conditions,
      actions
    };
    const result = automationService.dryRunWorkflow(workflowObj, lead);
    setDryRunResult(result);
    setShowDryRunModal(true);
  };

  const handleSave = async (status: 'active' | 'draft' = 'active') => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (actions.length === 0) {
      toast.error('Please add at least one action to the pipeline');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: initialWorkflow?.id,
        name: name.trim(),
        description: description.trim() || null,
        trigger_event: trigger,
        status: isTestMode ? 'testing' : status,
        is_prebuilt: initialWorkflow?.is_prebuilt || false,
        conditions: hasConditions ? conditions : [],
        actions: actions.map((a, i) => ({
          type: a.type,
          metadata: a.metadata,
          sort_order: i + 1
        }))
      };

      const res = await automationService.saveWorkflow(payload, orgId || '');
      if (res.success) {
        toast.success(`Workflow "${name}" saved & activated!`);
        if (onSaved) onSaved();
        onBack();
      } else {
        toast.error(res.error || 'Failed to save workflow');
      }
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-300 max-w-5xl mx-auto w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {initialWorkflow ? 'Edit Workflow' : 'Visual Workflow Studio'}
              {isTestMode && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                  Sandbox Test Mode
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">Orchestrate triggers, criteria rules, and multi-channel admission sequences.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prebuilt Templates Quick Picker */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 text-foreground transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Templates
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {showTemplateMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 p-2 text-xs divide-y divide-border">
                <div className="p-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Admission Workflow Blueprints
                </div>
                {PREBUILT_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left p-2.5 hover:bg-muted/60 rounded-lg transition-colors group flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tpl.name}
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test Mode Toggle */}
          <button
            onClick={() => setIsTestMode(!isTestMode)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              isTestMode 
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800" 
                : "bg-background text-muted-foreground border-border hover:bg-muted/50"
            )}
            title="When active, external WhatsApp and Emails are simulated and safely suppressed."
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {isTestMode ? 'Sandbox Active' : 'Enable Sandbox'}
          </button>

          {/* Dry Run Button */}
          <button
            onClick={() => runDryRun()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted/50 text-foreground rounded-lg transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
            Dry Run
          </button>

          {/* Save as Draft */}
          <button
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium border border-border text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            Save Draft
          </button>

          {/* Save & Activate */}
          <button
            onClick={() => handleSave('active')}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-sm"
          >
            {isSaving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save & Activate
          </button>
        </div>
      </div>

      {/* Main Builder Flowchart Workspace */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-6 pb-12">
        {/* Step 0: Meta Details Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Workflow Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Speed-to-Lead Instant WhatsApp & Counselor Task"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Automatically welcomes incoming MBA leads and assigns counselor"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Node 1: Trigger Node */}
        <div className="relative bg-card border-2 border-primary/40 dark:border-primary/30 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Trigger Event</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Fires when this admission event occurs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Select Trigger Event</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                {TRIGGER_CATEGORIES.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.triggers.map(t => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs">
              <span className="font-semibold text-foreground block mb-0.5">{trigger}</span>
              <p className="text-muted-foreground text-[11px]">
                {TRIGGER_CATEGORIES.flatMap(c => c.triggers).find(t => t.name === trigger)?.desc || 'Standard admission lifecycle event'}
              </p>
            </div>
          </div>
        </div>

        {/* Connecting Line */}
        <div className="flex justify-center -my-3 relative z-0">
          <div className="w-0.5 h-8 bg-border flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
          </div>
        </div>

        {/* Node 2: Conditions Node */}
        <div className="relative bg-card border border-border rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Criteria & Filters
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHasConditions(!hasConditions)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {hasConditions ? 'Switch to Always Run' : 'Add Filters'}
              </button>
              {hasConditions && (
                <button
                  type="button"
                  onClick={addConditionRule}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              )}
            </div>
          </div>

          {!hasConditions ? (
            <div className="p-4 bg-muted/20 border border-dashed border-border rounded-lg text-center">
              <p className="text-xs font-medium text-foreground">Always Run (No filter conditions)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Every event matching "{trigger}" will execute the actions pipeline.
              </p>
              <button
                type="button"
                onClick={addConditionRule}
                className="mt-2 text-xs text-primary hover:underline font-semibold"
              >
                + Add criteria rule (e.g. Course = MBA or Score &gt; 80)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((cond, idx) => (
                <div key={cond.id} className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border border-border rounded-lg text-xs">
                  {idx > 0 && (
                    <select
                      value={cond.logic}
                      onChange={(e) => updateConditionRule(cond.id, 'logic', e.target.value)}
                      className="px-2 py-1 text-xs border border-border rounded bg-background font-bold text-primary"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}

                  <select
                    value={cond.field}
                    onChange={(e) => updateConditionRule(cond.id, 'field', e.target.value)}
                    className="px-2.5 py-1.5 border border-border rounded bg-background text-foreground font-medium"
                  >
                    <option value="lead.status">Lead Status</option>
                    <option value="lead.score">Lead Intent Score</option>
                    <option value="lead.course">Course Preference</option>
                    <option value="lead.city">Student City</option>
                    <option value="lead.budget">Budget Range</option>
                    <option value="admission.stage">Admission Stage</option>
                    <option value="payment.status">Payment Status</option>
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => updateConditionRule(cond.id, 'operator', e.target.value)}
                    className="px-2.5 py-1.5 border border-border rounded bg-background text-foreground"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="contains">contains</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                    <option value="is_not_empty">is not empty</option>
                    <option value="is_empty">is empty</option>
                  </select>

                  {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => updateConditionRule(cond.id, 'value', e.target.value)}
                      placeholder="Comparison value..."
                      className="flex-1 min-w-[140px] px-2.5 py-1.5 border border-border rounded bg-background text-foreground"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => removeConditionRule(cond.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted"
                    title="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connecting Line */}
        <div className="flex justify-center -my-3 relative z-0">
          <div className="w-0.5 h-8 bg-border flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-pulse" />
          </div>
        </div>

        {/* Node 3: Actions Pipeline */}
        <div className="relative bg-card border border-border rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Action Sequence ({actions.length} steps)
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Executed sequentially from top to bottom</span>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="actions-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {actions.map((act, index) => {
                    const def = ACTION_DEFINITIONS.find(d => d.type === act.type) || ACTION_DEFINITIONS[0];
                    const Icon = def.icon;

                    return (
                      <Draggable key={act.id} draggableId={act.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className="bg-background border border-border rounded-xl p-4 shadow-xs hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div {...dragProvided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center", def.color)}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-xs text-foreground">{def.title}</h4>
                                  <p className="text-[10px] text-muted-foreground">{def.desc}</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeAction(act.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted transition-colors"
                                title="Delete step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Action-Specific Configuration Subforms */}
                            <div className="pl-9 space-y-2.5 pt-2 border-t border-border/50 text-xs">
                              {act.type === 'Send WhatsApp' && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Template:</span>
                                    <select
                                      value={act.metadata?.template_name || 'admission_welcome_pack'}
                                      onChange={(e) => updateActionMetadata(act.id, 'template_name', e.target.value)}
                                      className="px-2 py-1 border border-border rounded bg-muted/40 font-mono text-[11px]"
                                    >
                                      <option value="admission_welcome_pack">admission_welcome_pack</option>
                                      <option value="docs_upload_checklist">docs_upload_checklist</option>
                                      <option value="seat_confirmation_alert">seat_confirmation_alert</option>
                                      <option value="scholarship_notice">scholarship_notice</option>
                                    </select>
                                  </div>
                                  <div>
                                    <textarea
                                      rows={2}
                                      value={act.metadata?.message_body || ''}
                                      onChange={(e) => updateActionMetadata(act.id, 'message_body', e.target.value)}
                                      placeholder="Message body with variables like {{name}}, {{course}}..."
                                      className="w-full px-2.5 py-1.5 border border-border rounded bg-muted/20 text-foreground font-mono text-[11px] focus:outline-none"
                                    />
                                    <div className="flex gap-1 mt-1 text-[10px] text-muted-foreground">
                                      <span>Available tokens:</span>
                                      <button type="button" onClick={() => updateActionMetadata(act.id, 'message_body', (act.metadata?.message_body || '') + ' {{name}}')} className="text-primary hover:underline">&#123;&#123;name&#125;&#125;</button>
                                      <button type="button" onClick={() => updateActionMetadata(act.id, 'message_body', (act.metadata?.message_body || '') + ' {{course}}')} className="text-primary hover:underline">&#123;&#123;course&#125;&#125;</button>
                                      <button type="button" onClick={() => updateActionMetadata(act.id, 'message_body', (act.metadata?.message_body || '') + ' {{phone}}')} className="text-primary hover:underline">&#123;&#123;phone&#125;&#125;</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {act.type === 'Send Email' && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={act.metadata?.subject || ''}
                                    onChange={(e) => updateActionMetadata(act.id, 'subject', e.target.value)}
                                    placeholder="Subject line (e.g. Welcome to Edvix Admissions - {{course}})"
                                    className="w-full px-2.5 py-1 border border-border rounded bg-muted/20 text-foreground"
                                  />
                                  <select
                                    value={act.metadata?.template_name || 'general_prospectus'}
                                    onChange={(e) => updateActionMetadata(act.id, 'template_name', e.target.value)}
                                    className="px-2 py-1 border border-border rounded bg-muted/40 font-mono text-[11px]"
                                  >
                                    <option value="general_prospectus">general_prospectus</option>
                                    <option value="document_verification_email">document_verification_email</option>
                                    <option value="fee_receipt_email">fee_receipt_email</option>
                                  </select>
                                </div>
                              )}

                              {act.type === 'Create Task' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block">Task Title</label>
                                    <input
                                      type="text"
                                      value={act.metadata?.title || ''}
                                      onChange={(e) => updateActionMetadata(act.id, 'title', e.target.value)}
                                      className="w-full px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block">Due Within (Minutes)</label>
                                    <input
                                      type="number"
                                      value={act.metadata?.due_minutes || 15}
                                      onChange={(e) => updateActionMetadata(act.id, 'due_minutes', parseInt(e.target.value) || 15)}
                                      className="w-full px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block">Priority</label>
                                    <select
                                      value={act.metadata?.priority || 'High'}
                                      onChange={(e) => updateActionMetadata(act.id, 'priority', e.target.value)}
                                      className="w-full px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {act.type === 'Assign Counselor' && (
                                <div className="flex items-center gap-3">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block">Strategy</label>
                                    <select
                                      value={act.metadata?.method || 'round_robin'}
                                      onChange={(e) => updateActionMetadata(act.id, 'method', e.target.value)}
                                      className="px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                    >
                                      <option value="round_robin">Round Robin</option>
                                      <option value="load_balanced">Load Balanced</option>
                                      <option value="course_specialist">Course Specialist</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block">Target Role</label>
                                    <select
                                      value={act.metadata?.role || 'Academic Counselor'}
                                      onChange={(e) => updateActionMetadata(act.id, 'role', e.target.value)}
                                      className="px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                    >
                                      <option value="Academic Counselor">Academic Counselor</option>
                                      <option value="Admissions Manager">Admissions Manager</option>
                                      <option value="Team Leader">Team Leader</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {act.type === 'Update Lead Status' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Change status to:</span>
                                  <select
                                    value={act.metadata?.status || 'contacted'}
                                    onChange={(e) => updateActionMetadata(act.id, 'status', e.target.value)}
                                    className="px-2.5 py-1 border border-border rounded bg-muted/20 text-foreground font-semibold"
                                  >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="application_started">Application Started</option>
                                    <option value="enrolled">Enrolled</option>
                                    <option value="unresponsive">Unresponsive</option>
                                  </select>
                                </div>
                              )}

                              {act.type === 'Delay Action' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Pause sequence for:</span>
                                  <input
                                    type="number"
                                    value={act.metadata?.hours || 24}
                                    onChange={(e) => updateActionMetadata(act.id, 'hours', parseInt(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 border border-border rounded bg-muted/20 text-foreground"
                                  />
                                  <span className="text-muted-foreground">hours before continuing</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add Action Button Menu */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Step to Sequence:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACTION_DEFINITIONS.map(def => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => addAction(def.type)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/40 transition-colors text-left text-xs text-foreground group"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="truncate">{def.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dry Run Simulation Modal */}
      {showDryRunModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-foreground text-sm">Dry Run Workflow Simulation</h3>
              </div>
              <button
                onClick={() => setShowDryRunModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Select Test Lead */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Select Test Lead Profile:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_LEADS_FOR_DRY_RUN.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setSelectedDryRunLead(lead);
                      runDryRun(lead);
                    }}
                    className={cn(
                      "p-2.5 rounded-lg border text-left text-xs transition-colors",
                      selectedDryRunLead.id === lead.id
                        ? "border-primary bg-primary/5 font-semibold text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <p className="truncate text-foreground font-semibold">{lead.first_name} {lead.last_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.course}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-muted text-[9px] font-mono">
                      Score: {lead.lead_score}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Results Breakdown */}
            {dryRunResult && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {/* Condition Evaluations */}
                <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">1. Criteria Evaluation</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      dryRunResult.allConditionsPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {dryRunResult.allConditionsPassed ? 'CRITERIA PASSED ✓' : 'CRITERIA FAILED ✗'}
                    </span>
                  </div>

                  {dryRunResult.conditionsEvaluated.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[11px] font-mono p-1.5 bg-background rounded border border-border">
                      <span>{c.field} {c.operator} "{c.expected}" (Actual: "{c.actual}")</span>
                      {c.passed ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Met
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Not Met
                        </span>
                      )}
                    </div>
                  ))}
                  {dryRunResult.conditionsEvaluated.length === 0 && (
                    <p className="text-muted-foreground text-[11px] italic">No conditions set - runs unconditionally.</p>
                  )}
                </div>

                {/* Simulated Actions Sequence */}
                <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
                  <span className="font-semibold text-foreground block">2. Simulated Action Sequence</span>
                  {dryRunResult.actionsSimulated.map((act: any) => (
                    <div key={act.step} className="p-2 bg-background rounded border border-border flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {act.step}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{act.actionType}</p>
                          <p className="text-[11px] text-muted-foreground">{act.details}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-medium shrink-0",
                        act.status === 'simulated' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-muted text-muted-foreground"
                      )}>
                        {act.status === 'simulated' ? 'Ready to Fire' : 'Skipped'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                onClick={() => setShowDryRunModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
