// ==========================================================================
// components/timeline/Timeline.tsx
// Full DAW timeline panel: ruler, track rows, playhead, audio/video clips.
// Reads all state from Zustand stores; heavy interaction handlers passed as props.
// ==========================================================================
import React from 'react';
import { Play, Pause, Video } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { AudioClip } from './AudioClip';
import { VideoClip } from './VideoClip';
import type { TimelineClip, TimelineVideoClip } from '../../types';

interface TimelineProps {
  children?: React.ReactNode;
  // Playback controls
  toggleTimelinePlay: () => void;
  handleTimelineSeek: (e: React.MouseEvent) => void;
  handleClearTimeline: () => void;
  // Clip mouse-down handlers
  handleTimelineClipMouseDown: (e: React.MouseEvent, clip: TimelineClip) => void;
  handleVideoClipMouseDown: (e: React.MouseEvent, clip: TimelineVideoClip) => void;
  handleVideoResizeMouseDown: (e: React.MouseEvent, clip: TimelineVideoClip, edge: 'left' | 'right') => void;
  handleDeleteTimelineClip: (e: React.MouseEvent, id: string) => void;
  // Resize handle
  handleTimelineResizeStart: (e: React.MouseEvent) => void;
  // Refs
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
  timelineAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  timelineVideoRefs: React.MutableRefObject<Record<string, HTMLVideoElement>>;
}

