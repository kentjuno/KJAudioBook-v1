import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Film, Wand2, Play, Video, Loader2 } from 'lucide-react';
import { VideoStudioContext } from './VideoStudioContext';

const SceneNodeCard = ({ id, data, selected }: NodeProps) => {
  const context = React.useContext(VideoStudioContext);
  const isGenerating = data.isGenerating as boolean;
  const isGeneratingVideo = data.isGeneratingVideo as boolean;
  const frameUrl = data.frameUrl as string;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempPrompt, setTempPrompt] = React.useState(data.prompt as string);

  const handleSave = () => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, prompt: tempPrompt } } : n));
    setIsEditing(false);
  };

  return (
    <div className={`bg-slate-900 border rounded-xl shadow-xl w-72 overflow-hidden group transition-colors ${selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.02]' : 'border-indigo-500/50 hover:border-indigo-400'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />

      <div className="bg-slate-800/80 p-2 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-indigo-300 uppercase tracking-wider">{data.sceneName as string}</span>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">Lines: {data.lines as string}</span>
      </div>

      {frameUrl && (
        <div className="w-full aspect-video bg-slate-950 border-b border-slate-800 relative">
          <img src={frameUrl} alt="Generated Frame" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-3">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full h-24 bg-slate-950 border border-indigo-500/50 rounded p-2 text-xs text-slate-200 resize-none focus:outline-none focus:border-indigo-400"
              value={tempPrompt}
              onChange={(e) => setTempPrompt(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsEditing(false); setTempPrompt(data.prompt as string); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium transition-colors">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed break-words">{data.prompt as string}</p>
        )}
      </div>

      <div className="bg-slate-950/50 p-2 flex justify-between gap-2 border-t border-slate-800">
        <div className="flex gap-2">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors">
              Edit
            </button>
          )}
          <button onClick={() => context?.onRegenScenePrompt(id)} className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded text-[10px] font-medium transition-colors flex items-center gap-1">
            <Wand2 className="w-3 h-3" /> Regen
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => context?.onGenFrame(id)}
            disabled={isGenerating || isGeneratingVideo}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
            title="Sinh ảnh frame (starting image cho video)"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isGenerating ? 'Gen...' : 'Frame'}
          </button>
          <button
            onClick={() => context?.onGenVideo(id)}
            disabled={isGenerating || isGeneratingVideo || !data.frameMediaId}
            title={!data.frameMediaId ? 'Please Gen Frame first to use as a starting image' : 'Generate Video'}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
          >
            {isGeneratingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
            {isGeneratingVideo ? 'Gen...' : 'Video'}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
    </div>
  );
};

export default SceneNodeCard;
