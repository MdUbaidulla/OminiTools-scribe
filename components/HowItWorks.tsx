
import React from 'react';

const steps = [
  {
    number: "01",
    title: "Upload or Record Audio",
    description: "Start by recording live audio through your browser or uploading existing files (MP3, WAV, M4A). We handle the rest.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )
  },
  {
    number: "02",
    title: "AI Processes Your Audio",
    description: "Gemini 3 Flash analyzes your audio with high precision, identifying speakers and formatting sentences automatically.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Review and Edit Transcript",
    description: "Refine your transcript in our interactive editor. Adjust speaker names, fix typos, and sync playback with text.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    number: "04",
    title: "Export in Your Preferred Format",
    description: "Download your final transcript as a clean PDF, plain text, developer-friendly JSON, or SRT for video subtitles.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    )
  }
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative scroll-mt-24 transition-colors">
      <div className="max-w-6xl mx-auto px-6 relative z-1">
        <div className="text-center mb-20">
          <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Seamless Workflow</h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">How Ominitools Scribe Works</h3>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium text-lg transition-colors">
            From raw audio to polished text in four simple steps.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-slate-100 dark:bg-slate-800 -translate-y-12 transition-colors"></div>
          
          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 relative z-10 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-sm border border-indigo-100 dark:border-indigo-800 group-hover:border-indigo-500">
                  {step.icon}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center shadow-md transition-colors">
                    {step.number}
                  </div>
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 transition-colors">{step.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium transition-colors">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
