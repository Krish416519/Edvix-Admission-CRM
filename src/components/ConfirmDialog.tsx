import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

interface ConfirmDialogState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleConfirm = () => {
    dialog?.resolve?.(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve?.(false);
    setDialog(null);
  };

  const variantColors = {
    danger: 'bg-destructive text-destructive-foreground',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-primary text-primary-foreground',
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                dialog.variant === 'danger' ? 'bg-destructive/10' :
                dialog.variant === 'warning' ? 'bg-yellow-500/10' :
                'bg-primary/10'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  dialog.variant === 'danger' ? 'text-destructive' :
                  dialog.variant === 'warning' ? 'text-yellow-500' :
                  'text-primary'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{dialog.title}</h3>
                <p className="text-sm text-muted-foreground">{dialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                  dialog.variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' :
                  dialog.variant === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-primary hover:bg-primary/90'
                }`}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
