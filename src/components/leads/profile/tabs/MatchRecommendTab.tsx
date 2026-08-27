import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Download, GitCompare, CheckCircle2, XCircle, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { Lead, AiRecommendation } from '../../../../types/schema';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { RecommendationEngine, AIRecommendationResult } from '../../../../lib/ai/RecommendationEngine';
import { toast } from 'sonner';
import { UniversityComparison } from './UniversityComparison';
import { generatePDF } from '../../../../lib/pdfGenerator';
import { BrandedPDFReport } from './BrandedPDFReport';
import { ProfileReadiness } from '../../../../lib/counseling/ProfileReadiness';

interface MatchRecommendTabProps {
  lead: Lead;
}

export function MatchRecommendTab({ lead }: MatchRecommendTabProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Evaluate Readiness
  const readiness = ProfileReadiness.evaluate(lead);

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
    if (!readiness.isReady) {
       toast.error('Cannot evaluate: Missing required academic data.');
       return;
    }
    
    setGenerating(true);
    try {
      const result = await RecommendationEngine.generate(lead.id);
      if (!result) throw new Error('Failed to generate recommendation');
      
      const savedRec = await RecommendationEngine.saveRecommendation(lead.id, user.id, result);
      setRecommendation(savedRec as AiRecommendation);
      toast.success('Recommendations Generated!');
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
      if (selectedForComparison.length >= 4) {
        toast.error('You can only compare up to 4 programs');
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
      <div className="space-y-6">
        {/* Profile Readiness Widget */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" /> Profile Readiness
          </h3>
          
          <div className="mb-4">
             <div className="flex justify-between text-sm mb-1">
                <span>Profile Completeness</span>
                <span className="font-bold">{readiness.completenessPercentage}%</span>
             </div>
             <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${readiness.completenessPercentage}%` }}></div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1">
                   <AlertTriangle className="w-4 h-4" /> Required for Eligibility
                </h4>
                {readiness.missingRequiredFields.length > 0 ? (
                   <ul className="text-sm space-y-1">
                      {readiness.missingRequiredFields.map(f => (
                         <li key={f} className="text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> {f} missing
                         </li>
                      ))}
                   </ul>
                ) : (
                   <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> All required fields present
                   </p>
                )}
             </div>
             <div>
                <h4 className="text-sm font-semibold text-orange-500 mb-2 flex items-center gap-1">
                   <HelpCircle className="w-4 h-4" /> Optional for Better Matching
                </h4>
                {readiness.missingOptionalFields.length > 0 ? (
                   <ul className="text-sm space-y-1">
                      {readiness.missingOptionalFields.map(f => (
                         <li key={f} className="text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> {f} missing
                         </li>
                      ))}
                   </ul>
                ) : (
                   <p className="text-sm text-emerald-600">All optional fields present</p>
                )}
             </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-card">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Edvix Eligibility & Matching Engine</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Evaluate academic eligibility deterministically and find the best matching programs for this student based on budget, career goals, and verified rules.
          </p>
          <button 
            onClick={handleGenerate}
            disabled={generating || !readiness.isReady}
            className={`${!readiness.isReady ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'} px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm`}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Evaluating Rules & Matching...' : 'Run Eligibility & Match'}
          </button>
        </div>
      </div>
    );
  }

  const unis = recommendation.universities_recommended || [];
  
  const getEligibilityBadge = (status: string) => {
     switch(status) {
        case 'VERIFIED_ELIGIBLE': return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">Verified Eligible</span>;
        case 'LIKELY_ELIGIBLE': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Likely Eligible</span>;
        case 'CONDITIONAL': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Conditional</span>;
        case 'MANUAL_REVIEW': return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">Manual Review</span>;
        case 'NOT_ELIGIBLE': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Not Eligible</span>;
        default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
     }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Top Recommendations
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Evaluated on {new Date(recommendation.createdAt || Date.now()).toLocaleDateString()}</p>
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
                <div className="text-3xl font-bold text-primary mb-1">{uni.matchScore || uni.compatibilityScore}%</div>
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
                  <div>
                     <h4 className="text-lg font-bold">{index + 1}. {uni.courseName || uni.name}</h4>
                     <p className="text-sm text-muted-foreground">{uni.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     {getEligibilityBadge(uni.eligibilityStatus)}
                     {recommendation.status === 'Accepted' && recommendation.selectedUniversityCode === uni.code && (
                       <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1">
                         <CheckCircle2 className="w-3 h-3" /> Selected
                       </span>
                     )}
                  </div>
                </div>
                
                {uni.eligibilityExplanation && (
                   <div className="bg-muted/50 p-3 rounded-lg border border-border mb-4 text-xs">
                      <span className="font-semibold text-foreground mb-1 block">Rule Evaluation:</span>
                      <span className="text-muted-foreground">{uni.eligibilityExplanation}</span>
                   </div>
                )}
                
                <p className="text-sm text-foreground/80 mb-4">{uni.reason}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-muted/20 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                       {uni.isFeeFinal ? 'Final Payable Fee' : 'Estimated Payable Fee'}
                       {!uni.isFeeFinal && <AlertTriangle className="w-3 h-3 inline ml-1 text-orange-500" title="Missing mandatory fee components" />}
                    </span>
                    <span className="font-bold text-lg">₹{(uni.estimatedPayable || uni.feeBreakdown?.total || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">EMI Estimate (12 mo)</span>
                    <span className="font-semibold">₹{(uni.emiEstimate || 0).toLocaleString()}/mo</span>
                  </div>
                </div>
                
                {recommendation.status === 'Pending' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button 
                      onClick={() => handleStatusUpdate('Accepted', uni.code)}
                      className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Approve & Recommend
                    </button>
                    <button 
                      className="text-xs bg-muted text-foreground hover:bg-muted/80 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Offer Calculator
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

        {/* Counselor Info Sidebar */}
        <div className="space-y-4">
           {/* Replace this with insights... skipping for brevity but keeping structure */}
           <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
             <h3 className="font-bold text-sm mb-2">Need to Add Manually?</h3>
             <p className="text-xs text-muted-foreground mb-4">If the best match isn't listed, you can manually search and add a program. Note: It will still pass through the Eligibility Engine.</p>
             <button className="w-full text-xs font-medium border border-border rounded-lg py-2 hover:bg-muted transition-colors">
                + Manually Add Program
             </button>
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
