
import React from 'react';
import { AppStatus } from '../types.ts';
import { formatDuration } from '../utils/audio.ts';

interface HeroProps {
  status: AppStatus;
  recordDuration: number;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadClick: () => void;
  isProcessingLiveChunk: boolean;
  liveTranscript: string;
  languages: { label: string, value: string }[];
  progressMessage?: string;
}

const AnimatedWaveform: React.FC<{ isProcessing: boolean }> = ({ isProcessing }) => (
  <div className="flex items-center justify-center space-x-1.5 h-16 mb-10 overflow-hidden" aria-hidden="true">
    {[...Array(24)].map((_, i) => (
      <div 
        key={i} 
        className={`w-1.5 rounded-full transition-all duration-500 waveform-bar ${isProcessing ? 'bg-indigo-300 dark:bg-indigo-400' : 'bg-indigo-600/80 dark:bg-indigo-500/80'}`}
        style={{ 
          animationDelay: `${i * 0.05}s`,
          animationDuration: isProcessing ? '0.35s' : '0.7s',
          opacity: 0.3 + (Math.sin(i / 2) + 1) / 2
        }}
      ></div>
    ))}
  </div>
);

const Hero: React.FC<HeroProps> = ({ 
  status, 
  recordDuration, 
  selectedLanguage, 
  onLanguageChange, 
  onStartRecording, 
  onStopRecording, 
  onUploadClick,
  isProcessingLiveChunk,
  liveTranscript,
  languages,
  progressMessage
}) => {
  return (
    <section className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 md:p-20 mb-20 text-center border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-slate-950/40 overflow-hidden transition-colors" aria-labelledby="hero-title">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-[100px] -mr-40 -mt-40" aria-hidden="true"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-[100px] -ml-40 -mb-40" aria-hidden="true"></div>
      
      {/* Transcribing Progress Overlay */}
      {status === AppStatus.TRANSCRIBING && (
        <div className="absolute inset-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500" role="status" aria-busy="true">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Analyzing your audio...</h3>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-widest uppercase animate-pulse">{progressMessage || "Almost ready..."}</p>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-10">
          <span className="inline-flex items-center space-x-2.5 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-2 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-10 border border-indigo-100/50 dark:border-indigo-800/30 transition-colors">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 dark:bg-indigo-400"></span>
            </span>
            <span>Powered by Gemini AI</span>
          </span>
          <h1 id="hero-title" className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.05] transition-colors">
            {status === AppStatus.RECORDING ? "Capturing Live Speech..." : "Convert Audio to Text Instantly."}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-2xl font-medium mb-12 max-w-3xl mx-auto leading-relaxed transition-colors">
            {status === AppStatus.RECORDING 
              ? "We're currently understanding your voice. Keep speaking—the transcript will appear below."
              : "Professional-grade accuracy meets high-speed transcription. Secure, private, and fast—right in your browser."}
          </p>
          
          {status === AppStatus.RECORDING && <AnimatedWaveform isProcessing={isProcessingLiveChunk} />}

          {/* Improved Language Selector Pill */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-700/60 px-6 py-3.5 rounded-3xl shadow-sm mb-16 gap-4">
            <label htmlFor="language-select-hero" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Transcription Language</label>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
            <select 
              id="language-select-hero"
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent border-none text-[12px] font-bold text-indigo-700 dark:text-indigo-400 focus:ring-0 cursor-pointer p-0 appearance-none min-w-[140px] outline-none"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{lang.label}</option>
              ))}
            </select>
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32">
          <div className="flex flex-col items-center">
            <div className="relative mb-8">
              {status === AppStatus.RECORDING && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-4xl font-mono font-black text-red-500 tracking-tighter animate-pulse" aria-live="polite">
                  {formatDuration(recordDuration)}
                </div>
              )}
              <button
                onClick={status === AppStatus.RECORDING ? onStopRecording : onStartRecording}
                aria-label={status === AppStatus.RECORDING ? "Stop recording" : "Start recording"}
                className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl active:shadow-md active:scale-95 ${status === AppStatus.RECORDING ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-200 dark:shadow-red-900/40' : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:scale-105 group shadow-indigo-200 dark:shadow-indigo-900/40'}`}
              >
                {status === AppStatus.RECORDING && <div className="absolute inset-0 rounded-full bg-red-500 pulse-animation scale-[1.7]"></div>}
                {status === AppStatus.RECORDING ? (
                  <svg className="h-14 w-14 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="5" width="10" height="10" rx="2" /></svg>
                ) : (
                  <svg className="h-14 w-14 text-white transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                )}
              </button>
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">{status === AppStatus.RECORDING ? "Finish Session" : "Start Voice Capture"}</p>
          </div>

          <div className="hidden md:block h-40 w-px bg-slate-100 dark:bg-slate-800" aria-hidden="true"></div>

          <div className="flex flex-col items-center">
            <button 
              onClick={onUploadClick}
              aria-label="Upload audio file for transcription"
              className="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-500 dark:hover:border-indigo-500 active:scale-95 text-indigo-600 dark:text-indigo-400 shadow-inner group"
            >
              <svg className="h-14 w-14 transition-transform group-hover:-translate-y-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <p className="mt-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Import Media File</p>
          </div>
        </div>

        {status === AppStatus.RECORDING && (
          <div className="mt-16 p-10 bg-slate-50/60 dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-100/50 dark:border-slate-700/30 text-left animate-in fade-in slide-in-from-bottom-10 duration-700 relative overflow-hidden backdrop-blur-sm shadow-inner transition-colors" role="log" aria-live="polite">
            <div className="flex items-center space-x-4 mb-6">
              <span className="flex space-x-2" aria-hidden="true">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </span>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">AI Real-time Feed</span>
            </div>
            <div className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl leading-[1.6] italic font-medium min-h-[5rem] transition-colors">
              {liveTranscript || "Go ahead, I'm listening..."}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
