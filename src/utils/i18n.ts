import { useLanguage } from '../contexts/LanguageContext';
import en from '../translations/en';
import de from '../translations/de';

// Type for the translations
export type TranslationKey = keyof typeof en;

// All translations
const translations = {
  en,
  de
};

// Helper function to get a nested value by path
export function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return the path if translation is missing
    }
  }
  
  return result as string;
}

// Custom hook for translations
export function useTranslation() {
  const { language } = useLanguage();
  
  const translate = (key: string, params: Record<string, any> = {}): string => {
    const currentTranslations = translations[language] || translations.en;
    let text = getNestedValue(currentTranslations, key);
    
    // Replace template variables
    if (typeof text === 'string') {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`\${${param}}`, String(value));
      });
    }
    
    return text;
  };
  
  return { t: translate, language };
}
