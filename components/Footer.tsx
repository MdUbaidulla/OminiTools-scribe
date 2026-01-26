
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      const headerOffset = 88;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <footer className="py-12 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo & Brand Link to Ominitools.com */}
          <a 
            href="https://ominitools.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 group hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 group-hover:shadow-indigo-200 transition-all">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Ominitools Scribe</span>
          </a>

          {/* Minimal Links */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
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
              Process
            </a>
            <a 
              href="#faq" 
              onClick={(e) => handleScroll(e, 'faq')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Help
            </a>
            <a href="https://ominitools.com/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</a>
          </nav>

          {/* Socials / Github */}
          <div className="flex items-center space-x-5 text-slate-400 dark:text-slate-500 transition-colors">
            <a href="https://github.com/ominitools" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
            </a>
            <a href="https://twitter.com/ominitools" target="_blank" rel="noopener noreferrer" className="hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col items-center justify-between gap-4 md:flex-row transition-colors">
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 transition-colors">
            &copy; {currentYear} <a href="https://ominitools.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ominitools</a>. All rights reserved.
          </p>
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 transition-colors">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest transition-colors">Built with</span>
            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest transition-colors">Gemini 3 Flash</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
