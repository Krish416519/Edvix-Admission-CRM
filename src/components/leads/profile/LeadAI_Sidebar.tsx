import React from 'react';
import { Lead } from '../../../types/schema';
import { Sparkles, MessageSquare, ShieldAlert, Phone, Mail, FileText } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { NextBestAction } from './NextBestAction';

export function LeadAI_Sidebar({ lead }: { lead: Lead }) {
  const { openAssistant } = useAI();

  const prompts = [
    { title: "Generate Lead Summary", icon: <FileText className="w-4 h-4" />, text: "Please summarize this lead, including their current status, pending tasks, and recent activity." },
    { title: "Write Follow-up Email", icon: <Mail className="w-4 h-4" />, text: "Write a professional follow-up email for this lead regarding their admission." },
    { title: "Create Call Script", icon: <Phone className="w-4 h-4" />, text: "Provide a quick call script I can use to call this lead right now, focusing on objections they might have." },
    { title: "Objection Handling", icon: <ShieldAlert className="w-4 h-4" />, text: "What are some common objections this student might have about fees or placement, and how should I handle them?" },
    { title: "Suggest Next Action", icon: <Sparkles className="w-4 h-4" />, text: "Based on their activity and status, what is the best next action I should take for this lead?" },
  ];

  return (
    <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4 h-full xl:sticky xl:top-20 xl:overflow-y-auto pb-6">
      
      {/* Next Best Action Panel — powered by rules engine */}
      <NextBestAction lead={lead} />

      {/* Objection Intelligence */}
      {(lead.aiObjectionDetected || lead.aiObjectionDetected) && (
        <div className="bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card border border-amber-200 dark:border-amber-500/20 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-amber-100 dark:border-amber-500/20 flex items-center justify-between bg-white/50 dark:bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Objection Intelligence</h3>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              {lead.aiObjectionDetected || lead.aiObjectionDetected} Objection Detected
            </p>
            <p className="text-sm text-foreground">
              Consider discussing flexible payment options, EMI plans, and potential scholarships to alleviate concerns.
            </p>
            <button 
              onClick={() => openAssistant(`Draft a response addressing a ${lead.aiObjectionDetected} objection for this lead.`)}
              className="mt-2 w-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 py-2 rounded-lg hover:bg-amber-200 transition-colors"
            >
              Draft Rebuttal
            </button>
          </div>
        </div>
      )}

      {/* AI Toolkit Panel */}
      <div className="bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between bg-white/50 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">AI Counselor</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Powered by Gemini</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-2">Use the AI Assistant to generate insights, follow-up messages, and action plans based on live CRM data.</p>
          
          {prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => openAssistant(prompt.text)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-muted/30 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors group"
            >
              <div className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                {prompt.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{prompt.title}</span>
            </button>
          ))}
          
          <button
            onClick={() => openAssistant()}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Open AI Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
