import React, { useState } from 'react';
import { Lead } from '../../../../types/schema';
import { addAuditLog } from '../../../../data/mockAuditLogs';
import { toast } from 'sonner';

export function NotesTab({ lead }: { lead: Lead }) {
  const [note, setNote] = useState('');
  const [notesList, setNotesList] = useState<{id: string, content: string, date: string, author: string}[]>([
    { id: '1', content: 'Student is very interested in the CSE program. Will discuss with parents about the fee structure.', date: new Date().toISOString(), author: 'Current User' }
  ]);

  const handleAddNote = () => {
    if (!note.trim()) return;
    
    const newNote = {
      id: `NOTE-${Date.now()}`,
      content: note,
      date: new Date().toISOString(),
      author: 'Current User'
    };
    
    setNotesList([newNote, ...notesList]);
    setNote('');
    toast.success('Note added');
    
    addAuditLog({
      action: 'Created',
      entityType: 'Note',
      entityId: newNote.id,
      title: 'Note Added',
      description: newNote.content,
      userName: 'Current User',
      leadId: lead.id
    });
  };

  return (
    <div className="p-6 animate-in fade-in duration-300 h-full flex flex-col">
      <h3 className="text-lg font-bold mb-6">Notes</h3>
      
      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
        <textarea 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type a new note here..."
          className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-none"
        />
        <div className="flex justify-end mt-3">
          <button 
            onClick={handleAddNote}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            Add Note
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {notesList.map(n => (
          <div key={n.id} className="bg-muted/30 border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">{n.author}</span>
              <span className="text-xs text-muted-foreground">{new Date(n.date).toLocaleString()}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
