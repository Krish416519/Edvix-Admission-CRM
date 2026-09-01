import { useState, useEffect, useCallback, useRef } from 'react';
import { dispositionService } from '../lib/dispositionService';
import { supabase } from '../lib/supabase';
import { DispositionCategory, Disposition } from '../types/disposition';

export function getCategoryByName(categories: DispositionCategory[], name: string): DispositionCategory | undefined {
  const lowerName = name.toLowerCase();
  return categories.find(c => c.name.toLowerCase() === lowerName);
}

export function getCategoryById(categories: DispositionCategory[], id: string): DispositionCategory | undefined {
  return categories.find(c => c.id === id);
}

export function getDispositionIdsByCategory(categoryId: string, dispositions: Disposition[]): string[] {
  return dispositions.filter(d => d.category_id === categoryId).map(d => d.id);
}

export interface UseDispositionsResult {
  categories: DispositionCategory[];
  dispositions: Disposition[];
  dispositionsByCategory: Record<string, Disposition[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getCategoryByName: (name: string) => DispositionCategory | undefined;
  getCategoryById: (id: string) => DispositionCategory | undefined;
  getDispositionsByCategoryId: (categoryId: string) => Disposition[] | undefined;
}

export function useDispositions(crmContext?: string): UseDispositionsResult {
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchDispositions = useCallback(async () => {
    // If context is not yet resolved, do NOT fetch — never assume a context.
    if (crmContext === undefined) {
      setCategories([]);
      setDispositions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [cats, disps] = await Promise.all([
        dispositionService.getCategories(crmContext),
        dispositionService.getDispositions(undefined, crmContext),
      ]);
      setCategories(cats);
      setDispositions(disps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispositions');
      setCategories([]);
      setDispositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [crmContext]);

  useEffect(() => {
    fetchDispositions();

    // Set up realtime subscription for automatic updates when Super Admin
    // changes dispositions (add/remove/rename/activate/deactivate)
    const channelId = `dispositions_changes_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disposition_categories' }, (payload) => {
        console.log('Disposition category change:', payload);
        fetchDispositions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositions' }, (payload) => {
        console.log('Disposition change:', payload);
        fetchDispositions();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchDispositions, crmContext]);

  const dispositionsByCategory = useCallback(
    (): Record<string, Disposition[]> => {
      const map: Record<string, Disposition[]> = {};
      categories.forEach(cat => {
        map[cat.id] = dispositions.filter(d => d.category_id === cat.id);
      });
      return map;
    },
    [categories, dispositions]
  )();

  const getCategoryByName = useCallback(
    (name: string): DispositionCategory | undefined => {
      const lowerName = name.toLowerCase();
      return categories.find(c => c.name.toLowerCase() === lowerName);
    },
    [categories]
  );

  const getCategoryById = useCallback(
    (id: string): DispositionCategory | undefined => {
      return categories.find(c => c.id === id);
    },
    [categories]
  );

  const getDispositionsByCategoryId = useCallback(
    (categoryId: string): Disposition[] | undefined => {
      const result = dispositions.filter(d => d.category_id === categoryId);
      return result.length > 0 ? result : undefined;
    },
    [dispositions]
  );

  return {
    categories,
    dispositions,
    dispositionsByCategory,
    isLoading,
    error,
    refetch: fetchDispositions,
    getCategoryByName,
    getCategoryById,
    getDispositionsByCategoryId,
  };
}
