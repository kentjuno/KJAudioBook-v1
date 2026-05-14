// ==========================================================================
// components/layout/Header.tsx
// Top navigation bar: logo, tab switcher, action buttons.
// State (activeTab, renderProgress) from Zustand.
// Callbacks passed as props (handleRenderAll, handleMixAndExport, etc.)
// because they rely on business logic still in App.tsx.
//
// Button hierarchy convention used across the app:
//   Primary CTA (top-level)  : rounded-full bg-{color}-600 hover:bg-{color}-500
//                              text-white shadow-lg shadow-{color}-500/25
//                              px-5 py-2 + optional hover:scale-105
//   Primary (in-panel)       : rounded-lg  bg-indigo-600 hover:bg-indigo-500
//                              text-white  (e.g. Voice Casting "Lưu Cấu Hình")
//   Secondary / tertiary     : rounded-full text-slate-300 hover:bg-slate-800
//                              (ghost; e.g. File menu trigger)
//   Tinted inline action     : rounded-lg  bg-{color}-500/10 text-{color}-400
//                              (e.g. per-row buttons in ScriptSidebar)
//
// Semantic colors:
//   indigo = primary (Render, Voice config, AI Director)
//   amber  = secondary action (Mix & Export)
//   emerald = success / move-forward (Sync To Timeline, Download)
//   red    = danger (Delete)
// ==========================================================================
import React, { useRef, useState, useEffect } from 'react';
import {
  Mic, Video, Settings, Play, Pause, Download,
  Upload, Save, FolderOpen, Loader2, ChevronDown,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface HeaderProps {
  // File ops
  handleImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProject: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Actions
  handleRenderAll: () => void;
  handleMixAndExport: () => void;
  handleSyncToTimeline: () => void;
  // Loading states
  isGenerating: boolean;
}

export function Header({
  handleImportProject,
  exportProject,
  handleFileUpload,
  handleRenderAll,
  handleMixAndExport,
  handleSyncToTimeline,
  isGenerating,
}: HeaderProps) {
  const activeTab        = useProjectStore(s => s.activeTab);
  const setActiveTab     = useProjectStore(s => s.setActiveTab);
  const renderProgress   = useProjectStore(s => s.renderProgress);
  const script           = useProjectStore(s => s.script);
  const timelineVideoClips = useProjectStore(s => s.timelineVideoClips);

  const importInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const fileMenuRef    = useRef<HTMLDivElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  useEffect(() => {
    if (!fileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fileMenuOpen]);

  const isRendering = renderProgress.status === 'rendering' || renderProgress.status === 'assembling';
  const selectedCount = script.filter(l => l.selected).length;

  const renderButtonLabel = renderProgress.status === 'rendering'
    ? `Đang Render (${renderProgress.currentLine}/${renderProgress.totalLines})`
    : renderProgress.status === 'assembling'
    ? 'Đang Ghép Nối...'
    : selectedCount > 0
    ? `Render Selected (${selectedCount})`
    : 'Render All';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-100">
            AudioBook Studio
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800 w-fit">
          <button
            id="tab-audio"
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
            id="tab-video"
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
            id="tab-post-production"
            onClick={() => setActiveTab('post-production')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'post-production'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" /> Post-Production
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">

          {/* Audio Studio Actions */}
          {activeTab === 'audio' && (
            <>
              {/* Hidden file inputs */}
              <input
                type="file" accept=".json" className="hidden"
                ref={importInputRef}
                onChange={handleImportProject}
              />
              <input
                type="file" accept=".md,.txt" className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              {/* File menu (Load / Save / Upload) */}
              <div className="relative" ref={fileMenuRef}>
                <button
                  id="btn-file-menu"
                  onClick={() => setFileMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="File operations"
                >
                  {isGenerating
                    ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    : <FolderOpen className="w-4 h-4" />}
                  {isGenerating ? 'Đang nhờ AI...' : 'File'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${fileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {fileMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-56 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50"
                    role="menu"
                  >
                    <button
                      onClick={() => { importInputRef.current?.click(); setFileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-slate-500" />
                      <span className="flex-1 text-left">Load kịch bản (JSON)</span>
                    </button>
                    <button
                      onClick={() => { exportProject(); setFileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Save className="w-4 h-4 text-slate-500" />
                      <span className="flex-1 text-left">Lưu kịch bản (JSON)</span>
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      onClick={() => { fileInputRef.current?.click(); setFileMenuOpen(false); }}
                      disabled={isGenerating}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span className="flex-1 text-left">Upload .md (AI gen script)</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                id="btn-render-all"
                onClick={handleRenderAll}
                disabled={isRendering || isGenerating}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {renderButtonLabel}
              </button>
            </>
          )}

          {/* Post-Production Actions */}
          {activeTab === 'post-production' && (
            <>
              {renderProgress.status === 'done' && renderProgress.finalAudioUrl && (
                <a
                  href={renderProgress.finalAudioUrl}
                  download={timelineVideoClips.length > 0 ? 'Final_Audiobook_Video.mp4' : 'Final_Audiobook.mp3'}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 animate-pulse"
                >
                  <Download className="w-4 h-4" />
                  {timelineVideoClips.length > 0 ? 'Tải Video Về' : 'Tải Audio Về'}
                </a>
              )}
              <button
                id="btn-mix-export"
                onClick={handleMixAndExport}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Mix & Export
              </button>
            </>
          )}

          {/* Video Studio Actions */}
          {activeTab === 'video' && (
            <button
              id="btn-sync-timeline"
              onClick={() => { handleSyncToTimeline(); setActiveTab('post-production'); }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Video className="w-4 h-4 fill-current" />
              Sync To Timeline
            </button>
          )}
        </div>

      </div>

      {/* Bottom-edge progress bar — visible during render/mix */}
      {(renderProgress.status === 'rendering' || renderProgress.status === 'assembling') && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-900/40">
          {renderProgress.status === 'rendering' && renderProgress.totalLines > 0 ? (
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all duration-300"
              style={{ width: `${Math.min(100, (renderProgress.currentLine / renderProgress.totalLines) * 100)}%` }}
            />
          ) : (
            <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
          )}
        </div>
      )}
    </header>
  );
}
