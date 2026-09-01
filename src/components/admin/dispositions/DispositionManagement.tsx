import { useState, useEffect } from 'react';
import { dispositionService, DispositionCategory, Disposition, CrmContextOption } from '../../../lib/dispositionService';
import { Plus, Edit2, CheckCircle, ChevronDown, ChevronRight, Trash2, X, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { DEFAULT_PIPELINE_STAGES } from '../../../constants/pipelineStages';

export function DispositionManagement() {
  const [activeTab, setActiveTab] = useState<string>('academic');
  const [availableContexts, setAvailableContexts] = useState<CrmContextOption[]>([]);
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, Disposition[]>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [isCustomContext, setIsCustomContext] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', name: '', order_index: 0, crm_context: 'academic' });
  const [isSavingCat, setIsSavingCat] = useState(false);

  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextForm, setContextForm] = useState({ name: '', id: '' });
  const [isSavingContext, setIsSavingContext] = useState(false);

  const [dispModalOpen, setDispModalOpen] = useState(false);
  const [editingDisp, setEditingDisp] = useState<Disposition | null>(null);
  const [dispForm, setDispForm] = useState({
    categoryId: '',
    name: '',
    requires_follow_up: false,
    requires_note: false,
    target_status: '',
    crm_context: 'academic'
  });
  const [isSavingDisp, setIsSavingDisp] = useState(false);

  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState<{ type: 'category' | 'disposition', id: string, categoryId?: string, name: string, is_active: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const [hardDeleteModalOpen, setHardDeleteModalOpen] = useState(false);
  const [itemToHardDelete, setItemToHardDelete] = useState<{ type: 'category' | 'disposition', id: string, name: string } | null>(null);
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  const [deletePipelineModalOpen, setDeletePipelineModalOpen] = useState(false);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const contexts = await dispositionService.getAvailableContexts();
      setAvailableContexts(contexts);
      
      const cats = await dispositionService.getCategories(activeTab, true);
      setCategories(cats);
      
      const dispMap: Record<string, Disposition[]> = {};
      for (const cat of cats) {
        dispMap[cat.id] = await dispositionService.getDispositions(cat.id, undefined, true);
      }
      setDispositions(dispMap);
     } catch (error) {
      toast.error('Failed to load dispositions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Category Handlers ---
  const openAddCategory = () => {
    setCatForm({ id: '', name: '', order_index: categories.length, crm_context: activeTab });
    setIsCustomContext(false);
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: DispositionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setCatForm({ 
      id: cat.id, 
      name: cat.name, 
      order_index: cat.order_index,
      crm_context: cat.crm_context || activeTab
    });
    // Ensure the context exists in the dropdown, if not it's custom
    if (cat.crm_context && !availableContexts.find(c => c.id === cat.crm_context)) {
      setIsCustomContext(true);
    } else {
      setIsCustomContext(false);
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    setIsSavingCat(true);
    try {
      if (catForm.id) {
        const updated = await dispositionService.updateCategory(catForm.id, { 
          name: catForm.name.trim(),
          crm_context: catForm.crm_context
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Category updated successfully');
      } else {
        const newCat = await dispositionService.createCategory(catForm.name.trim(), categories.length * 10, catForm.crm_context);
        
        // Only append if it belongs to the current tab
        if (catForm.crm_context === activeTab) {
          setCategories(prev => [...prev, newCat]);
          setExpandedCats(prev => ({ ...prev, [newCat.id]: true }));
        }
        toast.success('Category added successfully');
      }
      setCatModalOpen(false);
      await loadData();
    } catch (error: any) {
      if (error.message?.includes('unique_name')) {
        toast.error('A category with this name already exists.');
      } else {
        toast.error(error.message || 'Failed to save category');
      }
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextForm.name.trim() || !contextForm.id.trim()) return;
    
    setIsSavingContext(true);
    try {
      // To create a new context in the DB, we create a default category for it
      await dispositionService.createCategory('General', 0, contextForm.id);
      toast.success(`${contextForm.name} Pipeline created!`);
      setContextModalOpen(false);
      await loadData();
      setActiveTab(contextForm.id); // switch to the new tab immediately
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pipeline');
    } finally {
      setIsSavingContext(false);
    }
  };

  const confirmDeletePipeline = async () => {
    setIsDeletingPipeline(true);
    try {
      await dispositionService.deletePipeline(activeTab);
      toast.success('Pipeline deleted successfully');
      setDeletePipelineModalOpen(false);
      setActiveTab('academic'); // Switch back to default
      // loadData will be called by the useEffect watching activeTab
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key constraint violation
        toast.error('Cannot delete this pipeline because it contains dispositions that are already used by existing leads.');
      } else {
        toast.error(error.message || 'Failed to delete pipeline');
      }
    } finally {
      setIsDeletingPipeline(false);
    }
  };

  // --- Disposition Handlers ---
  const openAddDisposition = (categoryId: string) => {
    setEditingDisp(null);
    setDispForm({ categoryId, name: '', requires_follow_up: false, requires_note: false, target_status: '', crm_context: activeTab });
    setDispModalOpen(true);
  };

  const openEditDisposition = (disp: Disposition, categoryId: string) => {
    setEditingDisp(disp);
    setDispForm({
      categoryId,
      name: disp.name,
      requires_follow_up: disp.requires_follow_up || false,
      requires_note: disp.requires_note || false,
      target_status: disp.target_status || '',
      crm_context: disp.crm_context || activeTab
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
        target_status: dispForm.target_status || null,
        crm_context: dispForm.crm_context,
        category_id: dispForm.categoryId
      };

      if (editingDisp) {
        const updated = await dispositionService.updateDisposition(editingDisp.id, payload);
        
        // If moved to a new category or context changed
        if (dispForm.categoryId !== editingDisp.category_id || dispForm.crm_context !== activeTab) {
           loadData(); // Just reload to properly reflect moves
        } else {
          setDispositions(prev => ({
            ...prev,
            [dispForm.categoryId]: (prev[dispForm.categoryId] || []).map(d => d.id === updated.id ? updated : d)
          }));
        }
        toast.success('Disposition updated successfully');
      } else {
        const newDisp = await dispositionService.createDisposition(dispForm.categoryId, payload.name, payload);
        if (dispForm.crm_context === activeTab) {
          setDispositions(prev => ({
            ...prev,
            [dispForm.categoryId]: [...(prev[dispForm.categoryId] || []), newDisp]
          }));
        }
        toast.success('Disposition added successfully');
      }
      setDispModalOpen(false);
    } catch (error: any) {
      if (error.message?.includes('dispositions_unique_name_per_category')) {
        toast.error('A disposition with this name already exists in this category.');
      } else {
        toast.error(error.message || 'Failed to save disposition');
      }
    } finally {
      setIsSavingDisp(false);
    }
  };

  // --- Toggle (Activate/Deactivate) Handlers ---
  const requestToggleCategory = (cat: DispositionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToToggle({ type: 'category', id: cat.id, name: cat.name, is_active: cat.is_active });
    setToggleModalOpen(true);
  };

  const requestToggleDisposition = (disp: Disposition, categoryId: string) => {
    setItemToToggle({ type: 'disposition', id: disp.id, categoryId, name: disp.name, is_active: disp.is_active });
    setToggleModalOpen(true);
  };

  const confirmToggle = async () => {
    if (!itemToToggle) return;
    setIsToggling(true);
    try {
      if (itemToToggle.type === 'category') {
        if (itemToToggle.is_active) {
          await dispositionService.deleteCategory(itemToToggle.id);
          toast.success(`Category "${itemToToggle.name}" deactivated`);
        } else {
          await dispositionService.activateCategory(itemToToggle.id);
          toast.success(`Category "${itemToToggle.name}" activated`);
        }
      } else if (itemToToggle.type === 'disposition') {
        if (itemToToggle.is_active) {
          await dispositionService.deleteDisposition(itemToToggle.id);
          toast.success(`Disposition "${itemToToggle.name}" deactivated`);
        } else {
          await dispositionService.activateDisposition(itemToToggle.id);
          toast.success(`Disposition "${itemToToggle.name}" activated`);
        }
      }
      
      // Reload data to reflect changes
      await loadData();
      setToggleModalOpen(false);
    } catch (error: any) {
      if (error.message?.includes('dispositions_unique_name_per_category')) {
        toast.error(`Cannot activate "${itemToToggle?.name}": An active disposition with this name already exists in this category.`);
      } else {
        toast.error(error.message || 'Failed to toggle item');
      }
    } finally {
      setIsToggling(false);
    }
  };

  const requestHardDeleteCategory = (cat: DispositionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToHardDelete({ type: 'category', id: cat.id, name: cat.name });
    setHardDeleteModalOpen(true);
  };

  const requestHardDeleteDisposition = (disp: Disposition, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToHardDelete({ type: 'disposition', id: disp.id, name: disp.name });
    setHardDeleteModalOpen(true);
  };

  const confirmHardDelete = async () => {
    if (!itemToHardDelete) return;
    setIsHardDeleting(true);
    try {
      if (itemToHardDelete.type === 'category') {
        await dispositionService.hardDeleteCategory(itemToHardDelete.id);
        toast.success(`Category "${itemToHardDelete.name}" deleted permanently`);
      } else {
        await dispositionService.hardDeleteDisposition(itemToHardDelete.id);
        toast.success(`Disposition "${itemToHardDelete.name}" deleted permanently`);
      }
      await loadData();
      setHardDeleteModalOpen(false);
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key constraint violation
        toast.error(`Cannot delete "${itemToHardDelete.name}" because it is already used by existing leads. Try deactivating it instead.`);
      } else {
        toast.error(error.message || 'Failed to delete item permanently');
      }
    } finally {
      setIsHardDeleting(false);
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
          {availableContexts.map(ctx => (
            <button
              key={ctx.id}
              onClick={() => setActiveTab(ctx.id)}
              className={cn(
                "px-6 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                activeTab === ctx.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ctx.label}
            </button>
          ))}
          <button
            onClick={() => {
              setContextForm({ name: '', id: '' });
              setContextModalOpen(true);
            }}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Pipeline
          </button>
          
          {!['academic', 'b2b'].includes(activeTab) && (
            <>
              <div className="w-px h-6 bg-border mx-2 self-center shrink-0" />
              <button
                onClick={() => setDeletePipelineModalOpen(true)}
                className="px-3 py-2.5 text-sm font-semibold rounded-lg text-destructive hover:bg-destructive/10 transition-all flex items-center gap-1.5 whitespace-nowrap"
                title="Delete this Pipeline"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
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
                    onClick={(e) => requestToggleCategory(cat, e)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      cat.is_active 
                        ? "text-muted-foreground hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                        : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                    )}
                    title={cat.is_active ? "Deactivate Category" : "Activate Category"}
                  >
                    {cat.is_active ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={(e) => requestHardDeleteCategory(cat, e)}
                    className="p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Delete Permanently"
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
                              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                                {disp.name}
                                {!disp.is_active && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-destructive/10 text-destructive uppercase tracking-wider border border-destructive/20">Inactive</span>
                                )}
                              </div>
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
                                onClick={(e) => { e.stopPropagation(); requestToggleDisposition(disp, cat.id); }}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  disp.is_active 
                                    ? "text-muted-foreground hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                                    : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                                )}
                                title={disp.is_active ? "Deactivate Disposition" : "Activate Disposition"}
                              >
                                {disp.is_active ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={(e) => requestHardDeleteDisposition(disp, e)}
                                className="p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"
                                title="Delete Permanently"
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
      
      {/* Context/Pipeline Modal */}
      {contextModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Create New Pipeline</h2>
              <button onClick={() => setContextModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveContext} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Pipeline Name *</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={contextForm.name}
                  onChange={e => {
                    const val = e.target.value;
                    setContextForm({ 
                      name: val, 
                      id: val.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
                    })
                  }}
                  placeholder="e.g. Finance CRM, Marketing Team"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">System ID (Auto-generated)</label>
                <input 
                  type="text"
                  disabled
                  value={contextForm.id}
                  className="w-full px-3 py-2.5 bg-muted text-muted-foreground border border-border rounded-xl text-sm font-mono cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1.5">This ID is used internally in the database.</p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setContextModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingContext || !contextForm.name.trim()} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50">
                  {isSavingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSavingContext ? 'Creating...' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {catForm.id ? 'Edit Category' : 'Create Category'}
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
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. CONTACTED, NOT INTERESTED"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Context *</label>
                {!isCustomContext ? (
                  <select
                    required
                    value={catForm.crm_context}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setIsCustomContext(true);
                        setCatForm({ ...catForm, crm_context: '' });
                      } else {
                        setCatForm({ ...catForm, crm_context: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  >
                    {availableContexts.map(ctx => (
                      <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
                    ))}
                    <option value="new" className="font-semibold text-primary">+ Add New Custom Context...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={catForm.crm_context}
                      onChange={e => setCatForm({ ...catForm, crm_context: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="e.g. marketing_crm"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCustomContext(false);
                        setCatForm({ ...catForm, crm_context: activeTab });
                      }}
                      className="px-4 py-2.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  {isCustomContext 
                    ? "Use only lowercase letters, numbers, and underscores (e.g. 'marketing_crm')." 
                    : "This determines which pipeline this category belongs to."}
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setCatModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingCat || !catForm.name.trim() || !catForm.crm_context} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Context *</label>
                  <select
                    required
                    disabled
                    value={dispForm.crm_context}
                    className="w-full px-3 py-2.5 bg-muted text-muted-foreground border border-border rounded-xl text-sm focus:outline-none transition-all opacity-70 cursor-not-allowed"
                  >
                    <option value={dispForm.crm_context}>{availableContexts.find(c => c.id === dispForm.crm_context)?.label || dispForm.crm_context}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Category *</label>
                  <select
                    required
                    value={dispForm.categoryId}
                    onChange={e => setDispForm({ ...dispForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  {DEFAULT_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* Toggle Confirmation Modal */}
      {toggleModalOpen && itemToToggle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className={cn(
              "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4",
              itemToToggle.is_active 
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            )}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {itemToToggle.is_active ? 'Deactivate' : 'Activate'} {itemToToggle.type}?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to {itemToToggle.is_active ? 'deactivate' : 'activate'} the {itemToToggle.type} <strong className="text-foreground">"{itemToToggle.name}"</strong>? 
              {itemToToggle.is_active 
                ? " This will hide it from future use. Existing leads with this disposition will not be affected."
                : " This will make it available for future use."}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmToggle}
                disabled={isToggling}
                className={cn(
                  "w-full flex justify-center items-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-all disabled:opacity-50",
                  itemToToggle.is_active 
                    ? "bg-amber-600 hover:bg-amber-700" 
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : (itemToToggle.is_active ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />)}
                {isToggling ? 'Processing...' : `Yes, ${itemToToggle.is_active ? 'deactivate' : 'activate'}`}
              </button>
              <button 
                onClick={() => setToggleModalOpen(false)}
                disabled={isToggling}
                className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Pipeline Confirmation Modal */}
      {deletePipelineModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Delete Pipeline?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to permanently delete the <strong className="text-foreground">"{availableContexts.find(c => c.id === activeTab)?.label}"</strong> pipeline? This will also delete all categories and dispositions within it. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDeletePipeline}
                disabled={isDeletingPipeline}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {isDeletingPipeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeletingPipeline ? 'Deleting...' : 'Yes, Delete Pipeline'}
              </button>
              <button 
                onClick={() => setDeletePipelineModalOpen(false)}
                disabled={isDeletingPipeline}
                className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {hardDeleteModalOpen && itemToHardDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Permanently Delete {itemToHardDelete.type}?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to permanently delete <strong className="text-foreground">"{itemToHardDelete.name}"</strong>? 
              This action cannot be undone. If this item has been used by any leads, you will not be able to delete it.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmHardDelete}
                disabled={isHardDeleting}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {isHardDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isHardDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button 
                onClick={() => setHardDeleteModalOpen(false)}
                disabled={isHardDeleting}
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
