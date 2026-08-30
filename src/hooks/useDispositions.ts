import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DispositionCategory, Disposition } from '../types/disposition';

export interface DispositionConfig {
  categories: DispositionCategory[];
  dispositionsByCategory: Record<string, Disposition[]>;
  allActiveDispositions: Disposition[];
  categoryMap: Record<string, DispositionCategory>;
  dispositionMap: Record<string, Disposition>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

let refreshCallbacks: (() => void)[] = [];

export function useDispositions(): DispositionConfig {
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositionsByCategory, setDispositionsByCategory] = useState<Record<string, Disposition[]>>({});
  const [allActiveDispositions, setAllActiveDispositions] = useState<Disposition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDispositions = useCallback(async () => {
    try {
      setError(null);
      const [catsRes, dispsRes] = await Promise.all([
        supabase
          .from('disposition_categories')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true }),
        supabase
          .from('dispositions')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true })
      ]);

      if (catsRes.error) throw catsRes.error;
      if (dispsRes.error) throw dispsRes.error;

      const cats = catsRes.data || [];
      const disps = dispsRes.data || [];

      setCategories(cats);
      setAllActiveDispositions(disps);

      const byCat: Record<string, Disposition[]> = {};
      const catMap: Record<string, DispositionCategory> = {};
      const dispMap: Record<string, Disposition> = {};

      cats.forEach(cat => {
        catMap[cat.id] = cat;
        byCat[cat.id] = disps.filter(d => d.category_id === cat.id);
      });

      disps.forEach(d => {
        dispMap[d.id] = d;
      });

      setDispositionsByCategory(byCat);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispositions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadDispositions();
  }, [loadDispositions]);

  useEffect(() => {
    loadDispositions();

    const channel = supabase
      .channel('dispositions_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disposition_categories' }, () => {
        loadDispositions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositions' }, () => {
        loadDispositions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDispositions]);

  const categoryMap: Record<string, DispositionCategory> = {};
  const dispositionMap: Record<string, Disposition> = {};
  categories.forEach(cat => { categoryMap[cat.id] = cat; });
  allActiveDispositions.forEach(d => { dispositionMap[d.id] = d; });

  return {
    categories,
    dispositionsByCategory,
    allActiveDispositions,
    categoryMap,
    dispositionMap,
    isLoading,
    error,
    refresh
  };
}

export function getActiveCategoryIds(dispositions: Disposition[], allCategories: DispositionCategory[]): string[] {
  const activeCatIds = new Set(allCategories.filter(c => c.is_active).map(c => c.id));
  return Array.from(new Set(dispositions.filter(d => d.is_active && activeCatIds.has(d.category_id)).map(d => d.category_id)));
}

export function getDispositionIdsByCategory(
  categoryId: string | null,
  dispositions: Disposition[]
): string[] {
  if (!categoryId) return [];
  return dispositions.filter(d => d.category_id === categoryId && d.is_active).map(d => d.id);
}

export function getCategoryByName(
  categories: DispositionCategory[],
  name: string
): DispositionCategory | undefined {
  const lower = name.toLowerCase();
  return categories.find(c => c.name.toLowerCase() === lower);
}

export function getCategoryCodeByName(
  categories: DispositionCategory[],
  name: string
): string | null {
  const cat = getCategoryByName(categories, name);
  return cat?.id || null;
}

refreshCallbacks = [];

export function broadcastDispositionChange() {
  refreshCallbacks.forEach(cb => cb());
}

export function subscribeDispositionChanges(cb: () => void) {
  refreshCallbacks.push(cb);
  return () => {
    refreshCallbacks = refreshCallbacks.filter(c => c !== cb);
  };
}
