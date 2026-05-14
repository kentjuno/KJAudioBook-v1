// ==========================================================================
// components/script/ScriptSidebar.tsx
// Left 8/12 column: script editor (line list) + right 4/12: Voice Casting panel.
// Both panels are now in this component to keep the script + voice logic together.
// All shared state from Zustand; complex callbacks passed as props.
// ==========================================================================
import React, { useRef } from 'react';
import {
  Settings, Play, FileText, Volume2, Trash2, Loader2, Save,
  Copy, ArrowUpDown, GripVertical, ChevronDown, ChevronUp,
  PanelRightOpen, X,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import type { ScriptLine } from '../../types';

interface ScriptSidebarProps {
  // Script line actions
  addLine: () => void;
  deleteLine: (id: number) => void;
  playSample: (id: number, text: string, speaker: string) => void;
  handleDragOverContainer: (e: React.DragEvent) => void;
  handleSort: () => void;
  // Voice actions
  createSyntheticVoice: (speaker: string) => void;
  togglePlayVoiceRef: (speaker: string) => void;
  handleSaveProfile: () => void;
  // Local UI state (not global enough for store)
  isSortingMode: boolean;
  setIsSortingMode: (v: boolean) => void;
  playingId: number | null;
  isCreatingSynthetic: string | null;
  playingVoiceRef: string | null;
  expandedScriptLines: Set<number>;
  toggleScriptLine: (id: number, e: React.MouseEvent) => void;
  expandedVoices: Set<string>;
  toggleVoice: (speaker: string, e: React.MouseEvent) => void;
  // Refs
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
  dragItem: React.MutableRefObject<number | null>;
  dragOverItem: React.MutableRefObject<number | null>;
}

export function ScriptSidebar({
  addLine, deleteLine, playSample,
  handleDragOverContainer, handleSort,
  createSyntheticVoice, togglePlayVoiceRef, handleSaveProfile,
  isSortingMode, setIsSortingMode, playingId, isCreatingSynthetic,
  playingVoiceRef, expandedScriptLines, toggleScriptLine,
  expandedVoices, toggleVoice,
  timelineScrollRef, dragItem, dragOverItem,
}: ScriptSidebarProps) {
  const script              = useProjectStore(s => s.script);
  const setScript           = useProjectStore(s => s.setScript);
  const timelineClips       = useProjectStore(s => s.timelineClips);
  const speakerVoiceParams  = useProjectStore(s => s.speakerVoiceParams);
  const setSpeakerVoiceParams = useProjectStore(s => s.setSpeakerVoiceParams);
  const lockedVoices        = useProjectStore(s => s.lockedVoices);
  const renderProgress      = useProjectStore(s => s.renderProgress);
  const charactersMetadata  = useProjectStore(s => s.charactersMetadata);
  const activeVideoNodeLineIds = usePlaybackStore ? [] : []; // populated by VideoStudio sync
  const zoomLevel           = usePlaybackStore(s => s.zoomLevel);
  const isVoicePanelCollapsed    = useProjectStore(s => s.isVoicePanelCollapsed);
  const setIsVoicePanelCollapsed = useProjectStore(s => s.setIsVoicePanelCollapsed);

  const uniqueSpeakers = Array.from(new Set(script.map(l => l.speaker.toLowerCase())));

  return (
    <main
      className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10"
    >
      {/* ── Left: Script Editor ─────────────────────────────────────────── */}
      <div className={`${isVoicePanelCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6 transition-[grid-column] duration-200`}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Kịch Bản (Script Editor)
          </h2>
          <div className="flex items-center gap-4">
            {/* Re-open Voice Casting panel (visible when collapsed) */}
            {isVoicePanelCollapsed && (
              <button
                onClick={() => setIsVoicePanelCollapsed(false)}
                className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20"
                title="Mở lại Voice Casting"
              >
                <PanelRightOpen className="w-4 h-4" /> Voice Casting
              </button>
            )}
            {/* Select all */}
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                checked={script.length > 0 && script.every(l => l.selected)}
                onChange={(e) => setScript(script.map(l => ({ ...l, selected: e.target.checked })))}
              />
              Chọn Tất Cả
            </label>
            {/* Sort mode */}
            <button
              onClick={() => setIsSortingMode(!isSortingMode)}
              className={`text-sm flex items-center gap-1 transition-colors px-2 py-1 rounded-md ${isSortingMode ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
            >
              <ArrowUpDown className="w-4 h-4" /> {isSortingMode ? 'Đang Sắp Xếp (Tắt)' : 'Sắp Xếp'}
            </button>
            {/* Add line */}
            <button
              onClick={addLine}
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-500/10 px-2 py-1 rounded-md hover:bg-indigo-500/20"
            >
              + Thêm dòng
            </button>
          </div>
        </div>

        {/* Script Lines */}
        <div className="space-y-4" onDragOver={handleDragOverContainer}>
          {script.length === 0 && (
            <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-slate-300 font-semibold mb-1">Chưa có kịch bản nào</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Mở <span className="text-indigo-400 font-medium">File ▾</span> ở thanh trên cùng để Upload .md (AI sinh script),
                hoặc bấm <span className="text-indigo-400 font-medium">+ Thêm dòng</span> ở trên để tạo dòng đầu tiên.
              </p>
            </div>
          )}
          {script.map((line, index) => (
            <div
              key={line.id}
              id={`script-line-${line.id}`}
              draggable={isSortingMode}
              onDragStart={() => { if (isSortingMode) dragItem.current = index; }}
              onDragEnter={() => { if (isSortingMode) dragOverItem.current = index; }}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className={`group relative border rounded-xl p-4 transition-all duration-300
                ${isSortingMode ? 'cursor-move border-amber-500/50 hover:bg-amber-900/10' : ''}
                ${line.selected && !isSortingMode
                  ? 'bg-indigo-900/30 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-[1.01]'
                  : 'bg-slate-900 border-slate-800'}
                ${!isSortingMode && !line.selected ? 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10' : ''}`}
            >
              {/* Sort grip */}
              {isSortingMode && (
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-amber-500/50">
                  <GripVertical className="w-6 h-6" />
                </div>
              )}

              {/* Line number + checkbox */}
              <div className={`absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 ${isSortingMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 font-mono shadow-sm">
                  {index + 1}
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                  checked={line.selected || false}
                  onChange={(e) => {
                    const next = [...script];
                    next[index].selected = e.target.checked;
                    setScript(next);
                  }}
                />
              </div>

              {/* Compact header (click to expand) */}
              <div
                className="ml-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1"
                onClick={(e) => {
                  toggleScriptLine(line.id, e);
                  const clip = timelineClips.find(c => c.lineId === line.id);
                  if (clip && timelineScrollRef.current) {
                    const leftPos = clip.startTime * zoomLevel;
                    timelineScrollRef.current.scrollTo({
                      left: Math.max(0, leftPos - timelineScrollRef.current.clientWidth / 2 + 100),
                      behavior: 'smooth',
                    });
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 shrink-0 min-w-[80px]">
                    {line.speaker}
                  </span>
                  <span className="text-sm text-slate-300 truncate max-w-full sm:max-w-md opacity-80">
                    {line.text || '...'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {expandedScriptLines.has(line.id) || isSortingMode
                    ? <ChevronUp className="w-4 h-4 text-slate-500 pointer-events-none" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />}
                </div>
              </div>

              {/* Expanded body */}
              <div className={`ml-4 overflow-hidden transition-all duration-300 ${expandedScriptLines.has(line.id) || isSortingMode ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800/50">
                  {/* Speaker selector */}
                  <div className="w-full sm:w-48 shrink-0 flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Speaker (Voice)</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                        value={line.speaker.toLowerCase()}
                        onChange={(e) => {
                          const next = [...script];
                          next[index].speaker = e.target.value;
                          if (!next[index].visual_references || next[index].visual_references!.length === 0) {
                            next[index].visual_references = [e.target.value];
                          }
                          setScript(next);
                        }}
                      >
                        <option value="narration">🎙️ Narration</option>
                        {Object.entries(charactersMetadata).filter(([_, c]) => c.type === 'character').map(([id, c]) => (
                          <option key={id} value={id}>👨 {c.name}</option>
                        ))}
                        {!Object.keys(charactersMetadata).includes(line.speaker.toLowerCase()) && (
                          <option value={line.speaker.toLowerCase()}>❓ {line.speaker}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Text editor */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Lời thoại</label>
                      <select
                        className="text-xs bg-slate-800 border border-slate-700 rounded text-indigo-300 py-1 px-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        onChange={(e) => {
                          const tag = e.target.value;
                          if (!tag) return;
                          const textarea = document.getElementById(`textarea-${line.id}`) as HTMLTextAreaElement;
                          const next = [...script];
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const before = line.text.substring(0, start);
                            const after = line.text.substring(end);
                            const padL = (before.length > 0 && !before.endsWith(' ')) ? ' ' : '';
                            const padR = (after.length > 0 && !after.startsWith(' ')) ? ' ' : '';
                            const insert = padL + tag + padR;
                            next[index].text = before + insert + after;
                            setScript(next);
                            setTimeout(() => {
                              textarea.focus();
                              const pos = start + insert.length;
                              textarea.setSelectionRange(pos, pos);
                            }, 0);
                          } else {
                            next[index].text = line.text + (line.text.endsWith(' ') ? '' : ' ') + tag;
                            setScript(next);
                          }
                          e.target.value = '';
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
                        const next = [...script];
                        next[index].text = e.target.value;
                        setScript(next);
                      }}
                    />
                  </div>

                  {/* Action buttons */}
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

      {/* ── Right: Voice Casting ─────────────────────────────────────────── */}
      {!isVoicePanelCollapsed && (
      <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-100">Voice Casting</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-xs font-medium"
                title="Lưu các thiết lập Giọng nói và Google Project ID"
              >
                <Save className="w-3.5 h-3.5" /> Lưu Cấu Hình
              </button>
              <button
                onClick={() => setIsVoicePanelCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Thu gọn Voice Casting"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {uniqueSpeakers.map(speaker => (
              <div key={speaker} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                {/* Speaker header */}
                <div
                  className="flex justify-between items-center cursor-pointer hover:bg-slate-900/50 p-2 -m-2 rounded-lg transition-colors"
                  onClick={(e) => toggleVoice(speaker, e)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${speaker}`}
                      alt={speaker}
                      className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 p-1"
                    />
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
                        {playingVoiceRef === speaker
                          ? <div className="w-2.5 h-2.5 bg-current rounded-sm animate-pulse" />
                          : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border mt-1 ${
                      lockedVoices[speaker]
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {lockedVoices[speaker] ? '✅ Locked' : 'No Voice'}
                    </span>
                    {expandedVoices.has(speaker)
                      ? <ChevronUp className="w-4 h-4 text-slate-500 ml-2 pointer-events-none" />
                      : <ChevronDown className="w-4 h-4 text-slate-500 ml-2 pointer-events-none" />}
                  </div>
                </div>

                {/* Expanded voice params */}
                <div className={`overflow-hidden transition-all duration-300 ${expandedVoices.has(speaker) ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/50">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Gender */}
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Giới tính</label>
                        <select
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.gender || 'male'}
                          onChange={(e) => setSpeakerVoiceParams({ ...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || { age: 'middle-aged', pitch: 'low pitch' }), gender: e.target.value } })}
                        >
                          <option value="male">👨 Nam</option>
                          <option value="female">👩 Nữ</option>
                        </select>
                      </div>
                      {/* Age */}
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Độ tuổi</label>
                        <select
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.age || 'middle-aged'}
                          onChange={(e) => setSpeakerVoiceParams({ ...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || { gender: 'male', pitch: 'low pitch' }), age: e.target.value } })}
                        >
                          <option value="child">Trẻ em</option>
                          <option value="teenager">Thiếu niên</option>
                          <option value="young adult">Thanh niên</option>
                          <option value="middle-aged">Trung niên</option>
                          <option value="elderly">Cao tuổi</option>
                        </select>
                      </div>
                      {/* Pitch */}
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">Tone giọng</label>
                        <select
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={speakerVoiceParams[speaker]?.pitch || 'low pitch'}
                          onChange={(e) => setSpeakerVoiceParams({ ...speakerVoiceParams, [speaker]: { ...(speakerVoiceParams[speaker] || { gender: 'male', age: 'middle-aged' }), pitch: e.target.value } })}
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
                      {isCreatingSynthetic === speaker ? <Loader2 className="w-3 h-3 animate-spin" /> : (lockedVoices[speaker] ? '↻' : '+')}
                      {lockedVoices[speaker] ? 'Tạo Lại (Re-Lock)' : 'Tạo Diễn Viên Ảo (Lock Voice)'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </main>
  );
}
