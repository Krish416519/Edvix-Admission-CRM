import { useState } from 'react';
import { useUniversityContacts } from '../../hooks/useUniversityContacts';
import { Users, Plus, Search, Building2, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react';

import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { toast } from 'sonner';
import { useConfirm } from '../ConfirmDialog';

export function UniversityContactDirectory() {
  const { contacts, isLoading, deleteContact } = useUniversityContacts();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [_isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           c.universityName?.toLowerCase().includes(term) ||
           c.department?.toLowerCase().includes(term) ||
           c.email?.toLowerCase().includes(term);
  });

  const handleDelete = async (id: string, name: string) => {
    if (await confirm({
      title: 'Delete Contact',
      message: `Are you sure you want to delete contact ${name}?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    })) {
      try {
        await deleteContact(id);
        toast.success('Contact deleted');
      } catch (err) {
        toast.error('Failed to delete contact');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">University Contacts</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage admission officers and support contacts</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            />
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="p-5 bg-card border border-border rounded-xl space-y-4">
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12">
          <EmptyState
            icon={Users}
            title="No contacts found"
            description={searchTerm ? "Try a different search term" : "Add your first university contact to get started"}
            action={
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Add Contact
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all group relative">
              
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button 
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(contact.id, contact.name)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight pr-12">{contact.name}</h3>
                  <p className="text-sm text-primary font-medium mt-0.5">{contact.role || 'Contact'}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 
                    <span className="truncate max-w-[180px]" title={contact.universityName}>{contact.universityName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border">
                {contact.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${contact.email}`} className="text-foreground hover:text-primary transition-colors truncate">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${contact.phone}`} className="text-foreground hover:text-primary transition-colors">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {(contact.department || contact.region) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {[contact.department, contact.region].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}
              </div>
              
              {contact.internalNotes && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <p className="text-xs text-amber-800 dark:text-amber-300 line-clamp-2" title={contact.internalNotes}>
                    <span className="font-semibold block mb-0.5">Internal Note:</span>
                    {contact.internalNotes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
