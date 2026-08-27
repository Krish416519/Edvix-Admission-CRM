import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AIIntelligenceService } from '../lib/ai/AIIntelligenceService';
import type {
  AIRecommendation,
  AINextBestAction,
  AIFollowUpIntelligence,
  AIAnomaly,
  AIDataQualityIssue,
} from '../types/ai-intelligence';

interface AIIntelligenceContextType {
  recommendations: AIRecommendation[];
  nextBestActions: AINextBestAction[];
  followUpIntelligence: AIFollowUpIntelligence[];
  anomalies: AIAnomaly[];
  dataQualityIssues: AIDataQualityIssue[];
  stats: {
    totalRecommendations: number;
    newRecommendations: number;
    acceptedRecommendations: number;
    activeAnomalies: number;
    dataQualityIssues: number;
  };
  isLoading: boolean;
  refreshRecommendations: () => Promise<void>;
  refreshNextBestActions: () => Promise<void>;
  refreshFollowUps: () => Promise<void>;
  refreshAnomalies: () => Promise<void>;
  refreshDataQuality: () => Promise<void>;
  updateRecommendationStatus: (id: string, status: AIRecommendation['status']) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AIIntelligenceContext = createContext<AIIntelligenceContextType | null>(null);

export function useAIIntelligence() {
  const context = useContext(AIIntelligenceContext);
  if (!context) {
    throw new Error('useAIIntelligence must be used within an AIIntelligenceProvider');
  }
  return context;
}

export function AIIntelligenceProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [nextBestActions, setNextBestActions] = useState<AINextBestAction[]>([]);
  const [followUpIntelligence, setFollowUpIntelligence] = useState<AIFollowUpIntelligence[]>([]);
  const [anomalies, setAnomalies] = useState<AIAnomaly[]>([]);
  const [dataQualityIssues, setDataQualityIssues] = useState<AIDataQualityIssue[]>([]);
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    newRecommendations: 0,
    acceptedRecommendations: 0,
    activeAnomalies: 0,
    dataQualityIssues: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshRecommendations = useCallback(async () => {
    const recs = await AIIntelligenceService.getRecommendations({ limit: 50 });
    setRecommendations(recs);
  }, []);

  const refreshNextBestActions = useCallback(async () => {
    const actions = await AIIntelligenceService.getNextBestActions(10);
    setNextBestActions(actions);
  }, []);

  const refreshFollowUps = useCallback(async () => {
    const followUps = await AIIntelligenceService.getFollowUpIntelligence(20);
    setFollowUpIntelligence(followUps);
  }, []);

  const refreshAnomalies = useCallback(async () => {
    const anom = await AIIntelligenceService.getAnomalies();
    setAnomalies(anom);
  }, []);

  const refreshDataQuality = useCallback(async () => {
    const issues = await AIIntelligenceService.getDataQualityIssues(20);
    setDataQualityIssues(issues);
  }, []);

  const updateRecommendationStatus = useCallback(async (id: string, status: AIRecommendation['status']) => {
    await AIIntelligenceService.updateRecommendationStatus(id, status);
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recs, actions, followUps, anom, issues, st] = await Promise.all([
        AIIntelligenceService.getRecommendations({ limit: 50 }),
        AIIntelligenceService.getNextBestActions(10),
        AIIntelligenceService.getFollowUpIntelligence(20),
        AIIntelligenceService.getAnomalies(),
        AIIntelligenceService.getDataQualityIssues(20),
        AIIntelligenceService.getStats(),
      ]);
      setRecommendations(recs);
      setNextBestActions(actions);
      setFollowUpIntelligence(followUps);
      setAnomalies(anom);
      setDataQualityIssues(issues);
      setStats(st);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <AIIntelligenceContext.Provider
      value={{
        recommendations,
        nextBestActions,
        followUpIntelligence,
        anomalies,
        dataQualityIssues,
        stats,
        isLoading,
        refreshRecommendations,
        refreshNextBestActions,
        refreshFollowUps,
        refreshAnomalies,
        refreshDataQuality,
        updateRecommendationStatus,
        refreshAll,
      }}
    >
      {children}
    </AIIntelligenceContext.Provider>
  );
}
