import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X } from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ImportJob } from '../../types/integration';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function ImportTab() {
  const { importJobs: jobs, simulateCsvImport } = useIntegration();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            CSV / Excel Imports
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Bulk import leads and map fields to the CRM.</p>
        </div>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          New Import
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium text-muted-foreground">File Name</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Progress</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium">
                  {job.filename}
                  <div className="text-[10px] text-muted-foreground mt-0.5">Source: {job.source}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {job.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {job.status === 'Processing' && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
                    {job.status === 'Failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    
                    <span className={cn(
                      "font-semibold text-xs",
                      job.status === 'Completed' ? "text-emerald-700 dark:text-emerald-400" :
                      job.status === 'Processing' ? "text-primary" :
                      "text-muted-foreground"
                    )}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-24">
                      <div 
                        className={cn(
                          "h-full transition-all duration-300", 
                          job.status === 'Failed' ? "bg-red-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${(job.successCount / job.totalRows) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {job.successCount} / {job.totalRows}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(job.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isImportModalOpen && (
        <ImportWizard onClose={() => setIsImportModalOpen(false)} />
      )}
    </div>
  );
}

function ImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSimulateImport = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    toast.success('Import completed successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-lg font-semibold">Import Leads</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-md"><X className="w-5 h-5"/></button>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between text-sm font-medium relative">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-muted -z-10"></div>
          
          {[1, 2, 3].map(i => (
            <div key={i} className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
              step === i ? "bg-primary border-primary text-white" :
              step > i ? "bg-primary border-primary text-white" : "bg-card border-muted text-muted-foreground"
            )}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 bg-background min-h-[300px] flex flex-col">
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl hover:bg-muted/10 transition-colors">
              <Upload className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-1">Upload CSV</h3>
              <p className="text-sm text-muted-foreground mb-4">Drag and drop your file here, or click to browse</p>
              
              <input 
                type="file" 
                id="csvUpload" 
                className="hidden" 
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setStep(2);
                  }
                }}
              />
              <label 
                htmlFor="csvUpload"
                className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm cursor-pointer"
              >
                Select File
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col">
              <h3 className="font-semibold mb-4">Map Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">Map the columns in "{file?.name}" to CRM fields.</p>
              
              <div className="space-y-3 flex-1 overflow-y-auto border border-border rounded-lg p-4 bg-muted/20">
                {/* Mock field mapping rows */}
                {['First Name', 'Phone Number', 'Email Address', 'Desired Course'].map((field, i) => (
                  <div key={i} className="flex items-center gap-4 bg-card p-3 rounded-lg border border-border shadow-sm">
                    <div className="flex-1 font-medium text-sm">{field} <span className="text-xs text-muted-foreground font-normal">(from CSV)</span></div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <select className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary">
                      <option>Student Name</option>
                      <option>Phone</option>
                      <option>Email</option>
                      <option>Course</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Ready to Import</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Found 150 rows in the CSV. Validation passed. Duplicate detection will run automatically.
              </p>
              <div className="w-full bg-muted p-4 rounded-lg flex justify-between items-center text-sm border border-border text-left">
                <div>
                  <div className="text-muted-foreground">Source</div>
                  <div className="font-medium">{file?.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Rows</div>
                  <div className="font-medium">150</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Mapped Fields</div>
                  <div className="font-medium">4/4</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 3 && (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm disabled:opacity-50"
            >
              Next Step
            </button>
          )}

          {step === 3 && (
            <button 
              onClick={handleSimulateImport}
              disabled={isProcessing}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Start Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
