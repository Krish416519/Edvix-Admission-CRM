import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Download, GitCompare, CheckCircle2, XCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { Lead, AiRecommendation } from '../../../../types/schema';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { RecommendationEngine, AIRecommendationResult } from '../../../../lib/ai/RecommendationEngine';
import { toast } from 'sonner';
import { UniversityComparison } from './UniversityComparison';
import { generatePDF } from '../../../../lib/pdfGenerator';
import { BrandedPDFReport } from './BrandedPDFReport';

interface AIRecommendationTabProps {
  lead: Lead;
}

export function AIRecommendationTab({ lead }: AIRecommendationTabProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchRecommendation();
  }, [lead.id]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setRecommendation(data as AiRecommendation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const result = await RecommendationEngine.generate(lead.id);
      if (!result) throw new Error('Failed to generate recommendation');
      
      const savedRec = await RecommendationEngine.saveRecommendation(lead.id, user.id, result);
      setRecommendation(savedRec as AiRecommendation);
      toast.success('AI Recommendations Generated!');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCompare = (code: string) => {
    if (selectedForComparison.includes(code)) {
      setSelectedForComparison(prev => prev.filter(c => c !== code));
    } else {
      if (selectedForComparison.length >= 3) {
        toast.error('You can only compare up to 3 universities');
        return;
      }
      setSelectedForComparison(prev => [...prev, code]);
    }
  };

  const handleStatusUpdate = async (status: 'Accepted' | 'Rejected', uniCode?: string) => {
    if (!recommendation) return;
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .update({ status, selected_university_code: uniCode })
        .eq('id', recommendation.id)
        .select()
        .single();
        
      if (error) throw error;
      setRecommendation(data as AiRecommendation);
      toast.success(`Recommendation marked as ${status}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    toast.info('Generating branded PDF report...');
    try {
      await generatePDF('ai-recommendation-pdf', `${lead.firstName}_University_Report.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (e) {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!recommendation) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-card">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Edvix AI University Engine 2.0</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Our advanced AI analyzes the student's complete profile, budget, and career goals to recommend the top 5 perfect universities from our database.
        </p>
        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {generating ? 'Analyzing 1,000+ Universities...' : 'Generate Recommendations'}
        </button>
      </div>
    );
  }

  const unis = recommendation.universities_recommended || [];
  const notes = recommendation.counselor_notes;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI Recommendations
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Generated on {new Date(recommendation.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedForComparison.length > 1 && (
            <button 
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              <GitCompare className="w-4 h-4" /> Compare ({selectedForComparison.length})
            </button>
          )}
          <button 
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 border border-border bg-card text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recommendations List */}
        <div className="lg:col-span-2 space-y-4">
          {unis.map((uni: any, index: number) => (
            <div key={uni.code} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-32 bg-muted/30 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border shrink-0">
                <div className="text-3xl font-bold text-primary mb-1">{uni.compatibilityScore}%</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Match Score</div>
                <div className="mt-4 w-full px-2">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedForComparison.includes(uni.code)}
                      onChange={() => toggleCompare(uni.code)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    Compare
                  </label>
                </div>
              </div>
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold">{index + 1}. {uni.name}</h4>
                  {recommendation.status === 'Accepted' && recommendation.selectedUniversityCode === uni.code && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mb-4">{uni.reason}</p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Total Fee</span>
                    <span className="font-semibold">₹{uni.feeBreakdown?.total?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">EMI Estimate</span>
                    <span className="font-semibold">₹{uni.emiEstimate?.toLocaleString()}/mo</span>
                  </div>
                </div>
                {recommendation.status === 'Pending' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button 
                      onClick={() => handleStatusUpdate('Accepted', uni.code)}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Accept Selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {recommendation.status === 'Pending' && (
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => handleStatusUpdate('Rejected')}
                className="text-sm text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> Reject All Recommendations
              </button>
            </div>
          )}
        </div>

        {/* Counselor Notes Sidebar */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-indigo-700 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" /> Counselor Insights
            </h3>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Talking Points</h4>
                <ul className="space-y-2">
                  {notes?.talkingPoints?.map((tp: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Objection Handling</h4>
                <div className="space-y-3">
                  {notes?.objectionHandling?.map((obj: any, i: number) => (
                    <div key={i} className="bg-background/50 p-3 rounded-lg border border-border">
                      <div className="text-xs font-semibold mb-1 text-red-500">"{obj.objection}"</div>
                      <div className="text-sm text-foreground/80">{obj.response}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Next Steps</h4>
                <p className="text-sm text-foreground/80">{notes?.recommendedFollowUp}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showComparison && (
        <UniversityComparison 
          universities={unis.filter((u: any) => selectedForComparison.includes(u.code))} 
          onClose={() => setShowComparison(false)} 
        />
      )}

      {/* Hidden PDF Report component (rendered off-screen for html-to-image) */}
      <div className="hidden">
        <BrandedPDFReport lead={lead} recommendation={recommendation} />
      </div>
    </div>
  );
}
