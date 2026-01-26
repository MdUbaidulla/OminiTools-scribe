import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppStatus, TranscriptEntry } from './types.ts';
import { blobToBase64 } from './utils/audio.ts';
import { transcribeAudio } from './services/gemini.ts';
import { saveAudio, deleteAudio } from './utils/db.ts';
import { updateMetaTags, injectJsonLd, injectFAQSchema, injectHowToSchema } from './utils/seo.ts';
import { faqsData } from './content/faqs.ts';

import TranscriptCard from './components/TranscriptCard.tsx';
import TranscriptListItem from './components/TranscriptListItem.tsx';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import Features from './components/Features.tsx';
import HowItWorks from './components/HowItWorks.tsx';
import FAQ from './components/FAQ.tsx';
import Footer from './components/Footer.tsx';

const PROGRESS_MESSAGES = [
  "Initializing AI modules...",
  "Processing audio frequency data...",
  "Mapping speaker vocal patterns...",
  "Running deep neural transcription...",
  "Polishing transcript clarity...",
  "Formatting dialogue structure...",
  "Performing final accuracy check...",
  "Syncing to your secure local vault..."
];

const LANGUAGES = [
  { label: 'Auto-detect Language', value: 'auto' },
  { label: 'English', value: 'English' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
  { label: 'German', value: 'German' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Korean', value: 'Korean' },
  { label: 'Portuguese', value: 'Portuguese' },
  { label: 'Italian', value: 'Italian' },
  { label: 'Dutch', value: 'Dutch' },
  { label: 'Russian', value: 'Russian' },
];

const HOW_TO_STEPS = [
  { title: "Select Source", description: "Upload an existing file or use your microphone for real-time capture." },
  { title: "Configure Engine", description: "Choose your target language or let Gemini auto-detect the spoken dialect." },
  { title: "Generate Transcript", description: "Our AI processes the audio to identify speakers and transcribe with high fidelity." },
  { title: "Review & Export", description: "Refine the text in our interactive editor and download in TXT, SRT, or PDF formats." }
];

type SortOption = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isProcessingLiveChunk, setIsProcessingLiveChunk] = useState(false);
  const [currentProgressMsgIdx, setCurrentProgressMsgIdx] = useState(0);
  const [isVoiceControlEnabled, setIsVoiceControlEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scribe_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionStarting = useRef(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scribe_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scribe_theme', 'light');
    }
  }, [isDarkMode]);

  // Production SEO & Schema Injection
  useEffect(() => {
    updateMetaTags(
      "AI Audio Transcription | Speech to Text Tool", 
      "Convert audio to text instantly with elite accuracy. Ominitools Scribe offers free, high-speed transcription with speaker identification and secure local storage."
    );

    injectJsonLd('app', {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Ominitools Scribe",
      "url": "https://ominitools.com/scribe",
      "operatingSystem": "Web Browser",
      "applicationCategory": "ProductivityApplication",
      "offers": { 
        "@type": "Offer", 
        "price": "0", 
        "priceCurrency": "USD" 
      },
      "featureList": [
        "Real-time voice transcription",
        "Speaker diarization",
        "Multi-language support",
        "Local IndexedDB storage",
        "interactive word-level sync"
      ],
      "description": "Convert audio to text with elite accuracy. Professional AI transcription with speaker identification and secure local storage."
    });

    injectHowToSchema(HOW_TO_STEPS);
    injectFAQSchema(faqsData);

    try {
      const saved = localStorage.getItem('gemini_transcripts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTranscripts(parsed);
          if (parsed.length > 0) setSelectedId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Persistence Error:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('gemini_transcripts', JSON.stringify(transcripts));
    } catch (e) {
      console.error("Failed to save transcripts", e);
    }
  }, [transcripts]);

  useEffect(() => {
    if (status === AppStatus.TRANSCRIBING) {
      setCurrentProgressMsgIdx(0);
      progressTimerRef.current = setInterval(() => {
        setCurrentProgressMsgIdx(prev => (prev + 1) % PROGRESS_MESSAGES.length);
      }, 2500);
    } else if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [status]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isVoiceControlEnabled) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        if (/(start|record)/i.test(transcript) && status === AppStatus.IDLE) startRecording();
        else if (/(stop|finish)/i.test(transcript) && status === AppStatus.RECORDING) stopRecording();
        else if (/(upload|open)/i.test(transcript)) fileInputRef.current?.click();
      };

      recognition.onstart = () => { isRecognitionStarting.current = false; };
      recognition.onend = () => {
        if (isVoiceControlEnabled && !isRecognitionStarting.current) {
          isRecognitionStarting.current = true;
          try { recognition.start(); } catch(e) { isRecognitionStarting.current = false; }
        }
      };

      try {
        isRecognitionStarting.current = true;
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        isRecognitionStarting.current = false;
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isVoiceControlEnabled, status]);

  const startRecording = async () => {
    try {
      setError(null);
      setLiveTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          processLiveChunk([...audioChunksRef.current], mediaRecorder.mimeType);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await handleTranscribe(audioBlob, mediaRecorder.mimeType, recordDuration);
        stream.getTracks().forEach(track => track.stop());
        setLiveTranscript('');
      };

      mediaRecorder.start(5000);
      setStatus(AppStatus.RECORDING);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration(prev => prev + 1), 1000);
    } catch (err) {
      setError("Microphone access denied or not supported.");
      setStatus(AppStatus.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const processLiveChunk = useCallback(async (chunks: Blob[], mime: string) => {
    if (isProcessingLiveChunk || chunks.length === 0) return;
    setIsProcessingLiveChunk(true);
    try {
      const fullBlob = new Blob(chunks, { type: mime });
      const base64 = await blobToBase64(fullBlob);
      const text = await transcribeAudio(base64, mime, selectedLanguage);
      setLiveTranscript(text);
    } catch (e) {
      console.error("Live processing error:", e);
    } finally {
      setIsProcessingLiveChunk(false);
    }
  }, [isProcessingLiveChunk, selectedLanguage]);

  const handleTranscribe = async (blob: Blob, mimeType: string, duration: number) => {
    setStatus(AppStatus.TRANSCRIBING);
    try {
      const base64Audio = await blobToBase64(blob);
      const text = await transcribeAudio(base64Audio, mimeType, selectedLanguage);
      const id = generateId();
      await saveAudio(id, blob);
      setTranscripts(prev => [{ id, text, timestamp: Date.now(), duration }, ...prev]);
      setSelectedId(id);
      setStatus(AppStatus.IDLE);
      setTimeout(() => {
        const element = document.getElementById('library');
        if (element) {
          const offset = element.getBoundingClientRect().top + window.pageYOffset - 88;
          window.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || "Transcription failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDeleteTranscript = useCallback(async (id: string) => {
    try {
      await deleteAudio(id);
      setTranscripts(prev => {
        const filtered = prev.filter(t => t.id !== id);
        if (selectedId === id) setSelectedId(filtered.length > 0 ? filtered[0].id : null);
        return filtered;
      });
    } catch (err) {
      setError("Failed to delete audio file.");
    }
  }, [selectedId]);

  const filteredTranscripts = useMemo(() => {
    if (!searchTerm.trim()) return transcripts;
    const low = searchTerm.toLowerCase();
    return transcripts.filter(t => t.text.toLowerCase().includes(low) || t.id.toLowerCase().includes(low));
  }, [transcripts, searchTerm]);

  const sortedTranscripts = useMemo(() => {
    return [...filteredTranscripts].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return b.timestamp - a.timestamp;
        case 'date-asc': return a.timestamp - b.timestamp;
        case 'duration-desc': return b.duration - a.duration;
        case 'duration-asc': return a.duration - b.duration;
        default: return 0;
      }
    });
  }, [filteredTranscripts, sortBy]);

  const activeTranscript = useMemo(() => transcripts.find(t => t.id === selectedId) || null, [transcripts, selectedId]);

  const exportAll = (format: 'txt' | 'json') => {
    if (transcripts.length === 0) return;
    let content = format === 'txt' 
      ? transcripts.map(t => `${new Date(t.timestamp).toLocaleString()}\n${t.text}\n\n`).join('---') 
      : JSON.stringify(transcripts, null, 2);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `scribe_export.${format}`; link.click(); URL.revokeObjectURL(url);
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return (
    <div className="min-h-screen bg-[#fcfdfe] dark:bg-slate-950 transition-colors duration-300 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900/40 dark:selection:text-indigo-200">
      <Header 
        isVoiceControlEnabled={isVoiceControlEnabled} 
        onToggleVoice={() => setIsVoiceControlEnabled(!isVoiceControlEnabled)} 
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
      />
      <main className="max-w-6xl mx-auto px-6 py-12" role="main">
        {error && (
          <div className="mb-10 p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-[2rem] flex items-center justify-between text-red-600 dark:text-red-400 shadow-sm" role="alert" aria-live="assertive">
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm font-bold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors" aria-label="Dismiss error message"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}
        
        <Hero 
          status={status} 
          recordDuration={recordDuration} 
          selectedLanguage={selectedLanguage} 
          onLanguageChange={setSelectedLanguage} 
          onStartRecording={startRecording} 
          onStopRecording={stopRecording} 
          onUploadClick={() => fileInputRef.current?.click()} 
          isProcessingLiveChunk={isProcessingLiveChunk} 
          liveTranscript={liveTranscript} 
          languages={LANGUAGES} 
          progressMessage={PROGRESS_MESSAGES[currentProgressMsgIdx]} 
        />

        <input type="file" ref={fileInputRef} className="hidden" aria-hidden="true" accept="audio/*" tabIndex={-1} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => handleTranscribe(file, file.type, Math.round(audio.duration));
            audio.onerror = () => setError("Failed to load audio file.");
          }
        }} />
        
        <HowItWorks />
        
        <section id="library" className="mt-24 pt-12 scroll-mt-24" aria-labelledby="workspace-title">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-8 mb-12 gap-6">
            <div>
              <h3 id="workspace-title" className="text-3xl font-black text-slate-900 dark:text-white mb-2">Workspace Dashboard</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Securely managed transcription archives.</p>
            </div>
            {transcripts.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col space-y-1">
                  <label htmlFor="sort-select" className="sr-only">Sort transcripts</label>
                  <select 
                    id="sort-select"
                    aria-label="Sort transcripts"
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as SortOption)} 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="duration-desc">Longest Duration</option>
                    <option value="duration-asc">Shortest Duration</option>
                  </select>
                </div>
                <button onClick={() => exportAll('txt')} className="px-4 py-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-all focus:ring-2 focus:ring-indigo-500">Export All (TXT)</button>
              </div>
            )}
          </div>
          
          {transcripts.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                <svg className="h-12 w-12 text-indigo-200 dark:text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Your library is currently empty.</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">Upload an audio file or start recording to see your transcripts here.</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row h-[700px] bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              <nav className="w-full md:w-[320px] lg:w-[380px] border-r border-slate-100 dark:border-slate-800 flex flex-col" aria-label="Transcription Archive Navigation">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 flex flex-col space-y-3">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Saved Sessions ({sortedTranscripts.length})</span>
                  <div className="relative">
                    <label htmlFor="archive-search" className="sr-only">Search archives</label>
                    <input 
                      id="archive-search"
                      type="text" 
                      placeholder="Search archives..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-9 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar" role="listbox" aria-label="Select transcript to view">
                  {sortedTranscripts.length > 0 ? sortedTranscripts.map(entry => (
                    <TranscriptListItem key={entry.id} entry={entry} isActive={selectedId === entry.id} onClick={() => setSelectedId(entry.id)} />
                  )) : <div className="p-12 text-center text-xs font-bold text-slate-400">No results found for your search.</div>}
                </div>
              </nav>
              <div className="flex-grow overflow-hidden flex flex-col bg-slate-50/30 dark:bg-slate-950/20" role="region" aria-label="Transcript Viewer">
                {activeTranscript ? (
                  <TranscriptCard 
                    key={activeTranscript.id} 
                    entry={activeTranscript} 
                    onDelete={handleDeleteTranscript} 
                    onUpdateText={(id, text) => setTranscripts(prev => prev.map(t => t.id === id ? {...t, text} : t))} 
                    isLatest={selectedId === sortedTranscripts[0]?.id} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                    <p className="font-bold text-lg">Select an item from the library to view or edit.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        
        <Features />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default App;