export function Timeline({
  toggleTimelinePlay, handleTimelineSeek, handleClearTimeline,
  handleTimelineClipMouseDown, handleVideoClipMouseDown,
  handleVideoResizeMouseDown, handleDeleteTimelineClip,
  handleTimelineResizeStart,
  timelineScrollRef, timelineAudioRefs, timelineVideoRefs,
  children,
}: TimelineProps) {
  const script                  = useProjectStore(s => s.script);
  const timelineClips           = useProjectStore(s => s.timelineClips);
  const timelineVideoClips      = useProjectStore(s => s.timelineVideoClips);
  const setTimelineVideoClips   = useProjectStore(s => s.setTimelineVideoClips);
  const activeTab               = useProjectStore(s => s.activeTab);
  const setActiveTab            = useProjectStore(s => s.setActiveTab);
  const isPlayingTimeline       = usePlaybackStore(s => s.isPlayingTimeline);
  const timelineTime            = usePlaybackStore(s => s.timelineTime);
  const zoomLevel               = usePlaybackStore(s => s.zoomLevel);
  const setZoomLevel            = usePlaybackStore(s => s.setZoomLevel);
  const timelineHeight          = usePlaybackStore(s => s.timelineHeight);
  const draggingVideoClipId     = usePlaybackStore(s => s.draggingVideoClipId);
  const draggingTimelineClipId  = usePlaybackStore(s => s.draggingTimelineClipId);
  const selectedTimelineVideoClipId = usePlaybackStore(s => s.selectedTimelineVideoClipId);
  const selectedTimelineAudioClipId = usePlaybackStore(s => s.selectedTimelineAudioClipId);

  // Ruler width
  const totalDuration = timelineClips.length > 0
    ? Math.max(20, ...timelineClips.map(c => c.startTime + c.duration))
    : 20;
  const rulerWidth = totalDuration * zoomLevel + 500;

  return (
    <div
      className={activeTab === 'post-production'
        ? 'flex-1 relative bg-slate-900 shadow-2xl flex flex-col z-50 overflow-hidden w-full h-full'
        : 'fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 shadow-2xl flex flex-col z-50 transition-none'}
      style={activeTab === 'post-production' ? {} : { height: `${timelineHeight}px` }}
    >
      {/* Resize handle (Audio Studio mode only) */}
      {activeTab === 'audio' && (
        <div
          className="absolute top-0 left-0 right-0 h-2 -mt-1 cursor-row-resize bg-transparent hover:bg-indigo-500/50 z-50"
          onMouseDown={handleTimelineResizeStart}
        />
      )}

      {children}

      {/* Transport bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Play className="w-4 h-4" /> Stories Editor (Timeline)
          </h3>
          <span className="text-xs text-slate-400 ml-4">
            Tổng số clip: {timelineClips.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={toggleTimelinePlay}
            className={`p-1.5 rounded-full ${isPlayingTimeline ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-amber-400'}`}
            title={isPlayingTimeline ? 'Tạm dừng (Space)' : 'Phát timeline (Space)'}
          >
            {isPlayingTimeline
              ? <Pause className="w-4 h-4" fill="currentColor" />
              : <Play className="w-4 h-4" fill="currentColor" />}
          </button>

          {/* Time display */}
          <div className="text-xs font-mono text-amber-400 bg-slate-900 px-2 py-1 rounded w-16 text-center border border-slate-700">
            {timelineTime.toFixed(1)}s
          </div>

          {/* Sync button (audio tab only) */}
          {activeTab === 'audio' && (
            <button
              onClick={() => setActiveTab('post-production')}
              className="ml-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-semibold rounded"
              title="Chuyển sang Post-Production để Mix"
            >
              Sync to Post-Production
            </button>
          )}

          {/* Clear */}
          <button
            onClick={handleClearTimeline}
            className="ml-2 px-3 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-semibold rounded border border-rose-500/20"
            title="Xóa toàn bộ Timeline"
          >
            Clear
          </button>

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-4 bg-slate-900 rounded border border-slate-700 px-2 py-1">
            <button onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))} className="text-slate-400 hover:text-amber-400" title="Thu nhỏ timeline">-</button>
            <span className="text-[10px] text-slate-500 w-8 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="text-slate-400 hover:text-amber-400" title="Phóng to timeline">+</button>
          </div>
        </div>
      </div>

      {/* Scrollable track area */}
      <div ref={timelineScrollRef} className="flex-1 overflow-auto relative bg-slate-900/50 p-2">
        {/* Ruler */}
        <div
          className="h-6 border-b border-slate-700 mb-2 relative opacity-50 cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={handleTimelineSeek}
          style={{ width: `${rulerWidth}px` }}
        >
          {Array.from({ length: Math.ceil(totalDuration / 2) + 10 }).map((_, i) => (
            <div key={i} className="absolute top-0 text-[10px] text-slate-500" style={{ left: `${i * 2 * zoomLevel}px` }}>
              {i * 2}s
            </div>
          ))}
        </div>

        {/* Track container */}
        <div className="relative min-h-[150px]">
          {/* Video track background */}
          {activeTab === 'post-production' && (
            <div className="absolute top-0 left-0 right-0 h-16 border-b-2 border-indigo-500/30 flex items-center bg-indigo-900/10 opacity-60">
              <span className="absolute left-2 text-[10px] text-indigo-400 font-bold">Video Track</span>
            </div>
          )}

          {/* Audio track backgrounds */}
          {[0, 1, 2, 3].map(trackIndex => (
            <div
              key={`track-${trackIndex}`}
              className="absolute left-0 right-0 h-16 border-b border-slate-800 flex items-center opacity-20"
              style={{ top: `${(activeTab === 'post-production' ? 70 : 0) + trackIndex * 64}px` }}
            >
              <span className="absolute left-2 text-[10px] text-slate-500 font-bold">Track {trackIndex}</span>
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
            style={{ left: `${timelineTime * zoomLevel}px` }}
          >
            <div className="w-3 h-3 bg-red-500 -ml-[5px] -mt-1 rounded-sm shadow-md flex items-center justify-center" />
          </div>

          {/* Video clips (post-production only) */}
          {activeTab === 'post-production' && timelineVideoClips.map((clip) => {
            const isSelected = selectedTimelineVideoClipId === clip.id
              || (!selectedTimelineVideoClipId && !selectedTimelineAudioClipId && script.find(l => l.id === clip.lineId)?.selected);
            const isDragging = draggingVideoClipId === clip.id;
            return (
              <VideoClip
                key={clip.id}
                clip={clip}
                top={0}
                left={clip.startTime * zoomLevel}
                width={clip.duration * zoomLevel}
                isDragging={isDragging}
                isSelected={!!isSelected}
                onMouseDown={(e) => handleVideoClipMouseDown(e, clip)}
                onResizeLeft={(e) => handleVideoResizeMouseDown(e, clip, 'left')}
                onResizeRight={(e) => handleVideoResizeMouseDown(e, clip, 'right')}
                onDelete={(e) => {
                  e.stopPropagation();
                  setTimelineVideoClips(prev => prev.filter(c => c.id !== clip.id));
                }}
                videoRef={(el) => { if (el) timelineVideoRefs.current[clip.id] = el; }}
              />
            );
          })}

          {/* Audio clips */}
          {timelineClips.map((clip) => {
            const top = (activeTab === 'post-production' ? 70 : 0) + clip.track * 64;
            const isSelected = selectedTimelineAudioClipId === clip.id
              || (!selectedTimelineAudioClipId && !selectedTimelineVideoClipId && script.find(l => l.id === clip.lineId)?.selected);
            const isDragging = draggingTimelineClipId === clip.id;
            return (
              <AudioClip
                key={clip.id}
                clip={clip}
                top={top}
                left={clip.startTime * zoomLevel}
                width={clip.duration * zoomLevel}
                isDragging={isDragging}
                isSelected={!!isSelected}
                onMouseDown={(e) => handleTimelineClipMouseDown(e, clip)}
                onDelete={handleDeleteTimelineClip}
                audioRef={(el) => { if (el) timelineAudioRefs.current[clip.id] = el; }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
