import React from 'react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { useTranslation } from '../../utils/i18n';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <select 
          value={language}
          onChange={handleLanguageChange}
          className="appearance-none bg-transparent text-xs pl-2 pr-6 py-1 border-0 focus:outline-none hover:text-pink-400 transition-colors cursor-pointer"
        >
          <option value="en" className="bg-gray-900">{t('languages.en')}</option>
          <option value="de" className="bg-gray-900">{t('languages.de')}</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
