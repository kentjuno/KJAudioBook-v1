// ==========================================================================
// components/timeline/VideoClip.tsx
// A single draggable, resizable video clip in the DAW timeline.
// ==========================================================================
import React from 'react';
import { X, Video } from 'lucide-react';
import type { TimelineVideoClip } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface VideoClipProps {
  clip: TimelineVideoClip;
  top: number;
  left: number;
  width: number;
  isDragging: boolean;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeLeft: (e: React.MouseEvent) => void;
  onResizeRight: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  videoRef: (el: HTMLVideoElement | null) => void;
}

export function VideoClip({
  clip, top, left, width, isDragging, isSelected,
  onMouseDown, onResizeLeft, onResizeRight, onDelete, videoRef,
}: VideoClipProps) {
  return (
    <div
      className={`absolute h-14 rounded-md overflow-hidden transition-all duration-200 shadow-md cursor-move ${
        isDragging
          ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-indigo-500/80 border-indigo-400'
          : isSelected
          ? 'z-30 bg-indigo-500/90 border-2 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]'
          : 'z-20 bg-indigo-900/80 border border-indigo-400 hover:bg-indigo-800'
      }`}
      style={{ top: `${top + 4}px`, left: `${left}px`, width: `${width}px` }}
      onMouseDown={onMouseDown}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-50 transition-colors group"
        onMouseDown={onResizeLeft}
      >
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white/50 group-hover:bg-white rounded-full pointer-events-none" />
      </div>

      {/* Clip header */}
      <div className={`px-1 py-0.5 text-[9px] font-bold truncate flex justify-between items-center relative z-10 ${
        isSelected ? 'text-indigo-50 bg-indigo-400/50' : 'text-indigo-200 bg-indigo-800/50'
      }`}>
        <span className="flex items-center gap-1">
          Video <span className="opacity-70 font-mono">({clip.duration.toFixed(1)}s)</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="text-indigo-200 hover:text-red-400 bg-transparent p-0.5 rounded transition-colors"
            title="Xóa clip video"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="w-full h-full mt-1 relative flex items-center justify-center pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{ backgroundImage: `url(${API_BASE}/api/video/thumbnail?url=${encodeURIComponent(clip.videoUrl)})` }}
        />
        <Video className="w-4 h-4 text-indigo-300 opacity-50 absolute" />
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-50 transition-colors group"
        onMouseDown={onResizeRight}
      >
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white/50 group-hover:bg-white rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
