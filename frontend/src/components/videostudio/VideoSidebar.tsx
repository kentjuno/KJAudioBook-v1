import React from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import type { ScriptLine } from '../../types';

interface VideoSidebarProps {
  script: ScriptLine[];
  activeLineIds: number[];
  isGeneratingStoryboard: boolean;
  onGenerateStoryboard: () => void;
  scriptListRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}

const VideoSidebar: React.FC<VideoSidebarProps> = ({
  script,
  activeLineIds,
  isGeneratingStoryboard,
  onGenerateStoryboard,
  scriptListRefs,
}) => (
  <div className="w-1/4 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-4">
    <div className="flex items-center justify-between sticky top-0 bg-slate-900 z-10 pb-2 border-b border-slate-800">
      <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Audio Script</h2>
      <button
        onClick={onGenerateStoryboard}
        disabled={isGeneratingStoryboard || script.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
      >
        {isGeneratingStoryboard ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        AI Director
      </button>
    </div>

    {script.length === 0 ? (
      <div className="text-slate-500 text-sm text-center mt-10">
        Kịch bản trống. Vui lòng thêm kịch bản bên Audio Studio.
      </div>
    ) : (
      script.map((line, idx) => {
        const isActive = activeLineIds.includes(line.id);
        return (
          <div
            key={line.id}
            ref={(el) => { scriptListRefs.current[line.id] = el; }}
            className={`p-3 border rounded-lg transition-all duration-300 cursor-pointer group ${
              isActive
                ? 'bg-emerald-900/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]'
                : 'bg-slate-800/40 border-slate-700/50 hover:border-amber-500/50'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-amber-500/70'}`}>
                Line {idx + 1}
              </div>
              <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'text-emerald-300 bg-emerald-500/20' : 'text-amber-400 bg-amber-500/10'}`}>
                {line.speaker}
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isActive ? 'text-emerald-100' : 'text-slate-300'}`}>{line.text}</p>
          </div>
        );
      })
    )}
  </div>
);

export default VideoSidebar;
