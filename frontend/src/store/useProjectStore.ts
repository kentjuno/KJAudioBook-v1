// ==========================================================================
// store/useProjectStore.ts
// Global project state — script, timeline clips, voice settings, etc.
// Persisted to IndexedDB (via localForage) so state survives page refresh.
// ==========================================================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { ScriptLine, TimelineClip, TimelineVideoClip, VoiceParams, CharacterMetadata, RenderProgress } from '../types';

interface ProjectState {
  // ── Active tab ──────────────────────────────────────────────────────────
  activeTab: 'audio' | 'video' | 'post-production';
  setActiveTab: (tab: 'audio' | 'video' | 'post-production') => void;

  // ── Script ──────────────────────────────────────────────────────────────
  script: ScriptLine[];
  setScript: (script: ScriptLine[] | ((prev: ScriptLine[]) => ScriptLine[])) => void;

  // ── Timeline: Audio ─────────────────────────────────────────────────────
  timelineClips: TimelineClip[];
  setTimelineClips: (clips: TimelineClip[] | ((prev: TimelineClip[]) => TimelineClip[])) => void;

  // ── Timeline: Video ─────────────────────────────────────────────────────
  timelineVideoClips: TimelineVideoClip[];
  setTimelineVideoClips: (clips: TimelineVideoClip[] | ((prev: TimelineVideoClip[]) => TimelineVideoClip[])) => void;

  // ── Voice settings ───────────────────────────────────────────────────────
  lockedVoices: Record<string, boolean>;
  setLockedVoices: (voices: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;

  speakerVoiceParams: Record<string, VoiceParams>;
  setSpeakerVoiceParams: (params: Record<string, VoiceParams> | ((prev: Record<string, VoiceParams>) => Record<string, VoiceParams>)) => void;

  // ── Characters & Assets ──────────────────────────────────────────────────
  charactersMetadata: Record<string, CharacterMetadata>;
  setCharactersMetadata: (meta: Record<string, CharacterMetadata> | ((prev: Record<string, CharacterMetadata>) => Record<string, CharacterMetadata>)) => void;

  // ── Render progress ──────────────────────────────────────────────────────
  renderProgress: RenderProgress;
  setRenderProgress: (progress: RenderProgress | ((prev: RenderProgress) => RenderProgress)) => void;

  // ── Misc UI ─────────────────────────────────────────────────────────────
  flowkitProjectId: string;
  setFlowkitProjectId: (id: string) => void;

  globalArtStyle: string;
  setGlobalArtStyle: (style: string) => void;

  // ── Panel UI prefs ───────────────────────────────────────────────────────
  isVoicePanelCollapsed: boolean;
  setIsVoicePanelCollapsed: (collapsed: boolean) => void;
}

const initialScript: ScriptLine[] = [
  { id: 0, speaker: 'narration', text: 'Tiếng gầm thét của "Lõi Ý thức" không giống với bất kỳ âm thanh cơ khí nào.' },
  { id: 1, speaker: 'kael', text: 'Vậy tôi phải làm gì? Nó sắp tan vỡ hoàn toàn!' },
  { id: 2, speaker: 'elara', text: 'Cậu không thể là người "làm" mọi việc. Cậu phải là người "hướng dẫn".' },
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      // ── Active tab ───────────────────────────────────────────────────────
      activeTab: 'audio',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ── Script ──────────────────────────────────────────────────────────
      script: initialScript,
      setScript: (scriptOrUpdater) =>
        set((state) => ({
          script: typeof scriptOrUpdater === 'function' ? scriptOrUpdater(state.script) : scriptOrUpdater,
        })),

      // ── Timeline: Audio ─────────────────────────────────────────────────
      timelineClips: [],
      setTimelineClips: (clipsOrUpdater) =>
        set((state) => ({
          timelineClips: typeof clipsOrUpdater === 'function' ? clipsOrUpdater(state.timelineClips) : clipsOrUpdater,
        })),

      // ── Timeline: Video ─────────────────────────────────────────────────
      timelineVideoClips: [],
      setTimelineVideoClips: (clipsOrUpdater) =>
        set((state) => ({
          timelineVideoClips: typeof clipsOrUpdater === 'function' ? clipsOrUpdater(state.timelineVideoClips) : clipsOrUpdater,
        })),

      // ── Voice settings ───────────────────────────────────────────────────
      lockedVoices: {},
      setLockedVoices: (voicesOrUpdater) =>
        set((state) => ({
          lockedVoices: typeof voicesOrUpdater === 'function' ? voicesOrUpdater(state.lockedVoices) : voicesOrUpdater,
        })),

      speakerVoiceParams: {},
      setSpeakerVoiceParams: (paramsOrUpdater) =>
        set((state) => ({
          speakerVoiceParams: typeof paramsOrUpdater === 'function' ? paramsOrUpdater(state.speakerVoiceParams) : paramsOrUpdater,
        })),

      // ── Characters & Assets ──────────────────────────────────────────────
      charactersMetadata: {},
      setCharactersMetadata: (metaOrUpdater) =>
        set((state) => ({
          charactersMetadata: typeof metaOrUpdater === 'function' ? metaOrUpdater(state.charactersMetadata) : metaOrUpdater,
        })),

      // ── Render progress ──────────────────────────────────────────────────
      renderProgress: { status: 'idle', currentLine: 0, totalLines: 0, finalAudioUrl: null },
      setRenderProgress: (progressOrUpdater) =>
        set((state) => ({
          renderProgress: typeof progressOrUpdater === 'function' ? progressOrUpdater(state.renderProgress) : progressOrUpdater,
        })),

      // ── Misc UI ─────────────────────────────────────────────────────────
      flowkitProjectId: 'a59651a1-70ff-44b6-ac42-c26d90ad28ef',
      setFlowkitProjectId: (id) => set({ flowkitProjectId: id }),

      globalArtStyle: '',
      setGlobalArtStyle: (style) => set({ globalArtStyle: style }),

      // ── Panel UI prefs ────────────────────────────────────────────────
      isVoicePanelCollapsed: false,
      setIsVoicePanelCollapsed: (collapsed) => set({ isVoicePanelCollapsed: collapsed }),
    }),
    {
      name: 'audiobook-project',
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        script: state.script,
        timelineClips: state.timelineClips,
        timelineVideoClips: state.timelineVideoClips,
        lockedVoices: state.lockedVoices,
        speakerVoiceParams: state.speakerVoiceParams,
        flowkitProjectId: state.flowkitProjectId,
        globalArtStyle: state.globalArtStyle,
        isVoicePanelCollapsed: state.isVoicePanelCollapsed,
      }),
    }
  )
);
