import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { dispositionService } from '../../../lib/dispositionService';
import { DispositionCategory, Disposition } from '../../../types/disposition';
import { Plus, Edit2, CheckCircle, XCircle, ChevronDown, ChevronRight, Settings, Trash2, X, AlertTriangle, Loader2, Clock, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export function DispositionManagement() {
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, Disposition[]>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [editingStageIdx, setEditingStageIdx] = useState<number | null>(null);
  const [isSavingStages, setIsSavingStages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DispositionCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  const [dispModalOpen, setDispModalOpen] = useState(false);
  const [editingDisp, setEditingDisp] = useState<Disposition | null>(null);
  const [dispForm, setDispForm] = useState({
    categoryId: '',
    name: '',
    requires_follow_up: false,
    requires_note: false,
    target_status: ''
  });
  const [isSavingDisp, setIsSavingDisp] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'disposition', id: string, categoryId?: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cats = await dispositionService.getCategories();
      setCategories(cats);
      
      const dispMap: Record<string, Disposition[]> = {};
      for (const cat of cats) {
        dispMap[cat.id] = await dispositionService.getDispositions(cat.id);
      }
      setDispositions(dispMap);

      // Fetch Pipeline Stages
      const { data: psData } = await supabase.from('system_settings').select('value').eq('key', 'pipeline_stages').maybeSingle();
      if (psData && psData.value && Array.isArray(psData.value)) {
        setPipelineStages(psData.value);
      } else {
        setPipelineStages(['New', 'Attempted', 'Connected', 'Interested', 'Qualified', 'Application Started', 'Documents Pending', 'Admission Done', 'Lost']);
      }
    } catch (error) {
      toast.error('Failed to load dispositions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSavePipelineStages = async () => {
    setIsSavingStages(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'pipeline_stages', value: pipelineStages, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Pipeline stages saved successfully');
    } catch (err: any) {
      toast.error('Failed to save pipeline stages');
    } finally {
      setIsSavingStages(false);
    }
  };

  // --- Category Handlers ---
  const openAddCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: DispositionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    setCatName(cat.name);
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSavingCat(true);
    try {
      if (editingCat) {
        const updated = await dispositionService.updateCategory(editingCat.id, { name: catName.trim() });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Category updated successfully');
      } else {
        const newCat = await dispositionService.createCategory(catName.trim(), categories.length * 10);
        setCategories(prev => [...prev, newCat]);
        setExpandedCats(prev => ({ ...prev, [newCat.id]: true }));
        toast.success('Category added successfully');
      }
      setCatModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsSavingCat(false);
    }
  };

  // --- Disposition Handlers ---
  const openAddDisposition = (categoryId: string) => {
    setEditingDisp(null);
    setDispForm({ categoryId, name: '', requires_follow_up: false, requires_note: false, target_status: '' });
    setDispModalOpen(true);
  };

  const openEditDisposition = (disp: Disposition, categoryId: string) => {
    setEditingDisp(disp);
    setDispForm({
      categoryId,
      name: disp.name,
      requires_follow_up: disp.requires_follow_up || false,
      requires_note: disp.requires_note || false,
      target_status: disp.target_status || ''
    });
    setDispModalOpen(true);
  };

  const handleSaveDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispForm.name.trim() || !dispForm.categoryId) return;

    setIsSavingDisp(true);
    try {
      const payload = {
        name: dispForm.name.trim(),
        requires_follow_up: dispForm.requires_follow_up,
        requires_note: dispForm.requires_note,
        target_status: dispForm.target_status || null
      };

      if (editingDisp) {
        const updated = await dispositionService.updateDisposition(editingDisp.id, payload);
        setDispositions(prev => ({
          ...prev,
          [dispForm.categoryId]: (prev[dispForm.categoryId] || []).map(d => d.id === updated.id ? updated : d)
        }));
        toast.success('Disposition updated successfully');
      } else {
        const newDisp = await dispositionService.createDisposition(dispForm.categoryId, payload.name, payload);
        setDispositions(prev => ({
          ...prev,
          [dispForm.categoryId]: [...(prev[dispForm.categoryId] || []), newDisp]
        }));
        toast.success('Disposition added successfully');
      }
      setDispModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save disposition');
    } finally {
      setIsSavingDisp(false);
    }
  };

  // --- Delete Handlers ---
  const requestDeleteCategory = (cat: DispositionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ type: 'category', id: cat.id, name: cat.name });
    setDeleteModalOpen(true);
  };

  const requestDeleteDisposition = (disp: Disposition, categoryId: string) => {
    setItemToDelete({ type: 'disposition', id: disp.id, categoryId, name: disp.name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'category') {
        await dispositionService.deleteCategory(itemToDelete.id);
        setCategories(prev => prev.filter(c => c.id !== itemToDelete.id));
        toast.success(`Category "${itemToDelete.name}" deleted`);
      } else if (itemToDelete.type === 'disposition') {
        await dispositionService.deleteDisposition(itemToDelete.id);
        if (itemToDelete.categoryId) {
          const catId = itemToDelete.categoryId;
          setDispositions(prev => ({
            ...prev,
            [catId]: (prev[catId] || []).filter(d => d.id !== itemToDelete.id)
          }));
        }
        toast.success(`Disposition "${itemToDelete.name}" deleted`);
      }
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Loading Configuration...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Disposition Configuration</h2>
          <p className="text-muted-foreground mt-1">Manage lead dispositions, sub-dispositions, and next actions.</p>
        </div>
        <button 
          onClick={openAddCategory}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90 transition-all hover:shadow hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Pipeline Stages Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-lg text-foreground">Pipeline Stages</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder. These stages appear in the Smart View and Lead filters.</p>
          </div>
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentLength = Array.isArray(pipelineStages) ? pipelineStages.length : 0;
                setPipelineStages(prev => {
                  const current = Array.isArray(prev) ? prev : [];
                  return [...current, `New Stage ${current.length + 1}`];
                });
                setEditingStageIdx(currentLength);
              }} 
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer relative z-10"
            >
              <Plus className="w-4 h-4 pointer-events-none" /> Add Stage
            </button>
            <button 
              type="button"
              onClick={handleSavePipelineStages}
              disabled={isSavingStages}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 cursor-pointer"
            >
              {isSavingStages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Stages
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {pipelineStages.map((stage: string, index: number) => (
            <div 
              key={`${stage}-${index}`}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('stageDragIndex', index.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragIdxStr = e.dataTransfer.getData('stageDragIndex');
                if (dragIdxStr) {
                  const dragIdx = Number(dragIdxStr);
                  const dropIdx = index;
                  if (dragIdx === dropIdx) return;
                  const newStages = [...pipelineStages];
                  const [removed] = newStages.splice(dragIdx, 1);
                  newStages.splice(dropIdx, 0, removed);
                  setPipelineStages(newStages);
                }
              }}
              className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl group transition-all"
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground">
                <GripVertical className="w-5 h-5" />
              </div>
              
              {editingStageIdx === index ? (
                <input 
                  autoFocus
                  type="text" 
                  value={stage}
                  onChange={(e) => {
                    const newStages = [...pipelineStages];
                    newStages[index] = e.target.value;
                    setPipelineStages(newStages);
                  }}
                  onBlur={() => setEditingStageIdx(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingStageIdx(null)}
                  className="flex-1 bg-background border border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
                />
              ) : (
                <div className="flex-1 text-sm font-medium px-3 py-1.5 select-none">
                  {stage}
                </div>
              )}

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                {editingStageIdx !== index && (
                  <button
                    type="button"
                    onClick={() => setEditingStageIdx(index)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit Stage"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newStages = pipelineStages.filter((_, i) => i !== index);
                    setPipelineStages(newStages);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete Stage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border/50">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No disposition categories found. Add one to get started.
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="group/cat transition-colors duration-200">
              <div 
                className={cn(
                  "flex items-center justify-between p-4 cursor-pointer transition-colors",
                  expandedCats[cat.id] ? "bg-muted/30" : "hover:bg-muted/50"
                )}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    {expandedCats[cat.id] ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <h3 className="font-bold text-base text-foreground tracking-tight">{cat.name}</h3>
                  {!cat.is_active && <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-destructive/10 text-destructive uppercase tracking-wider border border-destructive/20">Inactive</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => openEditCategory(cat, e)}
                    className="p-2 text-muted-foreground hover:bg-muted rounded-lg hover:text-foreground transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => requestDeleteCategory(cat, e)}
                    className="p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedCats[cat.id] && (
                <div className="bg-muted/10 p-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-4 pl-11">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Dispositions</h4>
                    <button 
                      onClick={() => openAddDisposition(cat.id)}
                      className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Disposition
                    </button>
                  </div>
                  
                  <div className="pl-11 pr-2">
                    {dispositions[cat.id]?.length === 0 ? (
                      <div className="p-4 border border-dashed border-border rounded-xl text-center text-sm text-muted-foreground">
                        No dispositions in this category. Click 'Add Disposition' to create one.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dispositions[cat.id]?.map(disp => (
                          <div key={disp.id} className="bg-background border border-border rounded-xl p-3 flex justify-between items-center group/disp hover:border-border-hover transition-colors shadow-sm">
                            <div>
                              <div className="font-bold text-sm text-foreground">{disp.name}</div>
                              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2 mt-1.5 font-medium">
                                {disp.requires_follow_up && (
                                  <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                                    <Clock className="w-3 h-3" /> Follow-up Req
                                  </span>
                                )}
                                {disp.requires_note && (
                                  <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                                    <Edit2 className="w-3 h-3" /> Note Req
                                  </span>
                                )}
                                {disp.target_status && (
                                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                    Sets: {disp.target_status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/disp:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openEditDisposition(disp, cat.id)}
                                className="p-2 text-muted-foreground hover:bg-muted rounded-lg hover:text-foreground transition-colors"
                                title="Edit Disposition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => requestDeleteDisposition(disp, cat.id)}
                                className="p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"
                                title="Delete Disposition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingCat ? 'Edit Category' : 'Create Category'}
              </h2>
              <button onClick={() => setCatModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Category Name *</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="e.g. CONTACTED, NOT INTERESTED"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setCatModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingCat || !catName.trim()} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50">
                  {isSavingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSavingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposition Modal */}
      {dispModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingDisp ? 'Edit Disposition' : 'Create Disposition'}
              </h2>
              <button onClick={() => setDispModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDisposition} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Disposition Name *</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={dispForm.name}
                  onChange={e => setDispForm({ ...dispForm, name: e.target.value })}
                  placeholder="e.g. Call Back Requested, Highly Interested"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Target Lead Status Update (Optional)</label>
                <p className="text-xs text-muted-foreground mb-2">If selected, selecting this disposition will automatically change the lead's status to this value.</p>
                <select
                  value={dispForm.target_status}
                  onChange={e => setDispForm({ ...dispForm, target_status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                >
                  <option value="">-- No automatic status change --</option>
                  {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground">Requirements</h4>
                <label className="flex items-start gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={dispForm.requires_follow_up}
                    onChange={e => setDispForm({ ...dispForm, requires_follow_up: e.target.checked })}
                    className="mt-0.5 rounded text-primary focus:ring-primary bg-background border-border"
                  />
                  <div>
                    <span className="block text-sm font-medium text-foreground">Requires Follow-up Date</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Forces the counselor to schedule a next action date.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={dispForm.requires_note}
                    onChange={e => setDispForm({ ...dispForm, requires_note: e.target.checked })}
                    className="mt-0.5 rounded text-primary focus:ring-primary bg-background border-border"
                  />
                  <div>
                    <span className="block text-sm font-medium text-foreground">Requires Notes</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Forces the counselor to write a description when selecting this.</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button type="button" onClick={() => setDispModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingDisp || !dispForm.name.trim()} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50">
                  {isSavingDisp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSavingDisp ? 'Saving...' : 'Save Disposition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Delete {itemToDelete.type}?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete the {itemToDelete.type} <strong className="text-foreground">"{itemToDelete.name}"</strong>? This will hide it from future use. Existing leads with this disposition will not be affected.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Yes, delete it'}
              </button>
              <button 
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
