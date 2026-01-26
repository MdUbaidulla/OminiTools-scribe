
import React from 'react';

interface HeaderProps {
  isVoiceControlEnabled: boolean;
  onToggleVoice: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isVoiceControlEnabled, onToggleVoice, isDarkMode, onToggleTheme }) => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 88;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      // Update URL hash without jumping
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800" role="banner">
      <div className="max-w-6xl mx-auto py-4 px-6 flex justify-between items-center">
        <a 
          href="https://ominitools.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 group transition-opacity hover:opacity-80"
          title="Go to Ominitools Home"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-100 dark:shadow-indigo-900/20 shadow-lg group-hover:shadow-indigo-200 transition-all" aria-hidden="true">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-400">Ominitools</span> Scribe
          </div>
        </a>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600 dark:text-slate-400" aria-label="Main navigation">
          <a 
            href="#features" 
            onClick={(e) => handleScroll(e, 'features')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Features
          </a>
          <a 
            href="#how-it-works" 
            onClick={(e) => handleScroll(e, 'how-it-works')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            How it Works
          </a>
          <a 
            href="#faq" 
            onClick={(e) => handleScroll(e, 'faq')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            FAQ
          </a>
        </nav>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
          >
            {isDarkMode ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button 
            onClick={onToggleVoice}
            aria-pressed={isVoiceControlEnabled}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all border ${isVoiceControlEnabled ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
          >
            <div className="relative">
              <svg className={`h-3.5 w-3.5 ${isVoiceControlEnabled ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isVoiceControlEnabled && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-indigo-600 dark:border-indigo-400"></span>}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{isVoiceControlEnabled ? 'Voice ON' : 'Voice Ctrl'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
