import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface UniversityComparisonProps {
  universities: any[];
  onClose: () => void;
}

export function UniversityComparison({ universities, onClose }: UniversityComparisonProps) {
  if (!universities || universities.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-xl font-bold">University Comparison</h2>
            <p className="text-sm text-muted-foreground mt-1">Comparing {universities.length} selected universities</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-card z-10 shadow-sm">
              <tr>
                <th className="p-4 border-b border-r border-border font-medium text-muted-foreground w-48 bg-muted/10">Feature</th>
                {universities.map(uni => (
                  <th key={uni.code} className="p-4 border-b border-r last:border-r-0 border-border bg-card w-64 align-top">
                    <div className="text-lg font-bold text-foreground mb-1">{uni.name}</div>
                    <div className="text-xs text-primary font-medium flex items-center gap-1">
                      Score: {uni.compatibilityScore}%
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Approvals */}
              <tr>
                <td className="p-4 border-b border-r border-border font-medium text-sm bg-muted/10">Key Approvals</td>
                {universities.map(uni => (
                  <td key={uni.code} className="p-4 border-b border-r last:border-r-0 border-border text-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> UGC Approved</div>
                      <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> DEB Approved</div>
                      {uni.naacGrade && <div className="flex items-center gap-2 mt-1"><span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">NAAC {uni.naacGrade}</span></div>}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Fees */}
              <tr>
                <td className="p-4 border-b border-r border-border font-medium text-sm bg-muted/10">Fee Structure</td>
                {universities.map(uni => (
                  <td key={uni.code} className="p-4 border-b border-r last:border-r-0 border-border text-sm">
                    <div className="font-bold text-lg mb-1">₹{uni.feeBreakdown?.total?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Per Semester: ₹{uni.feeBreakdown?.semester?.toLocaleString()}</div>
                  </td>
                ))}
              </tr>

              {/* Pros & Cons */}
              <tr>
                <td className="p-4 border-b border-r border-border font-medium text-sm bg-muted/10">Pros & Cons</td>
                {universities.map(uni => (
                  <td key={uni.code} className="p-4 border-b border-r last:border-r-0 border-border text-sm">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-emerald-600 mb-1">Pros</div>
                        <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground">
                          {uni.pros?.map((pro: string, i: number) => <li key={i}>{pro}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-red-500 mb-1">Cons</div>
                        <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground">
                          {uni.cons?.map((con: string, i: number) => <li key={i}>{con}</li>)}
                        </ul>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Placements */}
              <tr>
                <td className="p-4 border-b border-r border-border font-medium text-sm bg-muted/10">Expected Outcome</td>
                {universities.map(uni => (
                  <td key={uni.code} className="p-4 border-b border-r last:border-r-0 border-border text-sm text-muted-foreground leading-relaxed">
                    {uni.expectedOutcome}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
