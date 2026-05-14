import React, { useState, useRef, useEffect } from 'react';
import { Settings, Play, Pause, Download, Mic, Plus, FileText, Upload, Volume2, Trash2, Loader2, Save, FolderOpen, Copy, CheckCircle, ArrowUpDown, GripVertical, X, ChevronDown, ChevronUp, Image as ImageIcon, Video, User, Wand2 } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import VideoStudio from './VideoStudio';
import type { ScriptLine, TimelineClip, TimelineVideoClip, VoiceParams, RenderProgress, CharacterMetadata } from './types';
import { API } from './config';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from './hooks/useTimelinePlayback';
import { useAudioMixer } from './hooks/useAudioMixer';
import { useScriptManager } from './hooks/useScriptManager';
import { useProjectStore } from './store/useProjectStore';
import { usePlaybackStore } from './store/usePlaybackStore';
import { Header } from './components/layout/Header';
import { ScriptSidebar } from './components/script/ScriptSidebar';
import { Timeline } from './components/timeline/Timeline';
import { PropertiesInspector } from './components/inspector/PropertiesInspector';

// Mock data for initial UI state
const initialScript = [
  { id: 0, speaker: 'narration', text: 'Tiếng gầm thét của "Lõi Ý thức" không giống với bất kỳ âm thanh cơ khí nào.' },
  { id: 1, speaker: 'kael', text: 'Vậy tôi phải làm gì? Nó sắp tan vỡ hoàn toàn!' },
  { id: 2, speaker: 'elara', text: 'Cậu không thể là người "làm" mọi việc. Cậu phải là người "hướng dẫn".' },
];


// Shared AudioContext to avoid browser hardware limit (~6 context max)

// Khởi tạo AudioContext dùng chung để tránh lỗi giới hạn phần cứng của trình duyệt (chỉ cho phép tạo ~6 context)
const SharedAudioContext = window.AudioContext || (window as any).webkitAudioContext;
const sharedAudioContext = new SharedAudioContext();

const Waveform = ({ audioUrl, width }: { audioUrl: string, width: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    
    const drawWaveform = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer);
        
        if (isCancelled) return;
        
        const channelData = audioBuffer.getChannelData(0); 
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const barWidth = 2;
        const gap = 1;
        const barCount = Math.floor(width / (barWidth + gap));
        const step = Math.ceil(channelData.length / barCount);
        
        ctx.clearRect(0, 0, width, canvas.height);
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.globalAlpha = 0.4;
        
        for (let i = 0; i < barCount; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const index = i * step + j;
            if (index < channelData.length) {
              const datum = channelData[index];
              if (datum < min) min = datum;
              if (datum > max) max = datum;
            }
          }
          
          const amplitude = Math.max(Math.abs(min), Math.abs(max));
          const barHeight = Math.max(1, amplitude * canvas.height * 0.9);
          
          ctx.fillRect(i * (barWidth + gap), (canvas.height - barHeight) / 2, barWidth, barHeight);
        }
      } catch (err) {
        console.error("Error drawing waveform", err);
      }
    };
    
    drawWaveform();
    
    return () => {
      isCancelled = true;
    };
  }, [audioUrl, width]);

  return <canvas ref={canvasRef} width={width} height={36} className="w-full h-[36px] pointer-events-none" />;
};

