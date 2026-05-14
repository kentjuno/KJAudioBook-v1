import React from 'react';
import { Image as ImageIcon, Wand2, Loader2, User, Upload, Trash2, CheckCircle, X, Eye } from 'lucide-react';
import type { CharacterMetadata } from '../../types';
import { API } from '../../config';

interface VideoAssetsPanelProps {
  charactersMetadata: Record<string, CharacterMetadata>;
  flowkitProjectId: string;
  setFlowkitProjectId: (id: string) => void;
  globalArtStyle: string;
  setGlobalArtStyle: (style: string) => void;
  isExtractingEntities: boolean;
  isGeneratingAsset: string | null;
  enhancingAssetId: string | null;
  script: { length: number };
  onExtractEntities: () => void;
  onAddAsset: () => void;
  onUpdateAsset: (id: string, field: string, value: string) => void;
  onDeleteEntity: (id: string) => Promise<void>;
  onUploadCharacterImage: (id: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onGenerateAssetImage: (id: string, prompt: string) => Promise<void>;
  onEnhancePrompt: (id: string) => void;
  onToggleReference: (assetId: string, variationId: string) => void;
  onDeleteVariation: (assetId: string, variationId: string) => void;
  onPreviewImage: (url: string) => void;
}

const VideoAssetsPanel: React.FC<VideoAssetsPanelProps> = ({
  charactersMetadata,
  flowkitProjectId,
  setFlowkitProjectId,
  globalArtStyle,
  setGlobalArtStyle,
  isExtractingEntities,
  isGeneratingAsset,
  enhancingAssetId,
  script,
  onExtractEntities,
  onAddAsset,
  onUpdateAsset,
  onDeleteEntity,
  onUploadCharacterImage,
  onGenerateAssetImage,
  onEnhancePrompt,
  onToggleReference,
  onDeleteVariation,
  onPreviewImage,
}) => (
  <div className="w-[350px] bg-slate-900 border-l border-slate-800 overflow-y-auto p-4 flex flex-col shrink-0">
    <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900 z-10 pb-2 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Visual Assets</h2>
      </div>
      <button
        onClick={onExtractEntities}
        disabled={isExtractingEntities || script.length === 0}
        className="text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 disabled:pointer-events-none"
        title="Sử dụng AI phân tích kịch bản để tự động tạo danh sách Nhân vật"
      >
        {isExtractingEntities ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        {isExtractingEntities ? 'Extracting...' : 'Extract Visuals'}
      </button>
    </div>

    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
      <div>
        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Project ID (Google Labs)</label>
        <input
          type="text"
          value={flowkitProjectId}
          onChange={(e) => setFlowkitProjectId(e.target.value)}
          className="w-full bg-slate-950 text-slate-300 text-xs p-2 rounded-md border border-slate-700 focus:border-indigo-500 focus:outline-none"
          placeholder="Nhập Project ID từ URL..."
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Global Art Style</label>
        <input
          type="text"
          value={globalArtStyle}
          onChange={(e) => setGlobalArtStyle(e.target.value)}
          className="w-full bg-slate-950 text-indigo-300 text-xs p-2 rounded-md border border-indigo-500/30 focus:border-indigo-500 focus:outline-none"
          placeholder="Ví dụ: Cinematic, Ghibli, 3D Pixar..."
        />
      </div>
      <button onClick={onAddAsset} className="w-full mt-2 py-1.5 border border-dashed border-emerald-500/50 text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/10 transition-colors">
        + Add Asset Manually
      </button>
    </div>

    {Object.keys(charactersMetadata).length === 0 ? (
      <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
        Chưa có nhân vật nào.<br />Hãy nhấn "Extract Visuals" ở Audio Studio.
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {Object.entries(charactersMetadata).map(([id, entity]) => (
          <div
            key={id}
            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex gap-3 items-start cursor-grab active:cursor-grabbing hover:bg-slate-700/60 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow', JSON.stringify({
                id, type: 'asset', imagePath: entity.local_image_path, mediaId: entity.media_id,
              }));
            }}
          >
            <label className="w-12 h-12 shrink-0 bg-slate-950 rounded-lg border border-slate-600 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer" title="Tải ảnh tham chiếu lên">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => onUploadCharacterImage(id, e)} />
              {entity.local_image_path ? (
                <img
                  src={`${API.image}?path=${encodeURIComponent(entity.local_image_path)}&t=${Date.now()}`}
                  alt={entity.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0ibTIxIDE1LTMuMDgtMy4wOGExLjMzIDEuMzMgMCAwIDAtMS44OCAwTDMgMTYiLz48L3N2Zz4=';
                  }}
                />
              ) : (
                <User className="w-5 h-5 text-slate-500" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </label>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <input
                  type="text"
                  value={entity.name}
                  onChange={(e) => onUpdateAsset(id, 'name', e.target.value)}
                  className="font-bold text-slate-200 text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-24"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={entity.type}
                    onChange={(e) => onUpdateAsset(id, 'type', e.target.value)}
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded outline-none border-none cursor-pointer ${entity.type === 'character' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}
                  >
                    <option value="character">Char</option>
                    <option value="location">Loc</option>
                    <option value="prop">Prop</option>
                  </select>
                  <button onClick={() => onDeleteEntity(id)} className="text-slate-500 hover:text-rose-400 transition-colors" title="Xoá">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <textarea
                value={entity.description || ''}
                onChange={(e) => onUpdateAsset(id, 'description', e.target.value)}
                placeholder="Mô tả cơ bản (Ngoại hình, tính cách)..."
                className="text-[10px] text-slate-400 mt-1 w-full bg-slate-900 border border-slate-700 rounded p-1 resize-y min-h-12 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                value={entity.variation_context || ''}
                onChange={(e) => onUpdateAsset(id, 'variation_context', e.target.value)}
                placeholder="Mô tả Variation mới (vd: Kael đang giận dữ, ánh mắt hình viên đạn...)"
                className="text-[10px] text-amber-500/80 mt-1 w-full bg-slate-900 border border-slate-700 rounded p-1 resize-y min-h-12 focus:outline-none focus:border-amber-500"
              />

              <div className="mt-2 text-[9px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-700/50 relative group/prompt flex flex-col gap-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-indigo-400">Image Prompt:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onEnhancePrompt(id)}
                      disabled={enhancingAssetId === id}
                      className="px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 disabled:opacity-50 rounded text-[8px] font-medium transition-colors flex items-center gap-1 border border-indigo-500/50"
                      title="Tự động Enhance Prompt bằng Gemini"
                    >
                      {enhancingAssetId === id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                      Enhance
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onGenerateAssetImage(id, entity.image_prompt ? `${entity.image_prompt}, ${globalArtStyle}` : ''); }}
                      disabled={isGeneratingAsset === id}
                      className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-[8px] font-medium transition-colors flex items-center gap-1"
                      title="Tạo ảnh tự động bằng FlowKit AI"
                    >
                      {isGeneratingAsset === id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                      {isGeneratingAsset === id ? 'Đang tạo...' : 'Gen AI'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={entity.image_prompt || ''}
                  onChange={(e) => onUpdateAsset(id, 'image_prompt', e.target.value)}
                  placeholder="Prompt tạo ảnh chi tiết..."
                  className="font-mono text-[9px] w-full bg-slate-900 border border-slate-700 rounded p-1 resize-y min-h-16 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mt-2 text-[9px] font-mono text-slate-500 flex items-center gap-1.5">
                {entity.media_id ? (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" /> Ready (ID Cached)</span>
                ) : (
                  <span className="flex items-center gap-1"><X className="w-2.5 h-2.5" /> No Image Linked</span>
                )}
              </div>

              {entity.variations && entity.variations.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'thin' }}>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 shrink-0 font-bold">Variations:</span>
                  {entity.variations.map((v: any) => {
                    const isPrimary = entity.local_image_path === v.local_image_path;
                    const isReference = entity.references?.some((r: any) => r.media_id === v.media_id);
                    const borderClass = isPrimary
                      ? 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] opacity-100'
                      : isReference
                      ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] opacity-100'
                      : 'border-slate-700 hover:border-slate-400 opacity-70 hover:opacity-100';

                    return (
                      <div
                        key={v.id}
                        className={`w-8 h-8 shrink-0 rounded border-2 overflow-hidden cursor-pointer transition-all ${borderClass} relative group/var`}
                        onClick={() => onToggleReference(id, v.id)}
                        title={`Name: ${v.name || 'Variation'}\nPrompt: ${v.prompt}\nClick to toggle reference`}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('application/reactflow', JSON.stringify({
                            id, type: 'variation', name: v.name, variationId: v.id,
                            imagePath: v.local_image_path, mediaId: v.media_id,
                          }));
                        }}
                      >
                        <img
                          src={`${API.image}?path=${encodeURIComponent(v.local_image_path)}`}
                          className="w-full h-full object-cover"
                          alt={v.name || 'variation'}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/var:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPreviewImage(`${API.image}?path=${encodeURIComponent(v.local_image_path)}`); }}
                            className="hover:scale-110 transition-transform" title="Xem ảnh lớn"
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (window.confirm('Xóa variation này?')) onDeleteVariation(id, v.id); }}
                            className="hover:scale-110 transition-transform" title="Xóa variation"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default VideoAssetsPanel;
