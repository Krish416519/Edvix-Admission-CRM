import React from 'react';
import { Phone, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';

interface MobileActionBarProps {
  leadId?: string;
  phone?: string;
  onMoreClick?: () => void;
}

export function MobileActionBar({ leadId, phone, onMoreClick }: MobileActionBarProps) {
  const { makeCall } = useTelephony();
  const { user } = useAuth();

  const handleCall = () => {
    if (phone && leadId && user) {
      makeCall({
        to: phone,
        leadId: leadId,
        counselorId: user.id
      });
    } else if (phone) {
      // Fallback if no user/leadId context
      window.location.href = `tel:${phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
    }
  };

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))] px-4 pt-3 flex items-center gap-3">
      <button 
        onClick={handleWhatsApp}
        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors active:scale-95"
      >
        <MessageCircle className="w-5 h-5" />
        WhatsApp
      </button>
      <button 
        onClick={handleCall}
        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
      >
        <Phone className="w-5 h-5 fill-current" />
        Call
      </button>
      <button 
        onClick={onMoreClick}
        className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors active:scale-95"
      >
        <MoreHorizontal className="w-6 h-6" />
      </button>
    </div>
  );
}
