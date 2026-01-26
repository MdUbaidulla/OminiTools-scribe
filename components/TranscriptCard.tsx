import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TranscriptEntry } from '../types.ts';
import { formatDuration, formatSRTTime, getPeaks } from '../utils/audio.ts';
import { getAudio } from '../utils/db.ts';

interface TranscriptCardProps {
  entry: TranscriptEntry;
  onDelete: (id: string) => void;
  onUpdateText?: (id: string, newText: string) => void;
  isLatest?: boolean;
}

type ViewMode = 'dialogue' | 'plain';

interface WordMetadata {
  text: string;
  start: number;
  end: number;
  id: string;
}

interface SentenceMetadata {
  id: string;
  text: string;
  start: number;
  end: number;
  words: WordMetadata[];
}

interface SegmentMetadata {
  type: 'dialogue' | 'music';
  speaker: string;
  sentences: SentenceMetadata[];
  musicTime?: string;
  musicDescription?: string;
  musicStart?: number;
}

const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

const TranscriptCard: React.FC<TranscriptCardProps> = ({ entry, onDelete, onUpdateText, isLatest }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dialogue');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isWaveformLoading, setIsWaveformLoading] = useState(true);
  
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [isConfirmingSpeaker, setIsConfirmingSpeaker] = useState(false);
  const [speakerSavedFeedback, setSpeakerSavedFeedback] = useState<string | null>(null);

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('scribe_auto_scroll');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) { return true; }
  });

  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [isEditingPlain, setIsEditingPlain] = useState(false);
  const [plainTextDraft, setPlainTextDraft] = useState(entry?.text || "");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const playAudio = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [isPlaying, playbackRate]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => isPlaying ? pauseAudio() : playAudio(), [isPlaying, pauseAudio, playAudio]);

  const handleSeek = (time: number, e?: React.MouseEvent | React.KeyboardEvent, forcePlay: boolean = false) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (audioRef.current && !isNaN(time)) {
      const targetTime = Math.max(0, Math.min(entry.duration || 0, time));
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime); 
      updateActiveHighlights(targetTime); 
      if (forcePlay && !isPlaying) playAudio();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.shiftKey && e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + 10);
      } else if (e.shiftKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTime - 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, currentTime]);

  const updateActiveHighlights = useCallback((time: number) => {
    let fWord: string | null = null, fSent: string | null = null;
    const adjustedTime = time + 0.05; 

    for (const seg of transcriptMetadata) {
      if (seg.type === 'music') continue;
      for (const sent of seg.sentences) {
        if (adjustedTime >= sent.start && adjustedTime <= sent.end) {
          fSent = sent.id;
          const word = sent.words.find(w => adjustedTime >= w.start && adjustedTime <= w.end);
          if (word) fWord = word.id;
          break;
        }
      }
      if (fSent) break;
    }
    
    if (fWord !== activeWordId) setActiveWordId(fWord);
    if (fSent !== activeSentenceId) setActiveSentenceId(fSent);
  }, [activeWordId, activeSentenceId]);

  const syncTime = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      updateActiveHighlights(time);
      if (isPlaying) {
        rafRef.current = requestAnimationFrame(syncTime);
      }
    }
  }, [isPlaying, updateActiveHighlights]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(syncTime);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, syncTime]);

  useEffect(() => {
    let url: string | null = null;
    const loadAudio = async () => {
      try {
        const blob = await getAudio(entry.id);
        if (blob) {
          url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setIsWaveformLoading(true);
          const peaks = await getPeaks(blob, 120);
          setWaveformPeaks(peaks);
          setIsWaveformLoading(false);
        }
      } catch (e) { 
        console.error("Audio error in TranscriptCard:", e);
        setIsWaveformLoading(false);
      }
    };
    loadAudio();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [entry.id]);

  const transcriptMetadata = useMemo(() => {
    const text = entry?.text || "";
    const duration = Math.max(0.1, entry?.duration || 1);
    const totalChars = Math.max(1, text.length);
    const segments: SegmentMetadata[] = [];
    const lines = text.split('\n');
    let globalOffset = 0;

    lines.forEach((line) => {
      if (!line.trim()) { globalOffset += line.length + 1; return; }
      
      const musicMatch = line.match(/^\[Music:\s*(.*?)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\]/i);
      if (musicMatch) {
        segments.push({
          type: 'music',
          speaker: 'Atmosphere',
          sentences: [],
          musicTime: `${musicMatch[2]} - ${musicMatch[3]}`,
          musicDescription: musicMatch[1].trim() || 'Musical Segment',
          musicStart: timeToSeconds(musicMatch[2])
        });
        globalOffset += line.length + 1;
        return;
      }

      const speakerMatch = line.match(/^([^:\n]+:)\s*(.*)/);
      let speaker = "", content = line, lineOffset = globalOffset;
      if (speakerMatch) {
        speaker = speakerMatch[1]; 
        content = speakerMatch[2] || "";
        lineOffset += speakerMatch[1].length;
        const fullMatch = line.match(/^([^:\n]+:)(\s*)(.*)/);
        if (fullMatch) lineOffset += fullMatch[2].length;
      }

      const sentenceParts = content.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [content];
      let sentenceOffset = lineOffset;

      const sentences: SentenceMetadata[] = sentenceParts.map((sText, sIdx) => {
        const sStart = (sentenceOffset / totalChars) * duration;
        const words: WordMetadata[] = [];
        let wordOffset = sentenceOffset;
        
        const wordParts = sText.split(/(\s+)/);
        wordParts.forEach((part, pIdx) => {
          if (part.trim().length > 0) {
            words.push({
              text: part,
              start: (wordOffset / totalChars) * duration,
              end: ((wordOffset + part.length) / totalChars) * duration,
              id: `w-${wordOffset}-${pIdx}`
            });
          }
          wordOffset += part.length;
        });
        
        const sEnd = (wordOffset / totalChars) * duration;
        sentenceOffset = wordOffset;
        return { id: `s-${sStart}-${sIdx}`, text: sText, start: sStart, end: sEnd, words };
      });

      segments.push({ type: 'dialogue', speaker, sentences });
      globalOffset += line.length + 1;
    });
    return segments;
  }, [entry.text, entry.duration]);

  const handleScrollInterrupt = () => {
    userScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
    }, 3000); 
  };

  useEffect(() => {
    if (isAutoScrollEnabled && isPlaying && activeWordId && !isEditingPlain && !userScrollingRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeEl = container.querySelector(`[data-word-id="${activeWordId}"]`) as HTMLElement;
      if (activeEl) {
        const rect = activeEl.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const threshold = cRect.height * 0.35; 
        if (rect.top < cRect.top + threshold || rect.bottom > cRect.bottom - threshold) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeWordId, isPlaying, isEditingPlain, isAutoScrollEnabled]);

  const handleWordClick = (time: number, e: React.MouseEvent | React.KeyboardEvent) => {
    if (window.getSelection()?.toString().trim()) return; 
    handleSeek(time, e, true); // Word clicks force playback
  };

  const startEditingSpeaker = (s: string) => {
    setEditingSpeaker(s);
    setNewSpeakerName(s.replace(':', '').trim());
    setIsConfirmingSpeaker(false);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const cancelEditingSpeaker = () => {
    setEditingSpeaker(null);
    setIsConfirmingSpeaker(false);
  };

  const handleUpdateSpeaker = () => {
    if (!editingSpeaker || !onUpdateText) return;
    if (!isConfirmingSpeaker) {
      setIsConfirmingSpeaker(true);
      return;
    }
    const oldName = editingSpeaker;
    const newName = newSpeakerName.trim() + ":";
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escape(oldName)}`, 'gm');
    const updatedText = entry.text.replace(regex, newName);
    onUpdateText(entry.id, updatedText);
    setEditingSpeaker(null);
    setIsConfirmingSpeaker(false);
    setSpeakerSavedFeedback(newSpeakerName.trim());
    setTimeout(() => setSpeakerSavedFeedback(null), 3000);
  };

  const handleSaveDraft = async () => {
    if (onUpdateText) {
      setSaveStatus('saving');
      await new Promise(r => setTimeout(r, 400));
      onUpdateText(entry.id, plainTextDraft.trim());
      setSaveStatus('success');
      setTimeout(() => { setSaveStatus('idle'); setIsEditingPlain(false); }, 600);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = `<style>body{font-family:'Inter',sans-serif;padding:60px;line-height:1.8;color:#1e293b;}h1{font-weight:900;margin-bottom:40px;}.music{background:#f5f3ff;border:1px solid #ddd6fe;padding:12px 20px;border-radius:12px;margin:20px 0;color:#4f46e5;font-weight:700;}.speaker{font-weight:800;color:#4f46e5;text-transform:uppercase;font-size:11px;margin-top:30px;}</style>`;
    const content = `<html><head>${styles}</head><body><h1>Session Transcript #${entry.id.slice(0,4)}</h1>${transcriptMetadata.map(seg => seg.type === 'music' ? `<div class="music">♫ ${seg.musicDescription} [${seg.musicTime}]</div>` : `<div><div class="speaker">${seg.speaker.replace(':', '')}</div><p>${seg.sentences.map(s => s.text).join(' ')}</p></div>`).join('')}</body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleExportSRT = () => {
    let srt = ""; let idx = 1;
    transcriptMetadata.forEach(seg => {
      if (seg.type === 'music') return;
      seg.sentences.forEach(s => {
        srt += `${idx++}\n${formatSRTTime(s.start)} --> ${formatSRTTime(s.end)}\n${seg.speaker}${s.text.trim()}\n\n`;
      });
    });
    const blob = new Blob([srt], {type: 'text/srt'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `scribe_session_${entry.id.slice(0,4)}.srt`; a.click();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative transition-colors">
      <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col space-y-4 shadow-sm z-10">
        <div className="flex justify-between items-start">
          <div aria-live="polite">
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[9px] font-black uppercase">Session</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">#{entry.id.slice(0, 4)}</h2>
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" aria-label="Open export options">
              <svg className="h-4 w-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
            <button onClick={() => onDelete(entry.id)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-100 dark:border-slate-700" aria-label="Delete session">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        {audioUrl && (
          <div className="flex flex-col space-y-4 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-[2rem] border border-slate-100/50 dark:border-slate-800 shadow-inner transition-colors" role="region" aria-label="Audio Controls">
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-1">
                {/* Enhanced Rewind 10s */}
                <button 
                  onClick={() => handleSeek(currentTime - 10)} 
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                  aria-label="Seek back 10 seconds"
                  title="Rewind 10s (Shift+Left)"
                >
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    <text x="6" y="15" fontSize="7" fill="currentColor" fontWeight="900" style={{ fontStyle: 'normal' }}>10</text>
                  </svg>
                </button>

                <button 
                  onClick={togglePlay} 
                  className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all" 
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> : <svg className="h-7 w-7 ml-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
                </button>

                {/* Enhanced Forward 10s */}
                <button 
                  onClick={() => handleSeek(currentTime + 10)} 
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                  aria-label="Seek forward 10 seconds"
                  title="Forward 10s (Shift+Right)"
                >
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4z" />
                    <text x="14" y="15" fontSize="7" fill="currentColor" fontWeight="900" style={{ fontStyle: 'normal' }}>10</text>
                  </svg>
                </button>
              </div>

              <div className="flex-grow flex flex-col space-y-2">
                <div 
                  ref={waveformRef} 
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={entry.duration}
                  aria-valuenow={currentTime}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') handleSeek(currentTime + 5);
                    if (e.key === 'ArrowLeft') handleSeek(currentTime - 5);
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleSeek(((e.clientX - rect.left) / rect.width) * entry.duration);
                  }} 
                  className="h-12 w-full flex items-center justify-between gap-[2px] cursor-pointer group/waveform relative outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
                  aria-label="Audio seeker"
                >
                  {isWaveformLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-200 dark:bg-indigo-900 animate-progress-loading w-1/3"></div>
                      </div>
                    </div>
                  ) : (
                    waveformPeaks.map((peak, i) => {
                      const progress = i / waveformPeaks.length;
                      const isPlayed = progress <= (currentTime / (Math.max(0.1, entry.duration)));
                      return <div key={i} aria-hidden="true" style={{ height: `${peak * 100}%` }} className={`flex-1 rounded-full transition-colors duration-200 ${isPlayed ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700 group-hover/waveform:bg-slate-300 dark:group-hover/waveform:bg-slate-600'}`}></div>;
                    })
                  )}
                </div>
                <div className="flex justify-between text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-tighter" aria-hidden="true">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(entry.duration)}</span>
                </div>
              </div>

              {/* Enhanced Speed Controls */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 shadow-sm" role="group" aria-label="Playback speed">
                {[0.5, 1, 1.5, 2].map(r => (
                  <button 
                    key={r} 
                    onClick={() => { setPlaybackRate(r); if (audioRef.current) audioRef.current.playbackRate = r; }} 
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${playbackRate === r ? 'bg-indigo-600 text-white shadow-md animate-in zoom-in-95' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} 
                    aria-label={`Speed ${r}x`} 
                    aria-pressed={playbackRate === r}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-2.5 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist">
          <button 
            role="tab"
            aria-selected={viewMode === 'dialogue'}
            onClick={() => { setViewMode('dialogue'); setIsEditingPlain(false); }} 
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${viewMode === 'dialogue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            DIALOGUE VIEW
          </button>
          <button 
            role="tab"
            aria-selected={viewMode === 'plain'}
            onClick={() => setViewMode('plain')} 
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${viewMode === 'plain' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            PLAIN EDITOR
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {viewMode === 'plain' ? (
            <button onClick={() => isEditingPlain ? handleSaveDraft() : setIsEditingPlain(true)} disabled={saveStatus !== 'idle'} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all focus:ring-2 focus:ring-indigo-500 ${isEditingPlain ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : isEditingPlain ? 'Save Changes' : 'Edit Text'}
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)} aria-pressed={isAutoScrollEnabled} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isAutoScrollEnabled ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Auto-Scroll</button>
              <button onClick={() => setShowTimestamps(!showTimestamps)} aria-pressed={showTimestamps} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${showTimestamps ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Timestamps</button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} onWheel={handleScrollInterrupt} onTouchStart={handleScrollInterrupt} className="flex-grow p-4 md:p-8 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar scroll-smooth transition-colors scroll-container" role="region" aria-label="Transcript text">
        <div className="max-w-3xl mx-auto">
          {viewMode === 'dialogue' ? (
            <div className="space-y-10 pb-24">
              {transcriptMetadata.map((seg, sIdx) => (
                seg.type === 'music' ? (
                  <div key={sIdx} className="relative group bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl p-5 border border-indigo-100/50 dark:border-indigo-800/30 animate-in fade-in duration-500" role="article">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-lg" aria-hidden="true">
                          <svg className="h-4 w-4 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Atmosphere</span>
                      </div>
                      <button onClick={() => seg.musicStart !== undefined && handleSeek(seg.musicStart)} className="text-[10px] font-mono font-black text-indigo-500 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50 shadow-sm hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all focus:ring-2 focus:ring-indigo-500">
                        {seg.musicTime}
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold italic">{seg.musicDescription}</p>
                  </div>
                ) : (
                  <div key={sIdx} className="flex flex-col space-y-3" role="article">
                    {seg.speaker && (
                      <div className="flex items-center space-x-3 group/speaker">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase" aria-hidden="true">{seg.speaker.replace(':', '').charAt(0)}</div>
                        {editingSpeaker === seg.speaker ? (
                          <div className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 p-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50 animate-in zoom-in-95">
                            <input 
                              id={`rename-speaker-${sIdx}`}
                              ref={renameInputRef}
                              type="text" 
                              value={newSpeakerName} 
                              onChange={(e) => { setNewSpeakerName(e.target.value); setIsConfirmingSpeaker(false); }} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateSpeaker();
                                if (e.key === 'Escape') cancelEditingSpeaker();
                              }} 
                              className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5 outline-none w-48 shadow-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex items-center space-x-1">
                              <button onClick={handleUpdateSpeaker} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center space-x-1 focus:ring-2 focus:ring-indigo-500 ${isConfirmingSpeaker ? 'bg-amber-500 text-white shadow-lg' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700'}`} aria-label="Save speaker">
                                <span>{isConfirmingSpeaker ? 'Confirm?' : 'Save'}</span>
                              </button>
                              <button onClick={cancelEditingSpeaker} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" aria-label="Cancel">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => startEditingSpeaker(seg.speaker)} 
                              className="text-[11px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded transition-all text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:ring-2 focus:ring-indigo-500" 
                              aria-label={`Speaker: ${seg.speaker.replace(':', '')}. Edit globally.`}
                            >
                              {seg.speaker.replace(':', '')}
                            </button>
                            {speakerSavedFeedback === seg.speaker.replace(':', '').trim() && (
                              <span className="text-[9px] font-black text-green-600 dark:text-green-400 animate-in fade-in" aria-live="polite">Saved Globally</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-6">
                      {seg.sentences.map((sent) => (
                        <div key={sent.id} className={`group pl-4 border-l-2 transition-all duration-300 ${activeSentenceId === sent.id ? 'active-sentence-bg' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                          {showTimestamps && (
                            <button 
                              onClick={(e) => handleSeek(sent.start, e, true)} 
                              className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-1.5 font-black hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:ring-1 focus:ring-indigo-500 rounded px-1"
                              aria-label={`Jump to ${formatDuration(sent.start)}`}
                            >
                              {formatDuration(sent.start)}
                            </button>
                          )}
                          <div className="text-slate-700 dark:text-slate-300 leading-[1.8] text-[15px] flex flex-wrap gap-x-1 font-medium">
                            {sent.words.map((word) => (
                              <span 
                                key={word.id} 
                                role="button" 
                                tabIndex={0} 
                                onClick={(e) => handleWordClick(word.start, e)} 
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleWordClick(word.start, e)} 
                                className={`word-seekable px-1 rounded transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500 ${activeWordId === word.id ? 'active-word' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} 
                                data-word-id={word.id}
                                data-start={word.start}
                                aria-label={`Seek to: ${word.text} at ${formatDuration(word.start)}`}
                                aria-current={activeWordId === word.id ? 'time' : undefined}
                              >
                                {word.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="relative h-full pb-20">
              {isEditingPlain ? (
                <>
                  <label htmlFor="plain-text-editor" className="sr-only">Editor</label>
                  <textarea 
                    id="plain-text-editor"
                    autoFocus
                    value={plainTextDraft} 
                    onChange={(e) => setPlainTextDraft(e.target.value)} 
                    className="w-full min-h-[500px] p-6 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-900 rounded-2xl resize-none font-medium leading-[1.8] text-[15px] focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner outline-none" 
                  />
                </>
              ) : (
                <div className="text-slate-700 dark:text-slate-300 leading-[2] text-[16px] flex flex-wrap gap-x-1.5 font-medium" role="document">
                  {transcriptMetadata.flatMap(seg => seg.type === 'music' ? [] : seg.sentences).flatMap(sent => sent.words).map((word) => (
                    <span 
                      key={word.id} 
                      role="button" 
                      tabIndex={0}
                      onClick={(e) => handleWordClick(word.start, e)} 
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleWordClick(word.start, e)}
                      className={`word-seekable px-1 rounded transition-all duration-200 focus:ring-2 focus:ring-indigo-500 outline-none ${activeWordId === word.id ? 'active-word' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} 
                      data-word-id={word.id}
                      data-start={word.start}
                      aria-label={`Seek to: ${word.text}`}
                      aria-current={activeWordId === word.id ? 'time' : undefined}
                    >
                      {word.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <h3 id="export-modal-title" className="text-xl font-black text-slate-900 dark:text-white mb-2 text-center">Export Session</h3>
            <div className="space-y-3 mt-8">
              <button onClick={() => { handleExportPDF(); setIsShareModalOpen(false); }} className="w-full p-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 font-bold text-sm flex items-center justify-between shadow-xl transition-all focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span>Export PDF</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(entry.text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between border border-slate-100 dark:border-slate-700 transition-all focus:ring-2 focus:ring-indigo-500">
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
              </button>
              <button onClick={() => { handleExportSRT(); setIsShareModalOpen(false); }} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between border border-slate-100 dark:border-slate-700 transition-all focus:ring-2 focus:ring-indigo-500">
                <span>Export SRT Subtitles</span>
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              <button onClick={() => setIsShareModalOpen(false)} className="w-full p-3 mt-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-center focus:underline">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptCard;