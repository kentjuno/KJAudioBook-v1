import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { User, MapPin, X } from 'lucide-react';
import { VideoStudioContext } from './VideoStudioContext';
import { API } from '../../config';

const AssetNodeCard = ({ id, data }: NodeProps) => {
  const context = React.useContext(VideoStudioContext);
  const { setNodes } = useReactFlow();
  const metadata = context?.charactersMetadata?.[(data.baseAssetId as string) || id];
  const name = metadata ? metadata.name + (data.baseAssetId ? ' (Var)' : '') : data.name;
  const imagePath = data.baseAssetId ? data.imagePath : (metadata?.local_image_path || data.imagePath);
  const assetType = metadata?.type || data.assetType;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-lg w-48 flex items-center gap-3 group relative">
      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
        {imagePath ? (
          <img src={`${API.image}?path=${encodeURIComponent(imagePath as string)}`} alt={name as string} className="w-full h-full object-cover" />
        ) : (
          assetType === 'character' ? <User className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-xs font-bold text-slate-200 truncate">{name as string}</div>
        <div className="text-[9px] uppercase tracking-wider text-slate-500">{assetType as string}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setNodes(nds => nds.filter(n => n.id !== id)); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 bg-slate-800 rounded-full transition-opacity cursor-pointer shadow-lg"
        title="Delete Node"
      >
        <X className="w-3 h-3" />
      </button>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
    </div>
  );
};

export default AssetNodeCard;
