
import React, { useState } from 'react';
import { faqsData } from '../content/faqs.ts';

const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6 bg-white dark:bg-slate-950 scroll-mt-24 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Got Questions?</h2>
          <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Frequently Asked Questions</h3>
        </div>
        
        <div className="space-y-4">
          {faqsData.map((faq, idx) => (
            <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-6 text-left flex justify-between items-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors outline-none"
              >
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{faq.question}</span>
                <svg 
                  className={`h-5 w-5 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 ${openIdx === idx ? 'rotate-180' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIdx === idx && (
                <div className="p-6 pt-0 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium leading-relaxed animate-in slide-in-from-top-2 duration-300">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
