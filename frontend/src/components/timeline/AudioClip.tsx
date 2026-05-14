// ==========================================================================
// components/timeline/AudioClip.tsx
// A single draggable audio clip in the DAW timeline.
// Receives handlers from Timeline.tsx and reads refs from parent.
// ==========================================================================
import React from 'react';
import { X } from 'lucide-react';
import type { TimelineClip } from '../../types';

// Minimal inline waveform — mirrors the Waveform component in App.tsx
function Waveform({ audioUrl, width }: { audioUrl: string; width: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ac = new AudioContext();
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => {
        const data = decoded.getChannelData(0);
        const step = Math.ceil(data.length / width);
        ctx.clearRect(0, 0, width, 36);
        ctx.fillStyle = '#f59e0b';
        for (let i = 0; i < width; i++) {
          let max = 0;
          for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(data[i * step + j] || 0));
          const h = Math.max(2, max * 36);
          ctx.fillRect(i, (36 - h) / 2, 1, h);
        }
      })
      .catch(() => {});
  }, [audioUrl, width]);

  return <canvas ref={canvasRef} width={width} height={36} className="w-full h-[36px] pointer-events-none" />;
}

interface AudioClipProps {
  clip: TimelineClip;
  top: number;
  left: number;
  width: number;
  isDragging: boolean;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  audioRef: (el: HTMLAudioElement | null) => void;
}

export function AudioClip({
  clip, top, left, width, isDragging, isSelected,
  onMouseDown, onDelete, audioRef,
}: AudioClipProps) {
  return (
    <div
      key={clip.id}
      onMouseDown={onMouseDown}
      className={`absolute h-14 rounded-md overflow-hidden cursor-move transition-all duration-200 shadow-md ${
        isDragging
          ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-amber-500/80 border-amber-400'
          : isSelected
          ? 'z-30 bg-indigo-500/90 border-2 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]'
          : 'z-10 bg-amber-500/80 border border-amber-400 hover:bg-amber-400'
      }`}
      style={{ top: `${top + 4}px`, left: `${left}px`, width: `${width}px` }}
    >
      {/* Clip header */}
      <div className={`px-1 py-0.5 text-[9px] font-bold truncate flex justify-between items-center ${
        isSelected ? 'text-indigo-50 bg-indigo-400/50' : 'text-slate-900 bg-amber-400/50'
      }`}>
        <span>{clip.speaker}</span>
        <button
          onClick={(e) => onDelete(e, clip.id)}
          className={`${isSelected ? 'text-indigo-100 hover:text-red-300 hover:bg-indigo-500' : 'text-slate-900 hover:text-red-700 hover:bg-amber-400'} bg-transparent p-0.5 rounded transition-colors`}
          title="Xóa clip audio"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Waveform */}
      <div className="w-full mt-1 opacity-70 flex items-center px-1">
        <Waveform audioUrl={clip.audioUrl} width={width} />
      </div>

      {/* Hidden audio element */}
      <audio src={clip.audioUrl} ref={audioRef} />
    </div>
  );
}
