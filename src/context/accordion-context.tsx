
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AccordionContextType {
  openItems: string[];
  setOpenItems: (items: string[]) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

export const AccordionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openItems, setOpenItems] = useState<string[]>([]);

  return (
    <AccordionContext.Provider value={{ openItems, setOpenItems }}>
      {children}
    </AccordionContext.Provider>
  );
};

export const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (context === undefined) {
    throw new Error('useAccordion must be used within an AccordionProvider');
  }
  return context;
};
