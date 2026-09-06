import { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Activity, Layers, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchDomains, createDomain, updateDomain, Domain } from '../../../lib/rbacApi';
import { useConfirm } from '../../ConfirmDialog';

export function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainSlug, setNewDomainSlug] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');
  const { confirm } = useConfirm();

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const data = await fetchDomains();
      setDomains(data);
    } catch (err) {
      toast.error('Failed to load domains');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newDomainName || !newDomainSlug) {
      toast.error('Name and Slug are required');
      return;
    }
    try {
      await createDomain({ name: newDomainName, slug: newDomainSlug, description: newDomainDesc });
      toast.success('Domain created successfully');
      setIsCreating(false);
      setNewDomainName('');
      setNewDomainSlug('');
      setNewDomainDesc('');
      loadDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create domain');
    }
  };

  const handleToggleActive = async (domain: Domain) => {
    const action = domain.is_active ? 'Archive' : 'Reactivate';
    
    const confirmed = await confirm({
      title: `${action} Domain`,
      message: `Are you sure you want to ${action.toLowerCase()} the ${domain.name} domain?`,
      confirmLabel: action,
      variant: domain.is_active ? 'danger' : 'info'
    });

    if (confirmed) {
      try {
        await updateDomain(domain.id, { is_active: !domain.is_active });
        toast.success(`Domain ${domain.is_active ? 'archived' : 'reactivated'} successfully`);
        loadDomains();
      } catch (err: any) {
        toast.error(err.message || `Failed to ${action.toLowerCase()} domain`);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Business Domains</h3>
          <p className="text-sm text-muted-foreground">Manage high-level business domains (e.g., Admission, Marketing, Finance)</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      {isCreating && (
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm mb-6 space-y-4">
          <h4 className="font-medium">Create New Domain</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Domain Name</label>
              <input
                type="text"
                className="w-full rounded-lg border-border bg-background"
                value={newDomainName}
                onChange={(e) => {
                  setNewDomainName(e.target.value);
                  setNewDomainSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                }}
                placeholder="e.g. Operations"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                type="text"
                className="w-full rounded-lg border-border bg-background"
                value={newDomainSlug}
                onChange={(e) => setNewDomainSlug(e.target.value)}
                placeholder="e.g. operations"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                className="w-full rounded-lg border-border bg-background"
                value={newDomainDesc}
                onChange={(e) => setNewDomainDesc(e.target.value)}
                placeholder="Brief description of the domain"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover">Save Domain</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {domains.map((domain) => (
          <div key={domain.id} className={`p-5 rounded-xl border flex flex-col justify-between ${domain.is_active ? 'bg-card border-border shadow-sm' : 'bg-muted/30 border-dashed border-border opacity-70'}`}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${domain.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-lg">{domain.name}</h4>
                </div>
                {!domain.is_active && <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">Archived</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{domain.description || 'No description provided'}</p>
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1 text-xs text-muted-foreground">
                <span>Slug: <code className="bg-muted px-1 py-0.5 rounded text-foreground">{domain.slug}</code></span>
                <span>Created: {new Date(domain.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 justify-end">
              <button 
                onClick={() => handleToggleActive(domain)}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${domain.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                title={domain.is_active ? 'Archive Domain' : 'Reactivate Domain'}
              >
                {domain.is_active ? <Archive className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
