
import React from 'react';
import { featuresData } from '../content/features.ts';

const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Core Capabilities</h2>
          <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Everything you need for perfect transcripts.</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {featuresData.map((feature) => (
            <div key={feature.id} className="group p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/10 transition-all duration-500">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 transition-colors">{feature.title}</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium transition-colors">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
