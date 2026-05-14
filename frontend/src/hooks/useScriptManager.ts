// ==========================================================================
// hooks/useScriptManager.ts
// Script manipulation: export JSON, import JSON, clear timeline.
// These are pure utility functions wired to the shared script state.
// ==========================================================================
import toast from 'react-hot-toast';
import type { ScriptLine, TimelineClip } from '../types';

interface UseScriptManagerOptions {
  script: ScriptLine[];
  setScript: React.Dispatch<React.SetStateAction<ScriptLine[]>>;
  setTimelineClips: React.Dispatch<React.SetStateAction<TimelineClip[]>>;
  setTimelineTime: React.Dispatch<React.SetStateAction<number>>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useScriptManager({
  script,
  setScript,
  setTimelineClips,
  setTimelineTime,
  importInputRef,
}: UseScriptManagerOptions) {

  /** Export current script to a .json file */
  const exportProject = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(script, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', 'audiobook_project.json');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  /** Import a .json script file and reset the timeline */
  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          // Defensive: imported JSON may not have `id` on each line — backend requires it
          const withIds = json.map((line: any, idx: number) => ({
            ...line,
            id: typeof line.id === 'number' ? line.id : idx,
          }));
          setScript(withIds);
          setTimelineClips([]);
          setTimelineTime(0);
        }
      } catch {
        toast.error('Lỗi: File JSON không hợp lệ!');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  /** Confirm and wipe the timeline */
  const handleClearTimeline = () => {
    if (window.confirm('Bạn có chắc muốn xóa sạch Timeline (DAW) không?')) {
      setTimelineClips([]);
      setTimelineTime(0);
    }
  };

  return { exportProject, handleImportProject, handleClearTimeline };
}
