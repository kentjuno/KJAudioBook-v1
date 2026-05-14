import React, { useState, useRef, useEffect } from 'react';
import { Settings, Play, Pause, Download, Mic, Plus, FileText, Upload, Volume2, Trash2, Loader2, Save, FolderOpen, Copy, CheckCircle, ArrowUpDown, GripVertical, X, ChevronDown, ChevronUp, Image as ImageIcon, Video, User, Wand2 } from 'lucide-react';
import axios from 'axios';
import VideoStudio from './VideoStudio';

// Mock data for initial UI state
const initialScript = [
  { id: 0, speaker: 'narration', text: 'Tiếng gầm thét của "Lõi Ý thức" không giống với bất kỳ âm thanh cơ khí nào.' },
  { id: 1, speaker: 'kael', text: 'Vậy tôi phải làm gì? Nó sắp tan vỡ hoàn toàn!' },
  { id: 2, speaker: 'elara', text: 'Cậu không thể là người "làm" mọi việc. Cậu phải là người "hướng dẫn".' },
];

export interface ScriptLine {
  id: number;
  speaker: string;
  visual_references?: string[]; // IDs của entity dùng làm reference (có thể nhiều hơn 1)
  text: string;
  image_prompt?: string;
  motion_prompt?: string; // Motion prompt cho AI Video
  video_url?: string; // URL của video sau khi render
  is_image_generated?: boolean;
  selected?: boolean;
}

export interface TimelineClip {
  id: string;          // Dùng để react key, vd: `line_1_1234`
  lineId: number;
  speaker: string;
  audioUrl: string;
  filename: string;
  track: number;
  startTime: number;
  duration: number;
}

interface TimelineVideoClip {
  id: string;
  lineId: number;
  videoUrl: string;
  startTime: number;
  duration: number;
  trimStart?: number;
  keepSound?: boolean;
  volume?: number;
}

interface VoiceParams {
  gender: string;
  age: string;
  pitch: string;
}

interface RenderProgress {
  status: 'idle' | 'rendering' | 'assembling' | 'done' | 'error';
  currentLine: number;
  totalLines: number;
  finalAudioUrl: string | null;
}

