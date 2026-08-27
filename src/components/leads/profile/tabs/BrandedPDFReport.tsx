
import { Lead, AiRecommendation } from '../../../../types/schema';
import { Sparkles, CheckCircle, GraduationCap, Building2 } from 'lucide-react';

interface BrandedPDFReportProps {
  lead: Lead;
  recommendation: AiRecommendation;
}

export function BrandedPDFReport({ lead, recommendation }: BrandedPDFReportProps) {
  const unis = recommendation.universitiesRecommended || [];

  return (
    <div id="ai-recommendation-pdf" className="bg-white p-12 text-slate-900 w-[794px] min-h-[1123px] relative mx-auto hidden print:block">
      {/* Edvix Branding Header */}
      <div className="flex items-center justify-between border-b-4 border-indigo-600 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-indigo-700 tracking-tight">Edvix</h1>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">AI Recommendation Engine</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">{lead.name}</p>
          <p className="text-sm text-slate-500">{lead.email} | {lead.phone}</p>
          <p className="text-xs text-slate-400 mt-1">Generated: {new Date(recommendation.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Student Profile Summary */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" /> AI Profile Analysis
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-semibold text-slate-500 w-32 inline-block">Preferred Course:</span> {lead.preferredSpecialization || 'Not Specified'}</div>
          <div><span className="font-semibold text-slate-500 w-32 inline-block">Budget:</span> {lead.budget || 'Not Specified'}</div>
          <div><span className="font-semibold text-slate-500 w-32 inline-block">Education:</span> {lead.education || 'Not Specified'}</div>
          <div><span className="font-semibold text-slate-500 w-32 inline-block">Career Goal:</span> {lead.careerGoal || 'Not Specified'}</div>
        </div>
      </div>

      {/* Top Recommendations */}
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-indigo-600" /> Top University Matches
      </h2>

      <div className="space-y-6">
        {unis.slice(0, 3).map((uni: any, index: number) => (
          <div key={index} className="border-2 border-slate-200 rounded-xl p-6 relative overflow-hidden page-break-inside-avoid">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white font-bold px-4 py-2 rounded-bl-xl text-lg">
              {uni.compatibilityScore}% Match
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2 w-3/4">{index + 1}. {uni.name}</h3>
            <p className="text-slate-600 text-sm mb-4">{uni.reason}</p>
            
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wide">Key Benefits</h4>
                <ul className="space-y-1">
                  {uni.pros?.slice(0, 3).map((pro: string, i: number) => (
                    <li key={i} className="text-xs flex items-start gap-1.5 text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Financial Overview</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Total Fee</span>
                    <span className="font-bold text-slate-900">₹{uni.feeBreakdown?.total?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">EMI Estimate</span>
                    <span className="font-bold text-slate-900">₹{uni.emiEstimate?.toLocaleString()}/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>This is an AI-generated advisory document created by the Edvix platform.</p>
        <p className="mt-1">For official admissions details, always refer to the university prospectus.</p>
      </div>
    </div>
  );
}
