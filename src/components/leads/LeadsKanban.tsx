import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { Lead, LeadStatus } from '../../types/lead';
import { cn } from '../../lib/utils';
import { Phone, Mail, MapPin, Star, MoreHorizontal } from 'lucide-react';

const STAGES: LeadStatus[] = [
  'New', 'Attempted', 'Connected', 'Interested', 'Qualified', 
  'Application Started', 'Documents Pending', 'Admission Done', 'Lost'
];

interface LeadsKanbanProps {
  searchTerm: string;
  leads: Lead[];
  updateLead: (id: string, updates: Partial<Lead>) => Promise<any>;
}

export function LeadsKanban({ searchTerm, leads, updateLead }: LeadsKanbanProps) {
  const navigate = useNavigate();

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    return matchesSearch;
  });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as LeadStatus;
    
    // In a real app, this is where you'd API call to update status & add activity log
    await updateLead(draggableId, { status: newStatus });
    console.log(`Moved lead ${draggableId} to ${newStatus}`);
  };

  const getTemperature = (score: number) => {
    if (score >= 91) return { label: 'Ready to Convert', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' };
    if (score >= 61) return { label: 'Hot', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' };
    if (score >= 31) return { label: 'Warm', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
    return { label: 'Cold', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' };
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'New': return 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800';
      case 'Attempted': return 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800';
      case 'Connected': return 'border-cyan-200 bg-cyan-50/50 dark:bg-cyan-900/10 dark:border-cyan-800';
      case 'Interested': return 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-800';
      case 'Qualified': return 'border-purple-200 bg-purple-50/50 dark:bg-purple-900/10 dark:border-purple-800';
      case 'Application Started': return 'border-pink-200 bg-pink-50/50 dark:bg-pink-900/10 dark:border-pink-800';
      case 'Documents Pending': return 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800';
      case 'Admission Done': return 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800';
      case 'Lost': return 'border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800';
      default: return 'border-border bg-muted/20';
    }
  };

  return (
    <div className="flex-1 overflow-x-auto pb-4 hide-scrollbar">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full items-start">
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.status === stage);
            
            return (
              <div key={stage} className="flex-shrink-0 w-80 h-full flex flex-col">
                <div className={cn("px-4 py-3 rounded-t-xl border-t border-x font-semibold flex items-center justify-between", getStatusColor(stage))}>
                  <span className="text-sm">{stage}</span>
                  <span className="px-2 py-0.5 rounded-full bg-background border text-xs">{stageLeads.length}</span>
                </div>
                
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 p-3 rounded-b-xl border-b border-x transition-colors min-h-[150px] overflow-y-auto",
                        snapshot.isDraggingOver ? "bg-muted/50" : getStatusColor(stage)
                      )}
                    >
                      {stageLeads.map((lead, index) => (
                        // @ts-ignore
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              className={cn(
                                "mb-3 p-4 bg-card border rounded-xl shadow-sm hover:border-primary/40 transition-colors group select-none",
                                snapshot.isDragging ? "shadow-lg border-primary rotate-2 z-50" : "border-border"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{lead.name}</h4>
                                  <p className="text-xs text-muted-foreground">{lead.id}</p>
                                </div>
                                <button 
                                  className="p-1 rounded text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="space-y-1.5 mb-3">
                                <p className="text-xs font-medium text-foreground">{lead.course}</p>
                                <p className="text-xs text-muted-foreground truncate">{lead.university}</p>
                              </div>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span className="truncate max-w-[90px]">{lead.phone}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <span className="text-xs font-semibold">{lead.score}</span>
                                  </div>
                                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold border", getTemperature(lead.score).color)}>
                                    {getTemperature(lead.score).label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
