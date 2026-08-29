import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SMART_VIEWS } from '../../constants/smartViews';
import { GripVertical, Save, Eye, EyeOff, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface SmartViewCustomization {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  visible_in_ui: boolean;
  order_index: number;
  icon: string;
  filterType: string;
}

export function SmartViewsAdmin() {
  const [views, setViews] = useState<SmartViewCustomization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingView, setEditingView] = useState<SmartViewCustomization | null>(null);
  const [editMode, setEditMode] = useState<'idle' | 'edit' | 'add'>('idle');

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'smart_views_config')
        .maybeSingle();

      if (error || !data?.value) {
        // Initialize with default config from SMART_VIEWS constant
        const defaultConfig: SmartViewCustomization[] = SMART_VIEWS.map((sv, idx) => ({
          id: sv.id,
          name: sv.name,
          description: sv.description,
          enabled: true,
          visible_in_ui: true,
          order_index: idx,
          icon: sv.icon,
          filterType: sv.filterType,
        }));
        setViews(defaultConfig);
      } else if (Array.isArray(data.value)) {
        setViews(data.value);
      }
    } catch (err) {
      toast.error('Failed to load smart view configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sort by order_index
      const sortedViews = [...views].sort((a, b) => a.order_index - b.order_index);

      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key: 'smart_views_config', value: sortedViews },
          { onConflict: 'key' }
        );

      if (error) throw error;
      toast.success('Smart View configuration saved successfully');
    } catch (err: any) {
      toast.error('Failed to save smart view configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (viewId: string) => {
    setViews(views.map(v =>
      v.id === viewId ? { ...v, visible_in_ui: !v.visible_in_ui } : v
    ));
  };

  const toggleEnabled = (viewId: string) => {
    setViews(views.map(v =>
      v.id === viewId ? { ...v, enabled: !v.enabled } : v
    ));
  };

  const moveView = (fromIdx: number, toIdx: number) => {
    const newViews = Array.from(views);
    const [removed] = newViews.splice(fromIdx, 1);
    newViews.splice(toIdx, 0, removed);
    newViews.forEach((v, idx) => { v.order_index = idx; });
    setViews(newViews);
  };

  const handleEdit = (view: SmartViewCustomization) => {
    setEditingView({ ...view });
    setEditMode('edit');
  };

  const handleAdd = () => {
    setEditingView({
      id: '',
      name: '',
      description: '',
      enabled: true,
      visible_in_ui: true,
      order_index: views.length,
      icon: 'sparkles',
      filterType: 'status',
    });
    setEditMode('add');
  };

  const handleSaveView = () => {
    if (!editingView?.name.trim()) {
      toast.error('View name is required');
      return;
    }
    if (!editingView?.id.trim() && editMode === 'add') {
      toast.error('View ID is required');
      return;
    }

    if (editMode === 'add') {
      const newView = { ...editingView, order_index: views.length };
      setViews([...views, newView]);
    } else if (editMode === 'edit' && editingView) {
      setViews(views.map(v => v.id === editingView.id ? editingView : v));
    }
    setEditMode('idle');
    setEditingView(null);
    toast.success(`View ${editMode === 'add' ? 'added' : 'updated'} successfully`);
  };

  const handleDelete = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;

    if (window.confirm(`Delete Smart View "${view.name}"?`)) {
      setViews(views.filter(v => v.id !== viewId));
      toast.success('Smart View deleted');
    }
  };

  const resetToDefault = () => {
    if (!window.confirm('Reset all Smart Views to defaults? This will lose any customizations.')) return;

    const defaultConfig: SmartViewCustomization[] = SMART_VIEWS.map((sv, idx) => ({
      id: sv.id,
      name: sv.name,
      description: sv.description,
      enabled: true,
      visible_in_ui: true,
      order_index: idx,
      icon: sv.icon,
      filterType: sv.filterType,
    }));
    setViews(defaultConfig);
    toast.success('Smart Views reset to defaults');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Smart View Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable, disable, reorder, and customize which Smart Views appear in the CRM.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetToDefault}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/60 border border-border rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Custom View
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 rounded-lg flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {editMode !== 'idle' && editingView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editMode === 'add' ? 'Add New Smart View' : 'Edit Smart View'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">View ID</label>
                <input
                  type="text"
                  value={editingView.id}
                  onChange={(e) => setEditingView({ ...editingView, id: e.target.value })}
                  disabled={editMode === 'edit'}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. my_custom_view"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={editingView.name}
                  onChange={(e) => setEditingView({ ...editingView, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editingView.description}
                  onChange={(e) => setEditingView({ ...editingView, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Filter Type</label>
                <select
                  value={editingView.filterType}
                  onChange={(e) => setEditingView({ ...editingView, filterType: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="date">Date-based</option>
                  <option value="status">Status-based</option>
                  <option value="disposition">Disposition-based</option>
                  <option value="activity">Activity-based</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visible_in_ui"
                  checked={editingView.visible_in_ui}
                  onChange={(e) => setEditingView({ ...editingView, visible_in_ui: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="visible_in_ui" className="text-sm font-medium">
                  Visible in Smart View UI
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={editingView.enabled}
                  onChange={(e) => setEditingView({ ...editingView, enabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="enabled" className="text-sm font-medium">
                  View is enabled
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditMode('idle');
                  setEditingView(null);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Views List */}
      <div className="space-y-3">
        {views.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No Smart Views configured
          </div>
        ) : (
          views.map((view, index) => (
            <div
              key={view.id}
              className={cn(
                "border border-border rounded-xl p-4 bg-card transition-all",
                !view.enabled && "opacity-50",
                !view.visible_in_ui && "bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Drag Handle */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('viewIndex', index.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = Number(e.dataTransfer.getData('viewIndex'));
                    if (fromIdx !== index) moveView(fromIdx, index);
                  }}
                  className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground shrink-0"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Enabled Toggle */}
                <button
                  onClick={() => toggleEnabled(view.id)}
                  className={cn(
                    "w-10 h-6 rounded-full flex items-center transition-colors shrink-0",
                    view.enabled ? "bg-primary/20" : "bg-muted"
                  )}
                  title={view.enabled ? 'Enabled' : 'Disabled'}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full transition-transform",
                    view.enabled ? "bg-primary translate-x-5" : "bg-muted-foreground translate-x-1"
                  )} />
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleVisibility(view.id)}
                  className={cn(
                    "flex items-center justify-center w-8 h-6 rounded-lg transition-colors shrink-0",
                    view.visible_in_ui
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/30 text-muted-foreground"
                  )}
                  title={view.visible_in_ui ? 'Visible in UI' : 'Hidden in UI'}
                >
                  {view.visible_in_ui ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* View Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{view.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      !view.enabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {view.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    {!view.visible_in_ui && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{view.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-muted/30 rounded-md">{view.filterType}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-muted/30 rounded-md">ID: {view.id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(view)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(view.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save button at bottom */}
      <div className="flex justify-end pt-4 border-t border-border/40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-70 rounded-lg flex items-center gap-2 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Smart View Configuration
        </button>
      </div>
    </div>
  );
}