export interface CharacterMetadata {
  type: string;
  name: string;
  description: string;
  image_prompt: string;
  local_image_path: string;
  media_id: string | null;
  last_uploaded_at: number;
  references?: string[];
  variations?: any[];
  variation_context?: string;
}

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
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'post-production'>(() => {
    return (localStorage.getItem('audiobook_active_tab') as 'audio' | 'video' | 'post-production') || 'audio';
  });
  const [activeVideoNodeLineIds, setActiveVideoNodeLineIds] = useState<number[]>([]);
  const [script, setScript] = useState<ScriptLine[]>(() => {
    const saved = localStorage.getItem('audiobook_script');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialScript;
      }
    }
    return initialScript;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isCreatingSynthetic, setIsCreatingSynthetic] = useState<string | null>(null);
  const [speakerVoiceParams, setSpeakerVoiceParams] = useState<Record<string, VoiceParams>>(() => {
    const saved = localStorage.getItem('audiobook_voice_params');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [renderProgress, setRenderProgress] = useState<RenderProgress>({ status: 'idle', currentLine: 0, totalLines: 0, finalAudioUrl: null });

  const [lockedVoices, setLockedVoices] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('audiobook_locked_voices');
    return saved ? JSON.parse(saved) : {};
  });

  const [playingVoiceRef, setPlayingVoiceRef] = useState<string | null>(null);

  const [expandedScriptLines, setExpandedScriptLines] = useState<Set<number>>(new Set());
  const [expandedVoices, setExpandedVoices] = useState<Set<string>>(new Set());

  // FlowKit Visual State
  const [isExtractingEntities, setIsExtractingEntities] = useState<boolean>(false);
  const [globalArtStyle, setGlobalArtStyle] = useState<string>(() => {
    return localStorage.getItem('audiobook_global_art_style') || '';
  });

  const [isGeneratingAsset, setIsGeneratingAsset] = React.useState<string | null>(null);
  const [charactersMetadata, setCharactersMetadata] = useState<Record<string, CharacterMetadata>>({});
  
  // Trạng thái các Video đang Render
  const [renderingVideos, setRenderingVideos] = useState<Record<number, string>>({}); // scene_id -> operation_name
  const [videoStatus, setVideoStatus] = useState<Record<number, string>>({}); // scene_id -> text
  
  // Google Labs Project ID
  const [flowkitProjectId, setFlowkitProjectId] = useState<string>("a59651a1-70ff-44b6-ac42-c26d90ad28ef");
  
  // Tự động load metadata khi mở web
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metaRes, profileRes] = await Promise.all([
          axios.get('http://localhost:8000/api/characters-metadata'),
          axios.get('http://localhost:8000/api/project-profile')
        ]);
        setCharactersMetadata(metaRes.data);
        
        if (profileRes.data && Object.keys(profileRes.data).length > 0) {
          if (profileRes.data.speakerVoiceParams) setSpeakerVoiceParams(profileRes.data.speakerVoiceParams);
          if (profileRes.data.lockedVoices) setLockedVoices(profileRes.data.lockedVoices);
          if (profileRes.data.flowkitProjectId) setFlowkitProjectId(profileRes.data.flowkitProjectId);
        }
      } catch (e) {
        console.error("Lỗi khi load metadata/profile", e);
      }
    };
    loadMetadata();
  }, []);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<number | null>(null);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState<number | null>(null);
  const [isEnhancingMotion, setIsEnhancingMotion] = useState<number | null>(null);

  const handleRegenPrompt = async (lineId: number, text: string, visualReferences: string[], index: number) => {
    setIsRegeneratingPrompt(lineId);
    try {
      const prevContext = index > 0 ? script[index - 1].text : "";
      const refIds = visualReferences.map(r => r.toLowerCase());
      const res = await axios.post('http://localhost:8000/api/regen-visual-prompt', {
        line_text: text,
        context_text: prevContext,
        visual_references: refIds
      });
      if (res.data.status === 'success') {
        const newScript = [...script];
        newScript[index].image_prompt = res.data.prompt;
        setScript(newScript);
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tạo lại prompt.");
    } finally {
      setIsRegeneratingPrompt(null);
    }
  };

  const toggleScriptLine = (id: number, e: React.MouseEvent) => {
    // Only toggle if not clicking on interactive elements
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

  // Timeline Resize State
  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = localStorage.getItem('audiobook_timeline_height');
    return saved ? parseInt(saved) : 256;
  });

  const handleTimelineResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const startY = e.clientY;
    const startHeight = timelineHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight - 100, startHeight + deltaY));
      setTimelineHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    localStorage.setItem('audiobook_timeline_height', timelineHeight.toString());
  }, [timelineHeight]);

  // Drag and Drop (Sắp xếp) state cho Script
  const [isSortingMode, setIsSortingMode] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Timeline Editor state
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>(() => {
    const saved = localStorage.getItem('audiobook_timeline_clips');
    return saved ? JSON.parse(saved) : [];
  });
  const [timelineVideoClips, setTimelineVideoClips] = useState<TimelineVideoClip[]>(() => {
    const saved = localStorage.getItem('audiobook_timeline_video_clips');
    return saved ? JSON.parse(saved) : [];
  });
  const [zoomLevel, setZoomLevel] = useState(50);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Timeline Drag & Drop state
  const [draggingTimelineClipId, setDraggingTimelineClipId] = useState<string | null>(null);
  const [timelineDragStartX, setTimelineDragStartX] = useState<number>(0);
  const [timelineDragStartY, setTimelineDragStartY] = useState<number>(0);
  const [timelineDragStartStartTime, setTimelineDragStartStartTime] = useState<number>(0);
  const [timelineDragStartTrack, setTimelineDragStartTrack] = useState<number>(0);

  // Timeline Video Drag & Resize state
  const [draggingVideoClipId, setDraggingVideoClipId] = useState<string | null>(null);
  const [resizingVideoClipId, setResizingVideoClipId] = useState<string | null>(null);
  const [videoResizeEdge, setVideoResizeEdge] = useState<'left' | 'right' | null>(null);
  const [videoDragStartDuration, setVideoDragStartDuration] = useState<number>(0);
  const [videoDragStartTrimStart, setVideoDragStartTrimStart] = useState<number>(0);
  const [selectedTimelineVideoClipId, setSelectedTimelineVideoClipId] = useState<string | null>(null);
  const [selectedTimelineAudioClipId, setSelectedTimelineAudioClipId] = useState<string | null>(null);

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

  // Timeline Playback state
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0);
  const timelineAudioRefs = useRef<{[id: string]: HTMLAudioElement}>({});
  const timelineVideoRefs = useRef<{[id: string]: HTMLVideoElement}>({});
  const animationRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number | undefined>(undefined);

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
    setIsPlayingTimeline(!isPlayingTimeline);
  };

  const toggleTimelinePlayRef = useRef(toggleTimelinePlay);
  const seekTimelineToRef = useRef(seekTimelineTo);
  const timelineTimeRef = useRef(timelineTime);

  useEffect(() => {
    toggleTimelinePlayRef.current = toggleTimelinePlay;
    seekTimelineToRef.current = seekTimelineTo;
    timelineTimeRef.current = timelineTime;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimelinePlayRef.current();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTimelineToRef.current(timelineTimeRef.current + 0.5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTimelineToRef.current(Math.max(0, timelineTimeRef.current - 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isPlayingTimeline) {
      lastUpdateRef.current = performance.now();
      
      const updateTimeline = () => {
        const now = performance.now();
        const deltaSeconds = (now - (lastUpdateRef.current || now)) / 1000;
        lastUpdateRef.current = now;
        
        setTimelineTime(prevTime => {
          const newTime = prevTime + deltaSeconds;
          
          // Check for clips to play
          timelineClips.forEach(clip => {
            // Nếu con trỏ vừa lướt qua startTime của clip
            if (prevTime <= clip.startTime && newTime > clip.startTime) {
              const audio = timelineAudioRefs.current[clip.id];
              if (audio) {
                audio.currentTime = 0;
                audio.play().catch(e => console.log("Play error", e));
              }
            }
          });

          // Check for video clips to play
          timelineVideoClips.forEach(clip => {
            if (prevTime <= clip.startTime && newTime > clip.startTime) {
              const video = timelineVideoRefs.current[clip.id];
              if (video) {
                video.currentTime = clip.trimStart || 0;
                video.play().catch(e => console.log("Video Play error", e));
              }
            }
          });
          
          return newTime;
        });
        
        animationRef.current = requestAnimationFrame(updateTimeline);
      };
      
      animationRef.current = requestAnimationFrame(updateTimeline);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Pause all audio
      Object.values(timelineAudioRefs.current).forEach(audio => {
        if (audio) audio.pause();
      });
      // Pause all video
      Object.values(timelineVideoRefs.current).forEach(video => {
        if (video) video.pause();
      });
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlayingTimeline, timelineClips]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lưu state vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem('audiobook_script', JSON.stringify(script));
    localStorage.setItem('audiobook_locked_voices', JSON.stringify(lockedVoices));
    localStorage.setItem('audiobook_voice_params', JSON.stringify(speakerVoiceParams));
    localStorage.setItem('audiobook_timeline_clips', JSON.stringify(timelineClips));
    localStorage.setItem('audiobook_timeline_video_clips', JSON.stringify(timelineVideoClips));
  }, [script, lockedVoices, speakerVoiceParams, timelineClips, timelineVideoClips]);

  useEffect(() => {
    localStorage.setItem('audiobook_active_tab', activeTab);
  }, [activeTab]);

  const exportProject = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(script, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "audiobook_project.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setScript(json);
          setTimelineClips([]);
          setTimelineTime(0);
        }
      } catch (err) {
        alert("Lỗi: File JSON không hợp lệ!");
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearTimeline = () => {
    if (window.confirm("Bạn có chắc muốn xóa sạch Timeline (DAW) không?")) {
      setTimelineClips([]);
      setTimelineTime(0);
    }
  };

  const handleMixAndExport = async () => {
    if (timelineClips.length === 0) {
      alert("Không có clip nào trên Timeline!");
      return;
    }
    
    setRenderProgress({ status: 'assembling', currentLine: 0, totalLines: 0, finalAudioUrl: null });
    try {
      const audioPayload = timelineClips.map(c => ({
        filename: c.filename,
        startTime: c.startTime,
        track: c.track
      }));

      const hasVideo = timelineVideoClips.length > 0;
      let url = 'http://localhost:8000/api/mix-timeline';
      let payload: any = { clips: audioPayload };
      let downloadName = 'final_audiobook_mix.mp3';

      if (hasVideo) {
        url = 'http://localhost:8000/api/mix-video-timeline';
        payload = {
          audio_clips: audioPayload,
          video_clips: timelineVideoClips.map(c => ({
            videoUrl: c.videoUrl,
            startTime: c.startTime,
            duration: c.duration,
            keepSound: c.keepSound || false,
            volume: c.volume ?? 100
          }))
        };
        downloadName = 'final_audiobook_video.mp4';
      }

      const res = await axios.post(url, payload, { responseType: 'blob' });
      const outUrl = URL.createObjectURL(new Blob([res.data]));
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", outUrl);
      downloadAnchorNode.setAttribute("download", downloadName);
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      setRenderProgress({ status: 'done', currentLine: 0, totalLines: 0, finalAudioUrl: outUrl });
    } catch (e) {
      console.error("Lỗi Mix:", e);
      alert("Lỗi khi Mix Timeline!");
      setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
    }
  };

  const handleRenderAll = async () => {
    // Ưu tiên render các dòng được chọn. Nếu không chọn dòng nào thì coi như render tất cả.
    const hasSelection = script.some(line => line.selected);
    const linesToRender = hasSelection ? script.filter(line => line.selected) : script;

    if (linesToRender.length === 0) {
      alert("Không có dòng nào để render!");
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
        alert("Lỗi khi render câu thoại: " + line.text);
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
      alert("Lỗi khi ghép file audio!");
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
      alert(response.data.message || "Tạo giọng ảo thành công! Đã khoá voice profile.");
      setLockedVoices(prev => ({ ...prev, [speaker]: true }));
    } catch (error) {
      console.error(error);
      alert("Lỗi tạo giọng ảo. Hãy kiểm tra console Backend.");
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
        alert("Đã trích xuất xong Danh sách Nhân Vật & Bối Cảnh!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi trích xuất thực thể. Vui lòng check console.");
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
      alert("Đã lưu toàn bộ thiết lập Voice Casting và Project ID thành công! Bạn có thể dùng lại cho Chapter sau.");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu thiết lập!");
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
          alert("Video render xong! Bạn có thể xem ngay bằng cách bấm vào Preview ở Script.");
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
      alert("Vui lòng nhập mô tả motion cơ bản trước khi Enhance!");
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
      alert("Lỗi khi enhance motion prompt!");
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
        alert("Đã gửi lệnh Render Video lên FlowKit thành công! Đang xử lý dưới nền.");
        if (res.data.operation_name) {
          setRenderingVideos(prev => ({...prev, [lineId]: res.data.operation_name}));
          setVideoStatus(prev => ({...prev, [lineId]: "Đang Render (Chờ 3-5 phút)..."}));
        }
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail;
      alert(detail ? detail : "Lỗi khi tạo video. Hãy kiểm tra FlowKit Extension hoặc Backend.");
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
      alert("Lỗi upload ảnh nhân vật!");
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
      alert("Lỗi khi xoá thực thể!");
    }
  };

  const handleGenerateAssetImage = async (characterId: string, prompt: string) => {
    if (!prompt) return alert("Không có prompt để tạo ảnh.");
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
        alert("Lưu ảnh thất bại!");
      }
      setIsGeneratingAsset(null);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi gọi API: " + err.message);
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
      alert("Lỗi khi gọi OmniVoice Backend.");
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
      alert("Không tìm thấy file giọng mẫu. Hãy tạo lại Diễn Viên Ảo.");
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
          setScript(response.data.script);
          setTimelineClips([]);
          setTimelineTime(0);
        }
      } catch (error) {
        console.error("Lỗi khi tạo kịch bản:", error);
        alert("Có lỗi xảy ra khi gọi AI. Vui lòng check console Backend.");
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
    alert(`Đã đồng bộ ${count} Video vào Timeline thành công!`);
  };

  const uniqueSpeakers = Array.from(new Set(script.map(line => line.speaker.toLowerCase())));

  const selectedLine = script.find(l => l.selected);
  const selectedVideoClip = selectedTimelineVideoClipId ? timelineVideoClips.find(c => c.id === selectedTimelineVideoClipId) : timelineVideoClips.find(c => c.lineId === selectedLine?.id);
  const selectedAudioClip = selectedTimelineAudioClipId ? timelineClips.find(c => c.id === selectedTimelineAudioClipId) : timelineClips.find(c => c.lineId === selectedLine?.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30 flex flex-col">
      
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AudioBook Studio
            </h1>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex space-x-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'audio'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4 h-4" /> Audio Studio
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'video'
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-4 h-4" /> Video Studio
            </button>
            <button
              onClick={() => { setActiveTab('post-production'); localStorage.setItem('audiobook_active_tab', 'post-production'); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'post-production'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" /> Post-Production
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab === 'audio' && (
              <>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  ref={importInputRef}
                  onChange={handleImportProject}
                />
                <button 
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Load kịch bản (JSON)"
                >
                  <FolderOpen className="w-4 h-4" /> Load JSON
                </button>

                <button 
                  onClick={exportProject}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-r border-slate-700 pr-4 mr-1"
                  title="Lưu kịch bản (JSON)"
                >
                  <Save className="w-4 h-4" /> Save JSON
                </button>

                <input 
                  type="file" 
                  accept=".md,.txt" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isGenerating ? "Đang nhờ AI..." : "Upload .md"}
                </button>

                <button 
                  onClick={handleRenderAll}
                  disabled={renderProgress.status === 'rendering' || renderProgress.status === 'assembling' || isGenerating}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {renderProgress.status === 'rendering' || renderProgress.status === 'assembling' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  {renderProgress.status === 'rendering' 
                    ? `Đang Render (${renderProgress.currentLine}/${renderProgress.totalLines})` 
                    : renderProgress.status === 'assembling' 
                    ? "Đang Ghép Nối..." 
                    : script.some(l => l.selected) 
                      ? `Render Selected (${script.filter(l => l.selected).length})` 
                      : "Render All"}
                </button>
              </>
            )}

            {activeTab === 'post-production' && (
              <>
                {renderProgress.status === 'done' && renderProgress.finalAudioUrl && (
                  <a 
                    href={renderProgress.finalAudioUrl}
                    download={timelineVideoClips.length > 0 ? "Final_Audiobook_Video.mp4" : "Final_Audiobook.mp3"}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors animate-pulse"
                  >
                    <Download className="w-4 h-4" />
                    {timelineVideoClips.length > 0 ? "Tải Video Về" : "Tải Audio Về"}
                  </a>
                )}
                <button 
                  onClick={handleMixAndExport}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Mix & Export
                </button>
              </>
            )}

            {activeTab === 'video' && (
              <button 
                onClick={() => { handleSyncToTimeline(); setActiveTab('post-production'); localStorage.setItem('audiobook_active_tab', 'post-production'); }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Video className="w-4 h-4 fill-current" />
                Sync To Timeline
              </button>
            )}
          </div>
        </div>
      </header>


      {activeTab === 'audio' && (

      <main 
        className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10"
        style={{ paddingBottom: `${timelineHeight + 32}px` }}
      >
        
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Kịch Bản (Script Editor)
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                  checked={script.length > 0 && script.every(l => l.selected)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setScript(script.map(l => ({ ...l, selected: checked })));
                  }}
                />
                Chọn Tất Cả
              </label>
              <button 
                onClick={() => setIsSortingMode(!isSortingMode)}
                className={`text-sm flex items-center gap-1 transition-colors px-2 py-1 rounded-md ${isSortingMode ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <ArrowUpDown className="w-4 h-4" /> {isSortingMode ? "Đang Sắp Xếp (Tắt)" : "Sắp Xếp"}
              </button>
              <button 
                onClick={addLine}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-500/10 px-2 py-1 rounded-md hover:bg-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Thêm dòng
              </button>
            </div>
          </div>

          <div className="space-y-4" onDragOver={handleDragOverContainer}>
            {script.map((line, index) => (
              <div 
                key={line.id} 
                id={`script-line-${line.id}`}
                draggable={isSortingMode}
                onDragStart={(e) => {
                  if (isSortingMode) dragItem.current = index;
                }}
                onDragEnter={(e) => {
                  if (isSortingMode) dragOverItem.current = index;
                }}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className={`group relative border rounded-xl p-4 transition-all duration-300 ${isSortingMode ? 'cursor-move border-amber-500/50 hover:bg-amber-900/10' : ''} ${activeVideoNodeLineIds.includes(line.id) ? 'bg-emerald-900/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]' : line.selected && !isSortingMode ? 'bg-indigo-900/30 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-[1.01]' : 'bg-slate-900 border-slate-800'} ${!isSortingMode && !line.selected && !activeVideoNodeLineIds.includes(line.id) ? 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10' : ''}`}
              >
                {isSortingMode && (
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-amber-500/50">
                    <GripVertical className="w-6 h-6" />
                  </div>
                )}
                <div className={`absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 ${isSortingMode ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 font-mono shadow-sm">
                    {index + 1}
                  </div>
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                    checked={line.selected || false}
                    onChange={(e) => {
                      const newScript = [...script];
                      newScript[index].selected = e.target.checked;
                      setScript(newScript);
                    }}
                  />
                </div>
                
                {/* Header Compact View */}
                <div 
                  className="ml-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1"
                  onClick={(e) => {
                    toggleScriptLine(line.id, e);
                    
                    // Cuộn timeline đến vị trí clip
                    const clip = timelineClips.find(c => c.lineId === line.id);
                    if (clip && timelineScrollRef.current) {
                      const leftPos = clip.startTime * zoomLevel;
                      timelineScrollRef.current.scrollTo({
                        left: Math.max(0, leftPos - timelineScrollRef.current.clientWidth / 2 + 100),
                        behavior: 'smooth'
                      });
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 shrink-0 min-w-[80px]">
                      {line.speaker}
                    </span>
                    <span className="text-sm text-slate-300 truncate max-w-full sm:max-w-md opacity-80">
                      {line.text || "..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    {expandedScriptLines.has(line.id) || isSortingMode ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 pointer-events-none" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Body Expanded View */}
                <div className={`ml-4 overflow-hidden transition-all duration-300 ${expandedScriptLines.has(line.id) || isSortingMode ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800/50">
                    <div className="w-full sm:w-48 shrink-0 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Speaker (Voice)</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                          value={line.speaker.toLowerCase()}
                          onChange={(e) => {
                            const newScript = [...script];
                            newScript[index].speaker = e.target.value;
                            if (!newScript[index].visual_references || newScript[index].visual_references.length === 0 || (newScript[index].visual_references.length === 1 && newScript[index].visual_references[0] === line.speaker)) {
                                newScript[index].visual_references = [e.target.value];
                            }
                            setScript(newScript);
                          }}
                        >
                          <option value="narration">🎙️ Narration</option>
                          {Object.entries(charactersMetadata).filter(([_, c]) => c.type === 'character').map(([id, c]) => (
                            <option key={id} value={id}>👨 {c.name}</option>
                          ))}
                          {Object.entries(charactersMetadata).filter(([id, c]) => c.type === 'character' || id === 'narration').find(([id, _]) => id === line.speaker.toLowerCase()) ? null : (
                            <option value={line.speaker.toLowerCase()}>❓ {line.speaker}</option>
                          )}
                        </select>
                      </div>

                    </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Lời thoại</label>
                      <select 
                        className="text-xs bg-slate-800 border border-slate-700 rounded text-indigo-300 py-1 px-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        onChange={(e) => {
                          const tag = e.target.value;
                          if (!tag) return;
                          
                          const textarea = document.getElementById(`textarea-${line.id}`) as HTMLTextAreaElement;
                          const newScript = [...script];
                          
                          if (textarea) {
                            const startPos = textarea.selectionStart;
                            const endPos = textarea.selectionEnd;
                            const textBefore = line.text.substring(0, startPos);
                            const textAfter = line.text.substring(endPos);
                            
                            // Insert space if needed
                            const padLeft = (textBefore.length > 0 && !textBefore.endsWith(' ')) ? ' ' : '';
                            const padRight = (textAfter.length > 0 && !textAfter.startsWith(' ')) ? ' ' : '';
                            const textToInsert = padLeft + tag + padRight;
                            
                            newScript[index].text = textBefore + textToInsert + textAfter;
                            setScript(newScript);
                            
                            // Return focus and cursor position after React re-renders
                            setTimeout(() => {
                              textarea.focus();
                              const newPos = startPos + textToInsert.length;
                              textarea.setSelectionRange(newPos, newPos);
                            }, 0);
                          } else {
                            // Fallback
                            newScript[index].text = line.text + (line.text.endsWith(' ') ? '' : ' ') + tag;
                            setScript(newScript);
                          }
                          
                          e.target.value = ""; // Reset dropdown
                        }}
                      >
                        <option value="">+ Chèn cảm xúc...</option>
                        <option value="[laughter]">😂 Cười gằn [laughter]</option>
                        <option value="[sigh]">😮‍💨 Thở dài [sigh]</option>
                        <option value="[surprise-ah]">😲 Ngạc nhiên A! [surprise-ah]</option>
                        <option value="[surprise-oh]">😯 Ngạc nhiên Ồ! [surprise-oh]</option>
                        <option value="[surprise-wa]">🤯 Bất ngờ Oa! [surprise-wa]</option>
                        <option value="[question-en]">🤔 Thắc mắc Hả? [question-en]</option>
                        <option value="[dissatisfaction-hnn]">😒 Bực dọc Hừ! [dissatisfaction-hnn]</option>
                      </select>
                    </div>
                    <textarea 
                      id={`textarea-${line.id}`}
                      className="w-full bg-transparent text-slate-300 resize-none outline-none leading-relaxed mt-2 p-3 rounded-lg border border-transparent hover:border-slate-700/50 focus:border-indigo-500/50 focus:bg-slate-800/50 transition-all text-sm sm:text-base"
                      rows={3}
                      value={line.text}
                      onChange={(e) => {
                        const newScript = [...script];
                        newScript[index].text = e.target.value;
                        setScript(newScript);
                      }}
                    />

                  </div>
                  
                  <div className="flex sm:flex-col justify-end gap-2 shrink-0 items-center">
                    {renderProgress.status === 'rendering' && renderProgress.currentLine === index + 1 && (
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    )}
                    {renderProgress.status === 'done' && (
                      <span className="text-emerald-400">✅</span>
                    )}
                    <button 
                      onClick={() => playSample(line.id, line.text, line.speaker)}
                      disabled={playingId !== null}
                      className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors disabled:opacity-50" 
                      title="Nghe thử dòng này"
                    >
                      {playingId === line.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => deleteLine(line.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors" 
                      title="Xoá dòng này"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pb-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-slate-100">Voice Casting</h2>
              </div>
              <button 
                onClick={handleSaveProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-xs font-medium"
                title="Lưu các thiết lập Giọng nói và Google Project ID"
              >
                <Save className="w-3.5 h-3.5" /> Lưu Cấu Hình
              </button>
            </div>
            
            <div className="space-y-5">
              {uniqueSpeakers.map(speaker => (
                <div key={speaker} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div 
                    className="flex justify-between items-center cursor-pointer hover:bg-slate-900/50 p-2 -m-2 rounded-lg transition-colors"
                    onClick={(e) => toggleVoice(speaker, e)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${speaker}`} alt={speaker} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 p-1" />
                      <h3 className="font-medium text-slate-200 capitalize text-lg">{speaker}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {lockedVoices[speaker] && (
                        <button 
                          onClick={() => togglePlayVoiceRef(speaker)}
                          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                            playingVoiceRef === speaker 
                              ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                              : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40'
                          }`}
                          title="Nghe giọng mẫu"
                        >
                          {playingVoiceRef === speaker ? (
                            <div className="w-2.5 h-2.5 bg-current rounded-sm animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border mt-1 ${
                        lockedVoices[speaker] 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {lockedVoices[speaker] ? '✅ Locked' : 'No Voice'}
                      </span>
                      {expandedVoices.has(speaker) ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 ml-2 pointer-events-none" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 ml-2 pointer-events-none" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Body */}
                  <div className={`overflow-hidden transition-all duration-300 ${expandedVoices.has(speaker) ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/50">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Giới tính</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.gender || "male"}
                          onChange={(e) => setSpeakerVoiceParams({...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || {age: 'middle-aged', pitch: 'low pitch'}), gender: e.target.value }})}
                        >
                          <option value="male">👨 Nam</option>
                          <option value="female">👩 Nữ</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Độ tuổi</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.age || "middle-aged"}
                          onChange={(e) => setSpeakerVoiceParams({...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || {gender: 'male', pitch: 'low pitch'}), age: e.target.value }})}
                        >
                          <option value="child">Trẻ em</option>
                          <option value="teenager">Thiếu niên</option>
                          <option value="young adult">Thanh niên</option>
                          <option value="middle-aged">Trung niên</option>
                          <option value="elderly">Cao tuổi</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Tone giọng</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.pitch || "low pitch"}
                          onChange={(e) => setSpeakerVoiceParams({...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || {gender: 'male', age: 'middle-aged'}), pitch: e.target.value }})}
                        >
                          <option value="very high pitch">Rất cao</option>
                          <option value="high pitch">Cao</option>
                          <option value="moderate pitch">Vừa</option>
                          <option value="low pitch">Trầm</option>
                          <option value="very low pitch">Rất trầm</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">Đổi File</button>
                      <button className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">Audio Editor</button>
                    </div>
                    <button 
                      onClick={() => createSyntheticVoice(speaker)}
                      disabled={isCreatingSynthetic === speaker}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border disabled:opacity-50 ${
                        lockedVoices[speaker]
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      {isCreatingSynthetic === speaker ? <Loader2 className="w-3 h-3 animate-spin" /> : (lockedVoices[speaker] ? "↻" : "+")} 
                      {lockedVoices[speaker] ? "Tạo Lại (Re-Lock)" : "Tạo Diễn Viên Ảo (Lock Voice)"}
                    </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </main>
      )}

      {(activeTab === 'audio' || activeTab === 'post-production') && (
      <div 
        className={activeTab === 'post-production' 
          ? "flex-1 relative bg-slate-900 shadow-2xl flex flex-col z-50 overflow-hidden w-full h-full" 
          : "fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 shadow-2xl flex flex-col z-50 transition-none"}
        style={activeTab === 'post-production' ? {} : { height: `${timelineHeight}px` }}
      >
        {/* Resize Handle */}
        {activeTab === 'audio' && (
          <div 
            className="absolute top-0 left-0 right-0 h-2 -mt-1 cursor-row-resize bg-transparent hover:bg-indigo-500/50 z-50"
            onMouseDown={handleTimelineResizeStart}
          />
        )}

        {/* Post-Production Workspace (Video Preview & Inspector) */}
        {activeTab === 'post-production' && (
          <div className="flex-[1.5] flex min-h-[300px] border-b border-slate-800 bg-slate-950">
            {/* Video Preview */}
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
            
            {/* Properties Inspector */}
            <div className="w-[340px] bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.2)] z-10">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-5">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Properties Inspector</h3>
              </div>
              {!selectedLine ? (
                <div className="text-xs text-slate-500 text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                    <Play className="w-5 h-5 text-slate-600" />
                  </div>
                  <span>Click a clip on the timeline<br/>to inspect and edit properties</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* General Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Line Info</h4>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500">Speaker</span>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{selectedLine.speaker}</span>
                      </div>
                      <p className="text-xs text-slate-300 italic line-clamp-3">"{selectedLine.text}"</p>
                    </div>
                  </div>

                  {/* Video Properties */}
                  {selectedVideoClip ? (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video Properties
                      </h4>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-300">Keep Original Sound</label>
                          <button 
                            onClick={() => {
                              setTimelineVideoClips(prev => prev.map(c => c.id === selectedVideoClip.id ? { ...c, keepSound: !c.keepSound } : c));
                            }}
                            className={`text-[10px] px-2 py-1 rounded transition-colors font-semibold ${selectedVideoClip.keepSound ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                          >
                            {selectedVideoClip.keepSound ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        
                        {selectedVideoClip.keepSound && (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-slate-300">Volume</label>
                              <span className="text-[10px] text-emerald-400 font-mono">{selectedVideoClip.volume ?? 100}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="200" 
                              value={selectedVideoClip.volume ?? 100}
                              onChange={(e) => {
                                setTimelineVideoClips(prev => prev.map(c => c.id === selectedVideoClip.id ? { ...c, volume: parseInt(e.target.value) } : c));
                              }}
                              className="w-full accent-emerald-500 bg-slate-700 h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                            />
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-xs text-slate-300">Offset Time (s)</label>
                          <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               step="0.1" 
                               value={selectedVideoClip.startTime.toFixed(1)}
                               onChange={(e) => {
                                 const val = parseFloat(e.target.value);
                                 if (!isNaN(val)) {
                                   setTimelineVideoClips(prev => prev.map(c => c.id === selectedVideoClip.id ? { ...c, startTime: val } : c));
                                 }
                               }}
                               className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 w-full font-mono"
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 text-center">
                      <span className="text-xs text-amber-500/70">No video clip linked to this line.</span>
                    </div>
                  )}

                  {/* Audio Properties */}
                  {selectedAudioClip && (
                    <div>
                      <h4 className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Audio Properties
                      </h4>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-xs text-slate-300">Offset Time (s)</label>
                          <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               step="0.1" 
                               value={selectedAudioClip.startTime.toFixed(1)}
                               onChange={(e) => {
                                 const val = parseFloat(e.target.value);
                                 if (!isNaN(val)) {
                                   setTimelineClips(prev => prev.map(c => c.id === selectedAudioClip.id ? { ...c, startTime: val } : c));
                                 }
                               }}
                               className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 w-full font-mono"
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
            <button 
              onClick={toggleTimelinePlay}
              className={`p-1.5 rounded-full ${isPlayingTimeline ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-amber-400'}`}
            >
              {isPlayingTimeline ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
            </button>
            <div className="text-xs font-mono text-amber-400 bg-slate-900 px-2 py-1 rounded w-16 text-center border border-slate-700">
              {timelineTime.toFixed(1)}s
            </div>
            {activeTab === 'audio' && (
              <button 
                onClick={() => { setActiveTab('post-production'); localStorage.setItem('audiobook_active_tab', 'post-production'); }}
                className="ml-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-semibold rounded"
              >
                Sync to Post-Production
              </button>
            )}
            <button 
              onClick={handleClearTimeline}
              className="ml-2 px-3 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-semibold rounded border border-rose-500/20"
              title="Xóa toàn bộ Timeline"
            >
              Clear
            </button>
            <div className="flex items-center gap-1 ml-4 bg-slate-900 rounded border border-slate-700 px-2 py-1">
              <button onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))} className="text-slate-400 hover:text-amber-400">-</button>
              <span className="text-[10px] text-slate-500 w-8 text-center">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="text-slate-400 hover:text-amber-400">+</button>
            </div>
          </div>
        </div>

        {/* Timeline Tracks Container */}
        <div ref={timelineScrollRef} className="flex-1 overflow-auto relative bg-slate-900/50 p-2">
          {/* Ruler (Thước đo động) */}
          <div 
            className="h-6 border-b border-slate-700 mb-2 relative opacity-50 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={handleTimelineSeek}
            style={{ width: `${Math.max(20, ...timelineClips.map(c => c.startTime + c.duration)) * zoomLevel + 500}px` }}
          >
            {Array.from({ length: Math.ceil(Math.max(20, timelineClips.length > 0 ? Math.max(...timelineClips.map(c => c.startTime + c.duration)) : 0) / 2) + 10 }).map((_, i) => (
              <div key={i} className="absolute top-0 text-[10px] text-slate-500" style={{ left: `${i * 2 * zoomLevel}px` }}>
                {i * 2}s
              </div>
            ))}
          </div>

          {/* Các rãnh âm thanh và hình ảnh */}
          <div className="relative min-h-[150px]">
            {/* Video Track Background */}
            {activeTab === 'post-production' && (
              <div className="absolute top-0 left-0 right-0 h-16 border-b-2 border-indigo-500/30 flex items-center bg-indigo-900/10 opacity-60">
                <span className="absolute left-2 text-[10px] text-indigo-400 font-bold">Video Track</span>
              </div>
            )}

            {/* Audio Tracks Background */}
            {[0, 1, 2, 3].map(trackIndex => (
              <div key={`track-${trackIndex}`} className="absolute left-0 right-0 h-16 border-b border-slate-800 flex items-center opacity-20" style={{ top: `${(activeTab === 'post-production' ? 70 : 0) + trackIndex * 64}px` }}>
                <span className="absolute left-2 text-[10px] text-slate-500 font-bold">Track {trackIndex}</span>
              </div>
            ))}

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
              style={{ left: `${timelineTime * zoomLevel}px` }}
            >
              <div className="w-3 h-3 bg-red-500 -ml-[5px] -mt-1 rounded-sm shadow-md flex items-center justify-center"></div>
            </div>

            {/* Render Video Clips */}
            {activeTab === 'post-production' && timelineVideoClips.map((clip) => {
              const top = 0; // Video track is at 0
              const left = clip.startTime * zoomLevel;
              const width = clip.duration * zoomLevel;
              const isSelected = selectedTimelineVideoClipId === clip.id || (!selectedTimelineVideoClipId && !selectedTimelineAudioClipId && script.find(l => l.id === clip.lineId)?.selected);
              const isDragging = draggingVideoClipId === clip.id;

              return (
                <div 
                  key={clip.id}
                  className={`absolute h-14 rounded-md overflow-hidden transition-all duration-200 shadow-md cursor-move ${
                    isDragging ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-indigo-500/80 border-indigo-400' :
                    isSelected 
                      ? 'z-30 bg-indigo-500/90 border-2 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]' 
                      : 'z-20 bg-indigo-900/80 border border-indigo-400 hover:bg-indigo-800'
                  }`}
                  style={{ top: `${top + 4}px`, left: `${left}px`, width: `${width}px` }}
                  onMouseDown={(e) => handleVideoClipMouseDown(e, clip)}
                >
                  {/* Left Resize Handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-50 transition-colors group"
                    onMouseDown={(e) => handleVideoResizeMouseDown(e, clip, 'left')}
                  >
                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white/50 group-hover:bg-white rounded-full pointer-events-none"></div>
                  </div>

                  <div className={`px-1 py-0.5 text-[9px] font-bold truncate flex justify-between items-center relative z-10 ${isSelected ? 'text-indigo-50 bg-indigo-400/50' : 'text-indigo-200 bg-indigo-800/50'}`}>
                    <span className="flex items-center gap-1">
                      Video <span className="opacity-70 font-mono">({clip.duration.toFixed(1)}s)</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineVideoClips(prev => prev.filter(c => c.id !== clip.id));
                        }}
                        className="text-indigo-200 hover:text-red-400 bg-transparent p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* Thumbnail / Visual representation */}
                  <div className="w-full h-full mt-1 relative flex items-center justify-center pointer-events-none">
                     <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{backgroundImage: `url(http://localhost:8000/api/video/thumbnail?url=${encodeURIComponent(clip.videoUrl)})`}} />
                     <Video className="w-4 h-4 text-indigo-300 opacity-50 absolute" />
                  </div>

                  {/* Right Resize Handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-50 transition-colors group"
                    onMouseDown={(e) => handleVideoResizeMouseDown(e, clip, 'right')}
                  >
                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white/50 group-hover:bg-white rounded-full pointer-events-none"></div>
                  </div>
                </div>
              );
            })}

            {/* Render Audio Clips */}
            {timelineClips.map((clip) => {
              const top = (activeTab === 'post-production' ? 70 : 0) + clip.track * 64; // Offset audio tracks by 70px only in post-production
              const left = clip.startTime * zoomLevel;
              const width = clip.duration * zoomLevel;
              const isDragging = draggingTimelineClipId === clip.id;
              const isSelected = selectedTimelineAudioClipId === clip.id || (!selectedTimelineAudioClipId && !selectedTimelineVideoClipId && script.find(l => l.id === clip.lineId)?.selected);

              return (
                <div 
                  key={clip.id}
                  onMouseDown={(e) => handleTimelineClipMouseDown(e, clip)}
                  className={`absolute h-14 rounded-md overflow-hidden cursor-move transition-all duration-200 shadow-md ${
                    isDragging 
                      ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-amber-500/80 border-amber-400' 
                      : isSelected 
                        ? 'z-30 bg-indigo-500/90 border-2 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]' 
                        : 'z-10 bg-amber-500/80 border border-amber-400 hover:bg-amber-400'
                  }`}
                  style={{ top: `${top + 4}px`, left: `${left}px`, width: `${width}px` }}
                >
                  <div className={`px-1 py-0.5 text-[9px] font-bold truncate flex justify-between items-center ${isSelected ? 'text-indigo-50 bg-indigo-400/50' : 'text-slate-900 bg-amber-400/50'}`}>
                    <span>{clip.speaker}</span>
                    <button 
                      onClick={(e) => handleDeleteTimelineClip(e, clip.id)}
                      className={`${isSelected ? 'text-indigo-100 hover:text-red-300 hover:bg-indigo-500' : 'text-slate-900 hover:text-red-700 hover:bg-amber-400'} bg-transparent p-0.5 rounded transition-colors`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Waveform Real */}
                  <div className="w-full mt-1 opacity-70 flex items-center px-1">
                    <Waveform audioUrl={clip.audioUrl} width={width} />
                  </div>
                  {/* Audio Element Hidden */}
                  <audio 
                    src={clip.audioUrl} 
                    ref={el => {
                      if (el) timelineAudioRefs.current[clip.id] = el;
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
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
