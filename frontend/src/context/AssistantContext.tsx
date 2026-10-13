import React, { createContext, useContext, useState } from 'react';

interface AssistantContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openWithQuery: (query: string) => void;
  initialQuery: string;
  clearInitialQuery: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');

  const openWithQuery = (query: string) => {
    setInitialQuery(query);
    setIsOpen(true);
  };

  const clearInitialQuery = () => {
    setInitialQuery('');
  };

  return (
    <AssistantContext.Provider value={{ isOpen, setIsOpen, openWithQuery, initialQuery, clearInitialQuery }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
