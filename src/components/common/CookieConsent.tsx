import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';


const CookieConsent = () => {
  const [show, setShow] = useState(false);

  
  useEffect(() => {
    try {
      // Check if consent was already given
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) {
        // Wait a bit before showing the banner to prevent immediate popup on first visit
        const timer = setTimeout(() => {
          setShow(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Error reading cookie consent handled silently
    }
    // Return undefined for the case where no cleanup is needed
    return undefined;
  }, []);

  const acceptAll = () => {
    try {
      localStorage.setItem('cookie-consent', 'all');
      setShow(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Error saving cookie consent handled silently
      // Still hide the banner even if we can't save the preference
      setShow(false);
    }
  };

  const acceptEssential = () => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      setShow(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Error saving cookie consent handled silently
      // Still hide the banner even if we can't save the preference
      setShow(false);
    }
  };
  
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-green-400 p-4 z-50">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-300">
            <p>
              We use cookies to enhance your experience.{' '}
              <Link to="/privacy-policy" className="text-blue-400 hover:text-blue-300">
                Privacy Policy
              </Link>.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={acceptEssential}
              className="px-4 py-2 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Essential Only
            </button>
            <button 
              onClick={acceptAll}
              className="px-4 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
