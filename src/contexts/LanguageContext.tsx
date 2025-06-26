import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the available languages
export type Language = 'en' | 'de';

// Define the context type
type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
});

// Custom hook for using the language context
export const useLanguage = () => useContext(LanguageContext);

// Provider component
type LanguageProviderProps = {
  children: ReactNode;
};

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  // Initialize state with stored language or default to English
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLang = localStorage.getItem('language') as Language;
    return storedLang && ['en', 'de'].includes(storedLang) ? storedLang : 'en';
  });

  // Update localStorage when language changes
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
    document.documentElement.lang = newLanguage;
  };

  // Set html lang attribute on mount and when language changes
  useEffect(() => {
    const htmlElement = document.getElementById('htmlRoot');
    if (htmlElement) {
      htmlElement.setAttribute('lang', language);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
