import React from 'react';
import { TranscriptEntry } from '../types.ts';
import { formatDuration } from '../utils/audio.ts';

interface TranscriptListItemProps {
  entry: TranscriptEntry;
  isActive: boolean;
  onClick: () => void;
}

const TranscriptListItem: React.FC<TranscriptListItemProps> = ({ entry, isActive, onClick }) => {
  const fullDate = new Date(entry.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="relative group/item" role="presentation">
      <button
        onClick={onClick}
        role="option"
        aria-selected={isActive}
        title={`View transcript from ${fullDate}`}
        className={`w-full text-left p-4 transition-all border-b border-slate-50 dark:border-slate-800 last:border-b-0 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 group ${
          isActive 
            ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-r-2 border-r-indigo-600 dark:border-r-indigo-400' 
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
        }`}
      >
        <div className="flex justify-between items-start mb-1" aria-hidden="true">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {new Date(entry.timestamp).toLocaleDateString()}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {formatDuration(entry.duration)}
          </span>
        </div>
        <h4 className={`text-sm font-bold truncate ${isActive ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
          Transcript #{entry.id.slice(0, 4)}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-1">
          {entry.text || "No content yet..."}
        </p>
        <span className="sr-only">Recorded on {fullDate}, duration {formatDuration(entry.duration)}</span>
      </button>

      {/* Interactive Tooltip / Quick View */}
      <div 
        aria-hidden="true"
        className="absolute left-full top-0 ml-4 w-64 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] pointer-events-none opacity-0 translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 hidden lg:block"
      >
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quick Preview</span>
        </div>
        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-tight">
          {fullDate}
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-6">
          {entry.text || "This recording has no transcription content available."}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase">Length</span>
           <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{formatDuration(entry.duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default TranscriptListItem;