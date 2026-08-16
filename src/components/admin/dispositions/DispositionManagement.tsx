import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { dispositionService } from '../../../lib/dispositionService';
import { DispositionCategory, Disposition } from '../../../types/disposition';
import { Plus, Edit2, CheckCircle, XCircle, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { toast } from 'sonner';

export function DispositionManagement() {
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, Disposition[]>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      toast.error('Failed to load dispositions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Disposition Configuration</h2>
          <p className="text-muted-foreground">Manage lead dispositions, sub-dispositions, and next actions.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {categories.map((cat) => (
          <div key={cat.id} className="border-b border-border last:border-0">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="flex items-center gap-3">
                {expandedCats[cat.id] ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                <h3 className="font-semibold text-lg">{cat.name}</h3>
                {!cat.is_active && <span className="px-2 py-1 text-xs rounded-full bg-destructive/10 text-destructive">Inactive</span>}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); /* handle edit */ }}>
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedCats[cat.id] && (
              <div className="bg-muted/20 p-4 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Dispositions</h4>
                  <button className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Disposition
                  </button>
                </div>
                
                {dispositions[cat.id]?.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No dispositions found.</p>
                ) : (
                  <div className="space-y-2">
                    {dispositions[cat.id]?.map(disp => (
                      <div key={disp.id} className="bg-card border border-border rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{disp.name}</div>
                          <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                            {disp.requires_follow_up && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Follow-up Required</span>}
                            {disp.requires_note && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-blue-500" /> Note Required</span>}
                            {disp.target_status && <span className="bg-primary/10 text-primary px-2 rounded-full">Sets: {disp.target_status}</span>}
                          </div>
                        </div>
                        <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
