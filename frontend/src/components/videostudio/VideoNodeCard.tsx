import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Video, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { API } from '../../config';

const VideoNodeCard = ({ id, data, selected }: NodeProps) => {
  const isGeneratingVideo = data.isGeneratingVideo as boolean;
  const videoUrl = data.videoUrl as string;
  const frameUrl = data.frameUrl as string;
  const { setNodes } = useReactFlow();

  React.useEffect(() => {
    if (!isGeneratingVideo || (!data.mediaId && !data.opName)) return;

    const pollInterval = setInterval(async () => {
      try {
        const pollUrl = data.mediaId
          ? `${API.checkVideoStatus}?media_id=${encodeURIComponent(data.mediaId as string)}`
          : `${API.checkVideoStatus}?operation_name=${encodeURIComponent(data.opName as string)}`;

        const pollRes = await axios.get(pollUrl);
        const statusData = pollRes.data;
        if (statusData.status === 200 && statusData.data) {
          if (data.mediaId) {
            const videoData = statusData.data.video || {};
            const fifeUrl = videoData.generatedVideo?.fifeUrl || videoData.fifeUrl || statusData.data.fifeUrl;
            if (fifeUrl) {
              clearInterval(pollInterval);
              setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isGeneratingVideo: false, videoUrl: fifeUrl } } : n));
            }
          } else {
            const targetList = statusData.data.operations || statusData.data.workflows;
            if (targetList && targetList.length > 0) {
              const op = targetList[0];
              const isDone = op.done || op.state === 'SUCCEEDED' || op.state === 'COMPLETED';
              if (isDone) {
                clearInterval(pollInterval);
                const responseObj = op.response || op.result || op;
                if (responseObj?.media?.length > 0) {
                  const media = responseObj.media[0];
                  const fifeUrl = media.video?.generatedVideo?.fifeUrl || media.video?.fifeUrl;
                  if (fifeUrl) {
                    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isGeneratingVideo: false, videoUrl: fifeUrl } } : n));
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isGeneratingVideo, data.mediaId, data.opName, id, setNodes]);

  return (
    <div className={`bg-slate-900 border rounded-xl shadow-xl w-72 overflow-hidden group transition-colors relative ${selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.02]' : 'border-emerald-500/50 hover:border-emerald-400'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900" />

      <div className="bg-slate-800/80 p-2 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs text-emerald-300 uppercase tracking-wider">Video Result</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setNodes(nds => nds.filter(n => n.id !== id)); }}
          className="text-slate-500 hover:text-red-400 transition-colors"
          title="Delete Node"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {videoUrl ? (
        <div className="w-full aspect-video bg-slate-950 relative group/video">
          <video src={videoUrl} controls loop className="w-full h-full object-cover" />
        </div>
      ) : frameUrl ? (
        <div className="w-full aspect-video bg-slate-950 relative">
          <img src={frameUrl} alt="Placeholder" className="w-full h-full object-cover opacity-50" />
          {isGeneratingVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
              <span className="text-xs font-bold text-emerald-400 animate-pulse uppercase tracking-wider">Rendering...</span>
              <span className="text-[10px] text-slate-300 mt-1">This may take 2-5 mins</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-slate-950 flex flex-col items-center justify-center">
          {isGeneratingVideo ? (
            <>
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
              <span className="text-xs font-bold text-emerald-400 animate-pulse uppercase tracking-wider">Rendering...</span>
            </>
          ) : (
            <span className="text-xs text-slate-500">Waiting for render...</span>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoNodeCard;