function App() {
  // ── Zustand: Project Store ────────────────────────────────────────────────
  const activeTab            = useProjectStore(s => s.activeTab);
  const setActiveTab         = useProjectStore(s => s.setActiveTab);
  const script               = useProjectStore(s => s.script);
  const setScript            = useProjectStore(s => s.setScript);
  const timelineClips        = useProjectStore(s => s.timelineClips);
  const setTimelineClips     = useProjectStore(s => s.setTimelineClips);
  const timelineVideoClips   = useProjectStore(s => s.timelineVideoClips);
  const setTimelineVideoClips = useProjectStore(s => s.setTimelineVideoClips);
  const lockedVoices         = useProjectStore(s => s.lockedVoices);
  const setLockedVoices      = useProjectStore(s => s.setLockedVoices);
  const speakerVoiceParams   = useProjectStore(s => s.speakerVoiceParams);
  const setSpeakerVoiceParams = useProjectStore(s => s.setSpeakerVoiceParams);
  const charactersMetadata   = useProjectStore(s => s.charactersMetadata);
  const setCharactersMetadata = useProjectStore(s => s.setCharactersMetadata);
  const renderProgress       = useProjectStore(s => s.renderProgress);
  const setRenderProgress    = useProjectStore(s => s.setRenderProgress);
  const flowkitProjectId     = useProjectStore(s => s.flowkitProjectId);
  const setFlowkitProjectId  = useProjectStore(s => s.setFlowkitProjectId);
  const globalArtStyle       = useProjectStore(s => s.globalArtStyle);
  const setGlobalArtStyle    = useProjectStore(s => s.setGlobalArtStyle);

  // ── Zustand: Playback Store ───────────────────────────────────────────────
  const isPlayingTimeline        = usePlaybackStore(s => s.isPlayingTimeline);
  const setIsPlayingTimeline     = usePlaybackStore(s => s.setIsPlayingTimeline);
  const timelineTime             = usePlaybackStore(s => s.timelineTime);
  const setTimelineTime          = usePlaybackStore(s => s.setTimelineTime);
  const zoomLevel                = usePlaybackStore(s => s.zoomLevel);
  const setZoomLevel             = usePlaybackStore(s => s.setZoomLevel);
  const timelineHeight           = usePlaybackStore(s => s.timelineHeight);
  const setTimelineHeight        = usePlaybackStore(s => s.setTimelineHeight);
  const draggingTimelineClipId   = usePlaybackStore(s => s.draggingTimelineClipId);
  const setDraggingTimelineClipId = usePlaybackStore(s => s.setDraggingTimelineClipId);
  const timelineDragStartX       = usePlaybackStore(s => s.timelineDragStartX);
  const setTimelineDragStartX    = usePlaybackStore(s => s.setTimelineDragStartX);
  const timelineDragStartY       = usePlaybackStore(s => s.timelineDragStartY);
  const setTimelineDragStartY    = usePlaybackStore(s => s.setTimelineDragStartY);
  const timelineDragStartStartTime    = usePlaybackStore(s => s.timelineDragStartStartTime);
  const setTimelineDragStartStartTime = usePlaybackStore(s => s.setTimelineDragStartStartTime);
  const timelineDragStartTrack   = usePlaybackStore(s => s.timelineDragStartTrack);
  const setTimelineDragStartTrack = usePlaybackStore(s => s.setTimelineDragStartTrack);
  const draggingVideoClipId      = usePlaybackStore(s => s.draggingVideoClipId);
  const setDraggingVideoClipId   = usePlaybackStore(s => s.setDraggingVideoClipId);
  const resizingVideoClipId      = usePlaybackStore(s => s.resizingVideoClipId);
  const setResizingVideoClipId   = usePlaybackStore(s => s.setResizingVideoClipId);
  const videoResizeEdge          = usePlaybackStore(s => s.videoResizeEdge);
  const setVideoResizeEdge       = usePlaybackStore(s => s.setVideoResizeEdge);
  const videoDragStartDuration   = usePlaybackStore(s => s.videoDragStartDuration);
  const setVideoDragStartDuration = usePlaybackStore(s => s.setVideoDragStartDuration);
  const videoDragStartTrimStart  = usePlaybackStore(s => s.videoDragStartTrimStart);
  const setVideoDragStartTrimStart = usePlaybackStore(s => s.setVideoDragStartTrimStart);
  const selectedTimelineVideoClipId    = usePlaybackStore(s => s.selectedTimelineVideoClipId);
  const setSelectedTimelineVideoClipId = usePlaybackStore(s => s.setSelectedTimelineVideoClipId);
  const selectedTimelineAudioClipId    = usePlaybackStore(s => s.selectedTimelineAudioClipId);
  const setSelectedTimelineAudioClipId = usePlaybackStore(s => s.setSelectedTimelineAudioClipId);

  // ── Local UI state (not shared, no need for store) ───────────────────────
  const [activeVideoNodeLineIds, setActiveVideoNodeLineIds] = useState<number[]>([]);
  const [isGenerating, setIsGenerating]                     = useState(false);
  const [playingId, setPlayingId]                           = useState<number | null>(null);
  const [isCreatingSynthetic, setIsCreatingSynthetic]       = useState<string | null>(null);
  const [playingVoiceRef, setPlayingVoiceRef]               = useState<string | null>(null);
  const [expandedScriptLines, setExpandedScriptLines]       = useState<Set<number>>(new Set());
  const [expandedVoices, setExpandedVoices]                 = useState<Set<string>>(new Set());
  const [isExtractingEntities, setIsExtractingEntities]     = useState<boolean>(false);
  const [isGeneratingAsset, setIsGeneratingAsset]           = useState<string | null>(null);
  const [renderingVideos, setRenderingVideos]               = useState<Record<number, string>>({});
  const [videoStatus, setVideoStatus]                       = useState<Record<number, string>>({});
  const [isSortingMode, setIsSortingMode]                   = useState(false);
  const dragItem     = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo]           = useState<number | null>(null);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt]     = useState<number | null>(null);
  const [isEnhancingMotion, setIsEnhancingMotion]           = useState<number | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const toggleScriptLine = (id: number, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
    setExpandedScriptLines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVoice = (speaker: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
    setExpandedVoices(prev => {
      const next = new Set(prev);
      if (next.has(speaker)) next.delete(speaker);
      else next.add(speaker);
      return next;
    });
  };

  const handleTimelineResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setTimelineHeight(Math.max(100, Math.min(window.innerHeight - 100, startHeight + deltaY)));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Load metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metaRes, profileRes] = await Promise.all([
          axios.get(API.charactersMetadata),
          axios.get(API.projectProfile)
        ]);
        setCharactersMetadata(metaRes.data);
        if (profileRes.data && Object.keys(profileRes.data).length > 0) {
          if (profileRes.data.speakerVoiceParams) setSpeakerVoiceParams(profileRes.data.speakerVoiceParams);
          if (profileRes.data.lockedVoices) setLockedVoices(profileRes.data.lockedVoices);
          if (profileRes.data.flowkitProjectId) setFlowkitProjectId(profileRes.data.flowkitProjectId);
        }
      } catch (e) {
        console.error('Lỗi khi load metadata/profile', e);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingTimelineClipId && !draggingVideoClipId && !resizingVideoClipId) return;

      
      const deltaX = e.clientX - timelineDragStartX;
      const deltaSeconds = deltaX / zoomLevel;
      
      if (draggingTimelineClipId) {
        const deltaY = e.clientY - timelineDragStartY;
        const deltaTracks = Math.round(deltaY / 64); // 64px per track
        setTimelineClips(prev => prev.map(c => {
          if (c.id === draggingTimelineClipId) {
            return { 
              ...c, 
              startTime: Math.max(0, timelineDragStartStartTime + deltaSeconds),
              track: Math.max(0, Math.min(3, timelineDragStartTrack + deltaTracks))
            };
          }
          return c;
        }));
      }

      if (draggingVideoClipId) {
        setTimelineVideoClips(prev => prev.map(c => {
          if (c.id === draggingVideoClipId) {
            return { ...c, startTime: Math.max(0, timelineDragStartStartTime + deltaSeconds) };
          }
          return c;
        }));
      }

      if (resizingVideoClipId && videoResizeEdge) {
        setTimelineVideoClips(prev => prev.map(c => {
          if (c.id === resizingVideoClipId) {
            if (videoResizeEdge === 'right') {
              return { ...c, duration: Math.max(0.5, videoDragStartDuration + deltaSeconds) };
            } else if (videoResizeEdge === 'left') {
              const maxDelta = videoDragStartDuration - 0.5;
              const validDelta = Math.min(deltaSeconds, maxDelta);
              const newStartTime = Math.max(0, timelineDragStartStartTime + validDelta);
              const startDiff = newStartTime - timelineDragStartStartTime;
              return { 
                ...c, 
                startTime: newStartTime,
                duration: videoDragStartDuration - startDiff,
                trimStart: Math.max(0, videoDragStartTrimStart + startDiff)
              };
            }
          }
          return c;
        }));
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingTimelineClipId(null);
      setDraggingVideoClipId(null);
      setResizingVideoClipId(null);
    };

    if (draggingTimelineClipId || draggingVideoClipId || resizingVideoClipId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingTimelineClipId, draggingVideoClipId, resizingVideoClipId, videoResizeEdge, timelineDragStartX, timelineDragStartY, timelineDragStartStartTime, timelineDragStartTrack, videoDragStartDuration, videoDragStartTrimStart, zoomLevel]);

  const handleVideoClipMouseDown = (e: React.MouseEvent, clip: TimelineVideoClip) => {
    e.stopPropagation();
    setDraggingVideoClipId(clip.id);
    setSelectedTimelineVideoClipId(clip.id);
    setSelectedTimelineAudioClipId(null);
    setTimelineDragStartX(e.clientX);
    setTimelineDragStartStartTime(clip.startTime);
    setScript(prev => prev.map(line => ({ ...line, selected: line.id === clip.lineId })));
  };

  const handleVideoResizeMouseDown = (e: React.MouseEvent, clip: TimelineVideoClip, edge: 'left' | 'right') => {
    e.stopPropagation();
    setResizingVideoClipId(clip.id);
    setVideoResizeEdge(edge);
    setTimelineDragStartX(e.clientX);
    setTimelineDragStartStartTime(clip.startTime);
    setVideoDragStartDuration(clip.duration);
    setVideoDragStartTrimStart(clip.trimStart || 0);
  };

  const handleTimelineClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    setDraggingTimelineClipId(clip.id);
    setSelectedTimelineAudioClipId(clip.id);
    setSelectedTimelineVideoClipId(null);
    setTimelineDragStartX(e.clientX);
    setTimelineDragStartY(e.clientY);
    setTimelineDragStartStartTime(clip.startTime);
    setTimelineDragStartTrack(clip.track);

    // Auto-select corresponding script line and scroll to it
    setScript(prev => prev.map(line => ({
      ...line,
      selected: line.id === clip.lineId
    })));

    setExpandedScriptLines(prev => {
      const next = new Set(prev);
      next.add(clip.lineId);
      return next;
    });

    setTimeout(() => {
      const element = document.getElementById(`script-line-${clip.lineId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleDeleteTimelineClip = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    setTimelineClips(prev => prev.filter(c => c.id !== clipId));
  };

  const seekTimelineTo = (newTime: number) => {
    setTimelineTime(newTime);
    
    // Đồng bộ lại audio
    timelineClips.forEach(clip => {
      const audio = timelineAudioRefs.current[clip.id];
      if (audio) {
        if (newTime >= clip.startTime && newTime < clip.startTime + clip.duration) {
          audio.currentTime = newTime - clip.startTime;
          if (isPlayingTimeline) {
            audio.play().catch(err => console.log("Play error", err));
          }
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    });

    timelineVideoClips.forEach(clip => {
      const video = timelineVideoRefs.current[clip.id];
      if (video) {
        if (newTime >= clip.startTime && newTime < clip.startTime + clip.duration) {
          video.currentTime = newTime - clip.startTime + (clip.trimStart || 0);
          if (isPlayingTimeline) {
            video.play().catch(err => console.log("Video Play error", err));
          }
        } else {
          video.pause();
        }
      }
    });
  };

  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    seekTimelineTo(Math.max(0, x / zoomLevel));
  };

  // Timeline Playback state (from Zustand — refs stay local for DOM access)
  const timelineAudioRefs = useRef<{[id: string]: HTMLAudioElement}>({});
  const timelineVideoRefs = useRef<{[id: string]: HTMLVideoElement}>({});


  // Sync video volumes
  useEffect(() => {
    timelineVideoClips.forEach(clip => {
      const video = timelineVideoRefs.current[clip.id];
      if (video) {
        // volume attribute on HTMLMediaElement is between 0.0 and 1.0 (though it can technically go higher, standard DOM expects 0-1, so 200% = 1.0 internally, but wait, if it's > 1 it throws an error in some browsers! Actually, HTML5 video volume is exactly 0.0 to 1.0. We should clamp it or use Web Audio API to boost beyond 100%. For now, clamping to 1.0 if over 100%, but 0 to 1 for 0-100%).
        const vol = (clip.volume ?? 100) / 100;
        video.volume = Math.min(Math.max(vol, 0), 1);
      }
    });
  }, [timelineVideoClips]);

  const toggleTimelinePlay = () => {
    if (!isPlayingTimeline) {
      let startFrom = timelineTime;
      // Nếu đang play từ đầu hoặc play tiếp
      const maxTime = timelineClips.length > 0 ? Math.max(...timelineClips.map(c => c.startTime + c.duration)) : 20;
      if (timelineTime > maxTime) {
        setTimelineTime(0); // auto reset if too far
        startFrom = 0;
      }
      
      // Kích hoạt ngay lập tức các clip đang đè lên playhead
      timelineClips.forEach(clip => {
        const audio = timelineAudioRefs.current[clip.id];
        if (audio) {
          if (startFrom >= clip.startTime && startFrom < clip.startTime + clip.duration) {
            audio.currentTime = startFrom - clip.startTime;
            audio.play().catch(err => console.log("Play error", err));
          }
        }
      });

      timelineVideoClips.forEach(clip => {
        const video = timelineVideoRefs.current[clip.id];
        if (video) {
          if (startFrom >= clip.startTime && startFrom < clip.startTime + clip.duration) {
            video.currentTime = startFrom - clip.startTime + (clip.trimStart || 0);
            video.play().catch(err => console.log("Video Play error", err));
          }
        }
      });
    }
    setIsPlayingTimeline(prev => !prev);
  };

  // ── Hooks ────────────────────────────────────────────────────────────────
  // Keyboard shortcuts (Space / ArrowLeft / ArrowRight)
  useKeyboardShortcuts({
    onTogglePlay: toggleTimelinePlay,
    onSeek: seekTimelineTo,
    getCurrentTime: () => timelineTime,
  });

  // Timeline animation loop + seek sync
  const { seekTimelineTo: _seek, toggleTimelinePlay: _toggle } = useTimelinePlayback({
    isPlayingTimeline,
    setIsPlayingTimeline,
    timelineTime,
    setTimelineTime,
    timelineClips,
    timelineVideoClips,
    timelineAudioRefs,
    timelineVideoRefs,
  });
  // Re-export so seekTimelineTo/toggleTimelinePlay below still work for JSX
  // (these shadow the local ones — that's intentional)



  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // localStorage persistence is now handled by Zustand's persist middleware
  // (useProjectStore) — manual useEffects removed.

  // ── Audio Mixer Hook ──────────────────────────────────────────────────────
  const { mixAndExport: handleMixAndExport } = useAudioMixer({
    timelineClips,
    timelineVideoClips,
    setRenderProgress,
  });

  // ── Script Manager Hook ───────────────────────────────────────────────────
  const { exportProject, handleImportProject, handleClearTimeline } = useScriptManager({
    script,
    setScript,
    setTimelineClips,
    setTimelineTime,
    importInputRef,
  });

  const handleRenderAll = async () => {
    // Ưu tiên render các dòng được chọn. Nếu không chọn dòng nào thì coi như render tất cả.
    const hasSelection = script.some(line => line.selected);
    const linesToRender = hasSelection ? script.filter(line => line.selected) : script;

    if (linesToRender.length === 0) {
      toast.error("Không có dòng nào để render!");
      return;
    }
    
    setRenderProgress({ status: 'rendering', currentLine: 0, totalLines: linesToRender.length, finalAudioUrl: null });
    
    const filenames: string[] = [];
    
    // Step 1: Render từng dòng
    for (let i = 0; i < linesToRender.length; i++) {
      const line = linesToRender[i];
      setRenderProgress(prev => ({ ...prev, currentLine: i + 1 }));
      
      try {
        const res = await axios.post('http://localhost:8000/api/render-line', {
          id: line.id,
          text: line.text,
          speaker: line.speaker
        });
        filenames.push(res.data.file);
        
        // Update or Add to Timeline
        setTimelineClips(prev => {
          const newClips = [...prev];
          const existingIndex = newClips.findIndex(c => c.lineId === line.id);
          const clipId = `clip_${line.id}_${Date.now()}`;
          
          if (existingIndex >= 0) {
            // Delete old audio ref to force mount of new element
            const oldId = newClips[existingIndex].id;
            const oldAudio = timelineAudioRefs.current[oldId];
            if (oldAudio) {
              oldAudio.pause();
              delete timelineAudioRefs.current[oldId];
            }

            // Update existing (giữ nguyên track và startTime)
            newClips[existingIndex] = {
              ...newClips[existingIndex],
              id: clipId,
              audioUrl: `http://localhost:8000/api/audio?path=${encodeURIComponent(res.data.file)}&t=${Date.now()}`,
              filename: res.data.file,
              duration: res.data.duration || 2.0
            };
          } else {
            // Thêm mới vào Timeline
            let newStartTime = 0;
            if (newClips.length > 0) {
              const lastClip = newClips.reduce((prev, current) => (prev.startTime > current.startTime) ? prev : current);
              newStartTime = lastClip.startTime + lastClip.duration + 0.5;
            }
            
            // Tự động phân bổ track dựa trên nhân vật
            const tracks = Array.from(new Set(newClips.map(c => c.speaker)));
            let trackIndex = tracks.indexOf(line.speaker);
            if (trackIndex === -1) trackIndex = tracks.length;

            newClips.push({
              id: clipId,
              lineId: line.id,
              speaker: line.speaker,
              audioUrl: `http://localhost:8000/api/audio?path=${encodeURIComponent(res.data.file)}&t=${Date.now()}`,
              filename: res.data.file,
              track: trackIndex,
              startTime: newStartTime,
              duration: res.data.duration || 2.0
            });
          }
          return newClips;
        });
        
      } catch (e) {
        console.error("Lỗi render line:", line.id);
        toast.error("Lỗi khi render câu thoại: " + line.text);
        setRenderProgress(prev => ({ ...prev, status: 'error' }));
        return;
      }
    }
    
    // Step 2: Assemble (Ghép nối)
    setRenderProgress(prev => ({ ...prev, status: 'assembling' }));
    
    try {
      const res = await axios.post('http://localhost:8000/api/assemble-audio', {
        filenames
      }, { responseType: 'blob' });
      
      const audioUrl = URL.createObjectURL(new Blob([res.data]));
      setRenderProgress(prev => ({ ...prev, status: 'done', finalAudioUrl: audioUrl }));
      
    } catch (e) {
      console.error("Lỗi Assemble:", e);
      toast.error("Lỗi khi ghép file audio!");
      setRenderProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  const createSyntheticVoice = async (speaker: string) => {
    const params = speakerVoiceParams[speaker] || { gender: 'male', age: 'middle-aged', pitch: 'low pitch' };
    const instruct = `${params.gender}, ${params.pitch}, ${params.age}`;
    
    setIsCreatingSynthetic(speaker);
    try {
      const response = await axios.post('http://localhost:8000/api/create-synthetic-voice', {
        speaker,
        instruct
      });
      toast.success(response.data.message || "Tạo giọng ảo thành công! Đã khoá voice profile.");
      setLockedVoices(prev => ({ ...prev, [speaker]: true }));
    } catch (error) {
      console.error(error);
      toast.error("Lỗi tạo giọng ảo. Hãy kiểm tra console Backend.");
    } finally {
      setIsCreatingSynthetic(null);
    }
  };

  const handleExtractEntities = async () => {
    if (script.length === 0) return;
    setIsExtractingEntities(true);
    
    // Nối tất cả text
    const fullText = script.map(l => l.text).join("\n\n");
    
    try {
      const response = await axios.post('http://localhost:8000/api/extract-entities', { text: fullText });
      if (response.data && response.data.metadata) {
        setCharactersMetadata(response.data.metadata);
        toast.success("Đã trích xuất xong Danh sách Nhân Vật & Bối Cảnh!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi trích xuất thực thể. Vui lòng check console.");
    } finally {
      setIsExtractingEntities(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await axios.post('http://localhost:8000/api/project-profile', {
        speakerVoiceParams,
        lockedVoices,
        flowkitProjectId
      });
      toast.success("Đã lưu toàn bộ thiết lập Voice Casting và Project ID thành công!");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi lưu thiết lập!");
    }
  };

  // Kiểm tra trạng thái Video thủ công
  const handleCheckVideoStatus = async (sceneId: number) => {
    const op_name = renderingVideos[sceneId];
    if (!op_name) return;
    
    try {
      setVideoStatus(prev => ({...prev, [sceneId]: "Đang kiểm tra..."}));
      const res = await axios.get(`http://localhost:8000/api/check-video-status?operation_name=${encodeURIComponent(op_name)}`);
      
      const data = res.data;
      if (data.status === 200 && data.data && data.data.media && data.data.media.length > 0) {
        const media = data.data.media[0];
        const status = media.mediaStatus?.mediaGenerationStatus;
        if (status === 'MEDIA_GENERATION_STATUS_SUCCEEDED') {
          const videoUri = media.videoUri; // Lấy URL tải xuống
          setVideoStatus(prev => ({...prev, [sceneId]: "Đã Render Xong!"}));
          setScript(prev => prev.map(line => line.id === sceneId ? { ...line, video_url: videoUri } : line));
          toast.success("Video render xong! Bạn có thể xem ngay bằng cách bấm vào Preview ở Script.");
        } else if (status === 'MEDIA_GENERATION_STATUS_SCHEDULED' || status === 'MEDIA_GENERATION_STATUS_PROCESSING') {
          setVideoStatus(prev => ({...prev, [sceneId]: "Vẫn đang Render (3-5p)..."}));
        } else {
          setVideoStatus(prev => ({...prev, [sceneId]: `Lỗi: ${status}`}));
        }
      } else {
        setVideoStatus(prev => ({...prev, [sceneId]: "Chưa rõ trạng thái..."}));
      }
    } catch (e) {
      console.error(e);
      setVideoStatus(prev => ({...prev, [sceneId]: "Lỗi mạng khi kiểm tra"}));
    }
  };

  const handleEnhanceMotion = async (lineId: number, dialogue: string, rawMotion: string) => {
    if (!rawMotion) {
      toast.error("Vui lòng nhập mô tả motion cơ bản trước khi Enhance!");
      return;
    }
    setIsEnhancingMotion(lineId);
    try {
      const res = await axios.post('http://localhost:8000/api/enhance-motion', {
        dialogue: dialogue,
        motion_prompt: rawMotion
      });
      
      if (res.data.prompt) {
        setScript(prev => prev.map(line => 
          line.id === lineId ? { ...line, motion_prompt: res.data.prompt } : line
        ));
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi enhance motion prompt!");
    } finally {
      setIsEnhancingMotion(null);
    }
  };

  const handleGenerateVideo = async (lineId: number, image_prompt: string, motion_prompt: string, visualReferences: string[]) => {
    setIsGeneratingVideo(lineId);
    try {
      const refIds = visualReferences.map(r => r.toLowerCase());
      const prompt = `[Visual]: ${image_prompt}\n[Motion]: ${motion_prompt || 'Cinematic movement, slow pan.'}\n\nStyle: ${globalArtStyle}`;
      const res = await axios.post('http://localhost:8000/api/generate-scene-video', {
        prompt: prompt,
        project_id: flowkitProjectId,
        scene_id: `scene_${lineId}`,
        visual_reference_ids: refIds
      });
      
      if (res.data.status === 'success') {
        toast.success("Đã gửi lệnh Render Video lên FlowKit! Đang xử lý dưới nền.");
        if (res.data.operation_name) {
          setRenderingVideos(prev => ({...prev, [lineId]: res.data.operation_name}));
          setVideoStatus(prev => ({...prev, [lineId]: "Đang Render (Chờ 3-5 phút)..."}));
        }
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail;
      toast.error(detail ? detail : "Lỗi khi tạo video. Hãy kiểm tra FlowKit Extension hoặc Backend.");
    } finally {
      setIsGeneratingVideo(null);
    }
  };

  const handleUploadCharacterImage = async (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("character_id", characterId);
    formData.append("file", file);

    try {
      const response = await axios.post('http://localhost:8000/api/upload-character-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.status === 'success') {
        if (response.data.metadata) {
          setCharactersMetadata(response.data.metadata);
        } else {
          setCharactersMetadata(prev => ({
            ...prev,
            [characterId]: {
              ...prev[characterId],
              local_image_path: response.data.file_path,
              media_id: null
            }
          }));
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi upload ảnh nhân vật!");
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá thực thể này?")) return;
    try {
      const response = await axios.delete(`http://localhost:8000/api/entity/${entityId}`);
      if (response.data.status === 'success') {
        setCharactersMetadata(response.data.metadata);
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi xoá thực thể!");
    }
  };

  const handleGenerateAssetImage = async (characterId: string, prompt: string) => {
    if (!prompt) { toast.error("Không có prompt để tạo ảnh."); return; }
    setIsGeneratingAsset(characterId);
    try {
      const entity = charactersMetadata[characterId];
      let referenceMediaIds: string[] = [];
      if (entity) {
        if (entity.media_id) {
          referenceMediaIds.push(entity.media_id);
        }
        if (entity.references && entity.references.length > 0) {
          const additionalRefs = entity.references
            .map((r: any) => r.media_id)
            .filter((id: any) => id && id !== entity.media_id);
          referenceMediaIds = [...referenceMediaIds, ...additionalRefs];
        }
      }

      // 1. Generate image request (synchronous from API now)
      const res = await axios.post('http://localhost:8000/api/generate-asset-image', {
        asset_id: characterId,
        prompt: prompt,
        project_id: flowkitProjectId || "a59651a1-70ff-44b6-ac42-c26d90ad28ef",
        reference_media_ids: referenceMediaIds
      });
      
      const url = res.data.url;
      if (!url) {
        throw new Error("Không nhận được URL ảnh từ API");
      }
      
      // 2. Download to local
      const downloadRes = await axios.post('http://localhost:8000/api/download-asset-image', {
        asset_id: characterId,
        url: url,
        media_id: res.data.media_id,
        prompt: prompt,
        name: entity?.variation_context || "Variation"
      });
      if (downloadRes.data.status === "success") {
        setCharactersMetadata(downloadRes.data.metadata);
      } else {
        toast.error("Lưu ảnh thất bại!");
      }
      setIsGeneratingAsset(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi gọi API: " + err.message);
      setIsGeneratingAsset(null);
    }
  };

  const deleteLine = (id: number) => {
    setScript(script.filter(line => line.id !== id));
  };

  const addLine = () => {
    const newId = script.length > 0 ? Math.max(...script.map(l => l.id)) + 1 : 1;
    const newLine: ScriptLine = {
      id: newId,
      speaker: 'narration',
      visual_references: [],
      text: '',
      image_prompt: '',
      is_image_generated: false,
      selected: false
    };
    setScript([...script, newLine]);
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const _script = [...script];
      const draggedItemContent = _script.splice(dragItem.current, 1)[0];
      _script.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setScript(_script);
    }
  };

  const handleDragOverContainer = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSortingMode) return;
    
    const SCROLL_SPEED = 20;
    const SCROLL_MARGIN = 150;
    
    if (e.clientY < SCROLL_MARGIN) {
      window.scrollBy(0, -SCROLL_SPEED);
    } else if (window.innerHeight - e.clientY < SCROLL_MARGIN) {
      window.scrollBy(0, SCROLL_SPEED);
    }
  };

  const playSample = async (id: number, text: string, speaker: string) => {
    setPlayingId(id);
    setPlayingVoiceRef(null);
    if (audioRef.current) {
        audioRef.current.pause();
    }
    try {
      const response = await axios.post('http://localhost:8000/api/test-voice', 
        { text, speaker },
        { responseType: 'blob' }
      );
      
      const audioUrl = URL.createObjectURL(new Blob([response.data]));
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    } catch (error) {
      console.error("Lỗi khi test voice:", error);
      toast.error("Lỗi khi gọi OmniVoice Backend.");
      setPlayingId(null);
    }
  };

  const togglePlayVoiceRef = (speaker: string) => {
    if (playingVoiceRef === speaker) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingVoiceRef(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setPlayingId(null);
    
    const audioUrl = `http://localhost:8000/api/voice-ref/${speaker}?t=${Date.now()}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    setPlayingVoiceRef(speaker);
    
    audio.play().catch(e => {
      console.error("Lỗi phát giọng mẫu:", e);
      toast.error("Không tìm thấy file giọng mẫu. Hãy tạo lại Diễn Viên Ảo.");
      setPlayingVoiceRef(null);
    });
    
    audio.onended = () => {
      setPlayingVoiceRef(null);
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      setIsGenerating(true);
      try {
        const response = await axios.post('http://localhost:8000/api/generate-script', { text });
        if (response.data && response.data.script) {
          // AI-generated scripts come back without `id` fields — assign sequentially
          const withIds = response.data.script.map((line: any, idx: number) => ({
            ...line,
            id: typeof line.id === 'number' ? line.id : idx,
          }));
          setScript(withIds);
          setTimelineClips([]);
          setTimelineTime(0);
        }
      } catch (error) {
        console.error("Lỗi khi tạo kịch bản:", error);
        toast.error("Có lỗi xảy ra khi gọi AI. Vui lòng check console Backend.");
      } finally {
        setIsGenerating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToTimeline = () => {
    let count = 0;
    const newVideoClips: TimelineVideoClip[] = [];
    
    try {
      const nodesStr = localStorage.getItem('video_nodes');
      const edgesStr = localStorage.getItem('video_edges');
      if (nodesStr && edgesStr) {
        const nodes = JSON.parse(nodesStr);
        const edges = JSON.parse(edgesStr);
        
        // Lấy danh sách video đã render xong
        const videoNodes = nodes.filter((n: any) => n.type === 'video' && n.data?.videoUrl);
        // Nhóm các videoNodes theo sceneNode
        const sceneToVideosMap: Record<string, any[]> = {};
        
        videoNodes.forEach((vNode: any) => {
          const edge = edges.find((e: any) => e.target === vNode.id);
          if (edge) {
            const sceneNode = nodes.find((n: any) => n.id === edge.source && n.type === 'scene');
            if (sceneNode) {
               if (!sceneToVideosMap[sceneNode.id]) sceneToVideosMap[sceneNode.id] = [];
               sceneToVideosMap[sceneNode.id].push(vNode);
            }
          }
        });

        // Xử lý từng Scene
        Object.keys(sceneToVideosMap).forEach(sceneId => {
          const sceneNode = nodes.find((n: any) => n.id === sceneId);
          if (sceneNode && sceneNode.data?.lines) {
            const lineIds = sceneNode.data.lines.split(',').map((id: string) => parseInt(id.trim(), 10));
            const matchedClips = timelineClips.filter(c => lineIds.includes(c.lineId));
            
            if (matchedClips.length > 0) {
              matchedClips.sort((a, b) => a.startTime - b.startTime);
              const sceneStartTime = matchedClips[0].startTime;
              const sceneEndTime = matchedClips[matchedClips.length - 1].startTime + matchedClips[matchedClips.length - 1].duration;
              
              const vNodesForScene = sceneToVideosMap[sceneId];
              // Sort by Y position to roughly match the order they were placed
              vNodesForScene.sort((a, b) => a.position.y - b.position.y);

              const defaultDuration = 5.0; // Default fallback duration
              let currentVideoStart = sceneStartTime;

              vNodesForScene.forEach((vNode: any, index: number) => {
                 let duration = defaultDuration;
                 // If it's the last video, try to stretch it to cover the remaining scene length
                 if (index === vNodesForScene.length - 1 && currentVideoStart + duration < sceneEndTime) {
                     duration = sceneEndTime - currentVideoStart;
                 }

                 newVideoClips.push({
                   id: `video_${vNode.id}_${Date.now()}_${index}`,
                   lineId: lineIds[0],
                   videoUrl: vNode.data.videoUrl,
                   startTime: currentVideoStart,
                   duration: duration
                 });

                 currentVideoStart += duration;
                 count++;
              });
            }
          }
        });
      }
    } catch (e) {
      console.error("Lỗi khi đồng bộ từ Video Flow:", e);
    }
    
    // Fallback: sync từ script (cách cũ) nếu có
    script.forEach(line => {
      if (line.video_url && !newVideoClips.some(vc => vc.lineId === line.id)) {
        const audioClip = timelineClips.find(c => c.lineId === line.id);
        if (audioClip) {
          newVideoClips.push({
            id: `video_${line.id}_${Date.now()}`,
            lineId: line.id,
            videoUrl: line.video_url,
            startTime: audioClip.startTime,
            duration: audioClip.duration
          });
          count++;
        }
      }
    });
    
    setTimelineVideoClips(newVideoClips);
    toast.success(`Đã đồng bộ ${count} Video vào Timeline thành công!`);
  };

  const uniqueSpeakers = Array.from(new Set(script.map(line => line.speaker.toLowerCase())));

  const selectedLine = script.find(l => l.selected);
  const selectedVideoClip = selectedTimelineVideoClipId ? timelineVideoClips.find(c => c.id === selectedTimelineVideoClipId) : timelineVideoClips.find(c => c.lineId === selectedLine?.id);
  const selectedAudioClip = selectedTimelineAudioClipId ? timelineClips.find(c => c.id === selectedTimelineAudioClipId) : timelineClips.find(c => c.lineId === selectedLine?.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30 flex flex-col">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' } }} />
      
            <Header 
        handleImportProject={handleImportProject}
        exportProject={exportProject}
        handleFileUpload={handleFileUpload}
        handleRenderAll={handleRenderAll}
        handleMixAndExport={handleMixAndExport}
        handleSyncToTimeline={handleSyncToTimeline}
        isGenerating={isGenerating}
      />


      {activeTab === 'audio' && (
      <ScriptSidebar
        addLine={addLine}
        deleteLine={deleteLine}
        playSample={playSample}
        handleDragOverContainer={handleDragOverContainer}
        handleSort={handleSort}
        createSyntheticVoice={createSyntheticVoice}
        togglePlayVoiceRef={togglePlayVoiceRef}
        handleSaveProfile={handleSaveProfile}
        isSortingMode={isSortingMode}
        setIsSortingMode={setIsSortingMode}
        playingId={playingId}
        isCreatingSynthetic={isCreatingSynthetic}
        playingVoiceRef={playingVoiceRef}
        expandedScriptLines={expandedScriptLines}
        toggleScriptLine={toggleScriptLine}
        expandedVoices={expandedVoices}
        toggleVoice={toggleVoice}
        timelineScrollRef={timelineScrollRef}
        dragItem={dragItem}
        dragOverItem={dragOverItem}
      />
      )}

      {(activeTab === 'audio' || activeTab === 'post-production') && (
        <Timeline
          toggleTimelinePlay={toggleTimelinePlay}
          handleTimelineSeek={handleTimelineSeek}
          handleClearTimeline={handleClearTimeline}
          handleTimelineClipMouseDown={handleTimelineClipMouseDown}
          handleVideoClipMouseDown={handleVideoClipMouseDown}
          handleVideoResizeMouseDown={handleVideoResizeMouseDown}
          handleDeleteTimelineClip={handleDeleteTimelineClip}
          handleTimelineResizeStart={handleTimelineResizeStart}
          timelineScrollRef={timelineScrollRef}
          timelineAudioRefs={timelineAudioRefs}
          timelineVideoRefs={timelineVideoRefs}
        >
          {activeTab === 'post-production' && (
            <div className="flex-[1.5] flex min-h-[300px] border-b border-slate-800 bg-slate-950">
              <div className="flex-1 flex flex-col items-center justify-center relative bg-black/80 p-6">
                <div className="w-full max-w-4xl aspect-video bg-black rounded-xl border border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-white/5">
                  {timelineVideoClips.length === 0 ? (
                    <>
                      <Video className="w-12 h-12 text-slate-700 mb-3 opacity-50" />
                      <span className="text-slate-500 font-medium tracking-widest text-sm uppercase">Video Preview</span>
                      <span className="text-slate-600 text-xs mt-1">Sync video from Video Studio</span>
                    </>
                  ) : (
                    <>
                      {timelineVideoClips.map(clip => (
                        <video
                          key={clip.id}
                          ref={el => { if (el) timelineVideoRefs.current[clip.id] = el; }}
                          src={clip.videoUrl}
                          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-100 ${
                            timelineTime >= clip.startTime && timelineTime < clip.startTime + clip.duration 
                              ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                          }`}
                          muted={!clip.keepSound}
                          loop={false}
                          playsInline
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
              <PropertiesInspector />
            </div>
          )}
        </Timeline>
      )}

      {activeTab === 'video' && (
        <div className="mt-4 mx-auto px-4 w-full max-w-[1600px] flex-1">
          <VideoStudio 
            script={script} 
            setScript={setScript} 
            charactersMetadata={charactersMetadata}
            setCharactersMetadata={setCharactersMetadata}
            flowkitProjectId={flowkitProjectId}
            setFlowkitProjectId={setFlowkitProjectId}
            handleUploadCharacterImage={handleUploadCharacterImage}
            handleGenerateAssetImage={handleGenerateAssetImage}
            handleDeleteEntity={handleDeleteEntity}
            isGeneratingAsset={isGeneratingAsset}
          />
        </div>
      )}
    </div>
  );
}

export default App;
