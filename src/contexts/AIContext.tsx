import { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  isOpen: boolean;
  toggleAssistant: () => void;
  openAssistant: (prompt?: string) => void;
  closeAssistant: () => void;
  initialPrompt: string;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  const toggleAssistant = () => setIsOpen(!isOpen);
  
  const openAssistant = (prompt: string = '') => {
    setInitialPrompt(prompt);
    setIsOpen(true);
  };
  
  const closeAssistant = () => setIsOpen(false);

  return (
    <AIContext.Provider value={{ isOpen, toggleAssistant, openAssistant, closeAssistant, initialPrompt }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
