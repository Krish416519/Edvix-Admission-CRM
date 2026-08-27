import { useState, useEffect } from 'react';
import { User, Building2, UploadCloud, ShieldCheck, AlertCircle, CheckCircle2, ChevronDown, FileText, Briefcase, MapPin, BadgeCheck } from 'lucide-react';
import { partnerService, PartnerProfile as IPartnerProfile } from '../../lib/partner/PartnerService';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function PartnerProfile() {
  const [profile, setProfile] = useState<IPartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('ID Proof');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await partnerService.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await partnerService.uploadKYCDocument(file, docType);
      await loadProfile();
      toast.success('Document uploaded successfully! It is now under review.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      toast.error(`Failed to upload document: ${message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping"></div>
          <div className="relative animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    'Verified': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'Verified Partner' },
    'Rejected': { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'Verification Failed' },
    'Under Review': { icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'Review in Progress' },
    default: { icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'Action Required' }
  };

  const status = profile?.kyc_status === 'Verified' ? statusConfig['Verified'] : 
                 profile?.kyc_status === 'Rejected' ? statusConfig['Rejected'] : 
                 profile?.kyc_status === 'Under Review' ? statusConfig['Under Review'] : 
                 statusConfig.default;

  const StatusIcon = status.icon;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-background border border-border p-8">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BadgeCheck className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile & KYC Settings</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-lg">
            Manage your agency details, track your compliance status, and unlock higher commission tiers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Profile */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border/50 rounded-2xl overflow-hidden shadow-xl shadow-black/5">
          <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Business Overview</h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" /> Company Name
                </label>
                <div className="text-lg font-medium text-foreground">{profile?.company_name || 'Not provided'}</div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Partner Type
                </label>
                <div className="text-lg font-medium text-foreground">{profile?.partner_type || 'Independent'}</div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">Partnership Tier</label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                    {profile?.tier_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-lg">{profile?.tier_name || 'Standard Tier'}</div>
                    <div className="text-sm text-amber-500/80 font-medium">{profile?.commission_multiplier}x Payout Multiplier Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KYC Status */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border/50 rounded-2xl overflow-hidden shadow-xl shadow-black/5 flex flex-col">
          <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", status.bg, status.color)}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Compliance Center</h3>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <div className={cn("flex items-start gap-4 p-5 rounded-2xl border", status.bg, status.border)}>
              <StatusIcon className={cn("w-10 h-10 shrink-0", status.color)} />
              <div>
                <h4 className={cn("text-lg font-bold", status.color)}>
                  {status.text}
                </h4>
                <p className={cn("text-sm mt-1 leading-relaxed opacity-90", status.color)}>
                  {profile?.kyc_status === 'Verified' 
                    ? "Excellent! Your account is fully verified. You have unrestricted access to receive payouts and process admissions."
                    : profile?.kyc_status === 'Under Review'
                    ? "Your submitted documents are currently under review by our compliance team. This typically takes 24-48 hours."
                    : "To activate payouts and full portal access, please upload your required business registration and identity documents."}
                </p>
              </div>
            </div>

            {profile?.kyc_status !== 'Verified' && (
              <div className="mt-8 space-y-5 flex-1">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Document Type</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-background border border-border/50 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-500/30 transition-colors cursor-pointer"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="ID Proof">Government ID Proof (Aadhar/Passport)</option>
                      <option value="Business Registration">Business Registration Certificate</option>
                      <option value="Tax ID">Tax ID Document (PAN/GST)</option>
                      <option value="Bank Details">Bank Account Details (Cancelled Cheque)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    id="kyc-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div 
                    onClick={() => document.getElementById('kyc-upload')?.click()}
                    className={cn(
                      "group relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden",
                      uploading ? "border-indigo-500 bg-indigo-500/5" : "border-border/60 hover:border-indigo-500/50 hover:bg-indigo-500/5 bg-muted/10"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-full transition-colors",
                      uploading ? "bg-indigo-500/20 text-indigo-500" : "bg-background shadow-sm text-muted-foreground group-hover:text-indigo-500 group-hover:scale-110 duration-300"
                    )}>
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    
                    <div className="text-center space-y-1 z-10">
                      <p className="text-sm font-semibold text-foreground">
                        {uploading ? 'Uploading your document...' : 'Click to select or drag and drop'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, or PNG (Max. 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

