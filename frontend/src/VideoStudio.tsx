import React, { useCallback, useMemo } from 'react';
import { ReactFlow, Controls, Background, addEdge, useNodesState, useEdgesState, Handle, Position, BaseEdge, getBezierPath, useReactFlow, EdgeLabelRenderer } from '@xyflow/react';
import type { Connection, Edge, NodeProps, EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ScriptLine, CharacterMetadata } from './App';
import { User, Image as ImageIcon, MapPin, Wand2, Loader2, Play, Film, Upload, Trash2, Copy, CheckCircle, X, Eye, Video } from 'lucide-react';
import axios from 'axios';

interface VideoStudioProps {
  script: ScriptLine[];
  setScript: React.Dispatch<React.SetStateAction<ScriptLine[]>>;
  charactersMetadata: Record<string, CharacterMetadata>;
  setCharactersMetadata: React.Dispatch<React.SetStateAction<Record<string, CharacterMetadata>>>;
  flowkitProjectId: string;
  setFlowkitProjectId: React.Dispatch<React.SetStateAction<string>>;
  handleUploadCharacterImage: (id: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleGenerateAssetImage: (id: string, prompt: string) => Promise<void>;
  handleDeleteEntity: (id: string) => Promise<void>;
  isGeneratingAsset: string | null;
  setActiveVideoNodeLineIds?: (ids: number[]) => void;
}

const VideoStudioContext = React.createContext<{
  onGenFrame: (nodeId: string) => void;
  onGenVideo: (nodeId: string) => void;
  onRegenScenePrompt: (nodeId: string) => Promise<void>;
  charactersMetadata: Record<string, CharacterMetadata>;
} | null>(null);


// Custom Asset Node (Left Side)
const AssetNode = ({ id, data }: NodeProps) => {
  const context = React.useContext(VideoStudioContext);
  const { setNodes } = useReactFlow();
  const metadata = context?.charactersMetadata?.[(data.baseAssetId as string) || id];
  const name = metadata ? metadata.name + (data.baseAssetId ? " (Var)" : "") : data.name;
  const imagePath = data.baseAssetId ? data.imagePath : (metadata?.local_image_path || data.imagePath);
  const assetType = metadata?.type || data.assetType;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-lg w-48 flex items-center gap-3 group relative">
      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
        {imagePath ? (
           <img src={`http://localhost:8000/api/image?path=${encodeURIComponent(imagePath as string)}`} alt={name as string} className="w-full h-full object-cover" />
        ) : (
          assetType === 'character' ? <User className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-xs font-bold text-slate-200 truncate">{name as string}</div>
        <div className="text-[9px] uppercase tracking-wider text-slate-500">{assetType as string}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setNodes(nds => nds.filter(n => n.id !== id));
        }}
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

// Custom Scene Node (Right Side)
const SceneNode = ({ id, data, selected }: NodeProps) => {
  const context = React.useContext(VideoStudioContext);
  const isGenerating = data.isGenerating as boolean;
  const isGeneratingVideo = data.isGeneratingVideo as boolean;
  const frameUrl = data.frameUrl as string;
  const videoUrl = data.videoUrl as string;
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
      
      {frameUrl ? (
        <div className="w-full aspect-video bg-slate-950 border-b border-slate-800 relative">
          <img src={frameUrl} alt="Generated Frame" className="w-full h-full object-cover" />
        </div>
      ) : null}

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
          <p className="text-xs text-slate-300 leading-relaxed break-words">
            {data.prompt as string}
          </p>
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
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isGenerating ? 'Gen...' : 'Frame'}
          </button>
          <button 
            onClick={() => context?.onGenVideo(id)}
            disabled={isGenerating || isGeneratingVideo || !data.frameMediaId}
            title={!data.frameMediaId ? "Please Gen Frame first to use as a starting image" : "Generate Video"}
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

const VideoNode = ({ id, data, selected }: NodeProps) => {
  const isGeneratingVideo = data.isGeneratingVideo as boolean;
  const videoUrl = data.videoUrl as string;
  const frameUrl = data.frameUrl as string;
  const { setNodes } = useReactFlow();

  React.useEffect(() => {
    if (isGeneratingVideo && (data.mediaId || data.opName)) {
      const pollInterval = setInterval(async () => {
        try {
          const pollUrl = data.mediaId 
              ? `http://localhost:8000/api/check-video-status?media_id=${encodeURIComponent(data.mediaId as string)}`
              : `http://localhost:8000/api/check-video-status?operation_name=${encodeURIComponent(data.opName as string)}`;
              
          const pollRes = await axios.get(pollUrl);
          const statusData = pollRes.data;
          if (statusData.status === 200 && statusData.data) {
            if (data.mediaId) {
              const videoData = statusData.data.video || {};
              const fifeUrl = videoData.generatedVideo?.fifeUrl || videoData.fifeUrl || statusData.data.fifeUrl;
              if (fifeUrl) {
                  clearInterval(pollInterval);
                  setNodes(nds => nds.map(n => n.id === id ? { 
                    ...n, 
                    data: { ...n.data, isGeneratingVideo: false, videoUrl: fifeUrl } 
                  } : n));
              }
            } else {
                const targetList = statusData.data.operations || statusData.data.workflows;
                if (targetList && targetList.length > 0) {
                  const op = targetList[0];
                  const isDone = op.done || op.state === "SUCCEEDED" || op.state === "COMPLETED";
                  if (isDone) {
                    clearInterval(pollInterval);
                    const responseObj = op.response || op.result || op;
                    if (responseObj && responseObj.media && responseObj.media.length > 0) {
                      const media = responseObj.media[0];
                      const fifeUrl = media.video?.generatedVideo?.fifeUrl || media.video?.fifeUrl;
                      if (fifeUrl) {
                        setNodes(nds => nds.map(n => n.id === id ? { 
                          ...n, 
                          data: { ...n.data, isGeneratingVideo: false, videoUrl: fifeUrl } 
                        } : n));
                      }
                    }
                  }
                }
            }
          }
        } catch(e) {
          console.error(e);
        }
      }, 5000);

      return () => clearInterval(pollInterval);
    }
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
          onClick={(e) => {
            e.stopPropagation();
            setNodes(nds => nds.filter(n => n.id !== id));
          }}
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

const DeletableEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, selected }: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={selected ? { ...style, stroke: '#ef4444', strokeWidth: 3 } : style} />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className="w-5 h-5 bg-slate-800 border border-red-500 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer shadow-lg shadow-red-500/20"
              onClick={(e) => {
                e.stopPropagation();
                setEdges((es) => es.filter((e) => e.id !== id));
              }}
              title="Delete connection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const VideoStudio: React.FC<VideoStudioProps> = ({ 
  script, 
  charactersMetadata,
  setCharactersMetadata,
  flowkitProjectId,
  setFlowkitProjectId,
  handleUploadCharacterImage,
  handleGenerateAssetImage,
  handleDeleteEntity,
  isGeneratingAsset
}) => {
  const [activeVideoNodeLineIds, setActiveVideoNodeLineIds] = React.useState<number[]>([]);
  const scriptListRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>({});

  React.useEffect(() => {
    if (activeVideoNodeLineIds.length > 0) {
      const firstId = activeVideoNodeLineIds[0];
      const el = scriptListRefs.current[firstId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeVideoNodeLineIds]);

  // Load from localStorage initially
  const initialNodes = React.useMemo(() => {
    const saved = localStorage.getItem('video_nodes');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((n: any) => {
        if (n.type === 'video' && !n.data.videoUrl) {
          return {
            ...n,
            data: {
              ...n.data,
              isGeneratingVideo: true
            }
          };
        }
        return {
          ...n,
          data: {
            ...n.data,
            isGeneratingVideo: false,
            isGeneratingFrame: false
          }
        };
      });
    } catch (e) {
      return [];
    }
  }, []);
  
  const initialEdges = React.useMemo(() => {
    const saved = localStorage.getItem('video_edges');
    return saved ? JSON.parse(saved) : [];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = React.useState(false);
  const [isExtractingEntities, setIsExtractingEntities] = React.useState(false);
  const [enhancingAssetId, setEnhancingAssetId] = React.useState<string | null>(null);
  const [globalArtStyle, setGlobalArtStyle] = React.useState<string>("Cinematic, highly detailed, Unreal Engine 5");
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  const handleDeleteVariation = async (assetId: string, variationId: string) => {
    try {
      const res = await axios.post('http://localhost:8000/api/delete-variation', {
        asset_id: assetId,
        variation_id: variationId
      });
      if (res.data.status === 'success') {
        setCharactersMetadata(res.data.metadata);
      }
    } catch(e: any) {
      alert("Lỗi xoá variation: " + e.message);
    }
  };

  const handleAddAsset = () => {
    const id = `asset_${Date.now()}`;
    setCharactersMetadata(prev => ({
      ...prev,
      [id]: {
        name: "New Asset",
        type: "character",
        description: "",
        image_prompt: "",
        local_image_path: "",
        media_id: null,
        last_uploaded_at: 0
      }
    }));
  };

  const handleUpdateAsset = async (id: string, field: string, value: string) => {
    setCharactersMetadata(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
    try {
      await axios.post('http://localhost:8000/api/update-asset', { id, field, value });
    } catch (e) {
      console.error("Lỗi cập nhật asset lên server", e);
    }
  };

  const handleToggleReference = async (assetId: string, variationId: string) => {
    try {
      const res = await axios.post('http://localhost:8000/api/toggle-reference-variation', {
        asset_id: assetId,
        variation_id: variationId
      });
      if (res.data.status === 'success') {
        setCharactersMetadata(res.data.metadata);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi chuyển đổi ảnh tham chiếu!");
    }
  };

  const handleEnhancePrompt = async (id: string) => {
    const entity = charactersMetadata[id];
    if (!entity) return;
    try {
      setEnhancingAssetId(id);
      
      let basePrompt = entity.description || "A character";
      if (entity.variation_context) {
         basePrompt = `Context/Action: ${entity.variation_context}. Character description: ${basePrompt}`;
      }

      const res = await axios.post('http://localhost:8000/api/enhance-prompt', {
        prompt: basePrompt,
        asset_type: entity.type,
        asset_name: entity.name,
        global_style: globalArtStyle
      });
      handleUpdateAsset(id, 'image_prompt', res.data.prompt);
    } catch(e: any) {
      alert("Lỗi Enhance: " + e.message);
    } finally {
      setEnhancingAssetId(null);
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
      alert("Lỗi khi trích xuất thực thể. Vui lòng check console backend.");
    } finally {
      setIsExtractingEntities(false);
    }
  };

  // Save to localStorage when changed
  React.useEffect(() => {
    localStorage.setItem('video_nodes', JSON.stringify(nodes));
    localStorage.setItem('video_edges', JSON.stringify(edges));
  }, [nodes, edges]);

  const nodeTypes = useMemo(() => ({ asset: AssetNode, scene: SceneNode, video: VideoNode }), []);
  const edgeTypes = useMemo(() => ({ default: DeletableEdge }), []);

  const edgesRef = React.useRef(edges);
  const nodesRef = React.useRef(nodes);
  React.useEffect(() => { edgesRef.current = edges; }, [edges]);
  React.useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const handleGenFrame = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    // BFS to find all upstream nodes
    const visited = new Set<string>();
    const queue = [nodeId];
    const upstreamNodes: any[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const incomingEdges = edgesRef.current.filter(e => e.target === currentId);
      for (const edge of incomingEdges) {
        const sourceNode = nodesRef.current.find(n => n.id === edge.source);
        if (sourceNode && !visited.has(sourceNode.id)) {
          upstreamNodes.push(sourceNode);
          queue.push(sourceNode.id);
        }
      }
    }

    const mediaIds = upstreamNodes.flatMap(sourceNode => {
      // If the node contains a specific variation mediaId, use it
      if (sourceNode.data.mediaId) {
        return [sourceNode.data.mediaId];
      }

      // Otherwise, it's a base character node, get from context
      const baseId = sourceNode.data.baseAssetId || sourceNode.id;
      const entity = charactersMetadata[baseId];
      if (!entity) return [];

      let nodeRefs: string[] = [];
      if (entity.media_id) {
        nodeRefs.push(entity.media_id);
      }
      if (entity.references && entity.references.length > 0) {
        const additionalRefs = entity.references
          .map((r: any) => r.media_id)
          .filter((id: any) => id && id !== entity.media_id);
        nodeRefs = [...nodeRefs, ...additionalRefs];
      }
      return nodeRefs;
    }).filter(Boolean) as string[];

    // Set loading state
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: true } } : n));

    try {
      const res = await axios.post('http://localhost:8000/api/generate-scene-frame', {
        prompt: node.data.prompt,
        project_id: "a59651a1-70ff-44b6-ac42-c26d90ad28ef", // default project ID for FlowKit
        reference_media_ids: mediaIds
      });

      const url = res.data.url;
      if (url) {
         setNodes(nds => nds.map(n => n.id === nodeId ? { 
           ...n, 
           data: { ...n.data, isGenerating: false, frameUrl: url, frameMediaId: res.data.media_id } 
         } : n));
      } else {
         throw new Error("Không nhận được URL ảnh từ API");
      }

    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi gọi API tạo ảnh: " + err.message);
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false } } : n));
    }
  }, [charactersMetadata, setNodes]);

  const handleGenVideo = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    // BFS to find all upstream nodes
    const visited = new Set<string>();
    const queue = [nodeId];
    const upstreamNodes: any[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const incomingEdges = edgesRef.current.filter(e => e.target === currentId);
      for (const edge of incomingEdges) {
        const sourceNode = nodesRef.current.find(n => n.id === edge.source);
        if (sourceNode && !visited.has(sourceNode.id)) {
          upstreamNodes.push(sourceNode);
          queue.push(sourceNode.id);
        }
      }
    }

    const mediaIds = upstreamNodes.flatMap(sourceNode => {
      if (sourceNode.data.mediaId) return [sourceNode.data.mediaId];
      const baseId = sourceNode.data.baseAssetId || sourceNode.id;
      const entity = charactersMetadata[baseId];
      if (!entity) return [];
      let nodeRefs: string[] = [];
      if (entity.media_id) nodeRefs.push(entity.media_id);
      if (entity.references && entity.references.length > 0) {
        const additionalRefs = entity.references
          .map((r: any) => r.media_id)
          .filter((id: any) => id && id !== entity.media_id);
        nodeRefs = [...nodeRefs, ...additionalRefs];
      }
      return nodeRefs;
    }).filter(Boolean) as string[];

    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: true } } : n));

    try {
      const res = await axios.post('http://localhost:8000/api/generate-scene-video', {
        prompt: node.data.prompt,
        project_id: "a59651a1-70ff-44b6-ac42-c26d90ad28ef",
        scene_id: nodeId,
        start_image_media_id: node.data.frameMediaId || null,
        reference_media_ids: mediaIds
      });

      const opName = res.data.operation_name;
      const mediaId = res.data.primary_media_id;
      if (opName || mediaId) {
        const existingVideoEdgesCount = edgesRef.current.filter(e => e.source === nodeId).length;
        const yOffset = existingVideoEdgesCount * 120;
        const videoNodeId = `video_${Date.now()}`;
        const newNode = {
          id: videoNodeId,
          type: 'video',
          position: { x: node.position.x + 350, y: node.position.y + yOffset },
          data: {
            opName,
            mediaId,
            isGeneratingVideo: true,
            frameUrl: node.data.frameUrl
          }
        };
        const newEdge = {
          id: `e_${nodeId}-${videoNodeId}`,
          source: nodeId,
          target: videoNodeId,
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2, opacity: 0.6 }
        };
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: false } } : n).concat(newNode));
        setEdges(eds => eds.concat(newEdge));
      } else {
        throw new Error("Không nhận được operation_name hay primary_media_id từ API");
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi gọi API tạo Video: " + err.message);
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: false } } : n));
    }
  }, [charactersMetadata, setNodes]);

  const handleRegenScenePrompt = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    try {
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, prompt: "Đang phân tích kịch bản và viết lại prompt..." } } : n));
      
      let rawText = "";
      if (node.data.lines) {
        const lineIds = (node.data.lines as string).split(',').map(s => s.trim());
        const matchingLines = script.filter(l => lineIds.includes(l.id.toString()));
        rawText = matchingLines.map(l => l.text).join(' ');
      }
      
      const res = await axios.post('http://localhost:8000/api/enhance-prompt', {
        prompt: rawText || "A generic scene",
        asset_type: "scene",
        asset_name: node.data.sceneName,
        global_style: globalArtStyle
      });
      
      const newPrompt = res.data.prompt;
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, prompt: newPrompt } } : n));
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi Regen Prompt: " + e.message);
    }
  }, [script, globalArtStyle, setNodes]);

  const handleGenerateStoryboard = async () => {
    try {
      setIsGeneratingStoryboard(true);
      const response = await axios.post('http://localhost:8000/api/generate-storyboard', {
        script,
        metadata: charactersMetadata
      });
      
      const shots = response.data.shots;
      if (!shots || shots.length === 0) {
        alert("AI Director không trả về được cảnh nào. Vui lòng thử lại!");
        return;
      }

      const newNodes: any[] = [];
      const newEdges: any[] = [];
      
      const usedAssets = new Set<string>();
      
      shots.forEach((shot: any, index: number) => {
        const imageNodeId = `shot_${index}`;
        newNodes.push({
          id: imageNodeId,
          type: 'scene',
          position: { x: 450, y: index * 220 + 50 },
          data: { 
            sceneName: `Scene ${index + 1}`,
            prompt: shot.visual_prompt,
            lines: shot.script_line_ids.join(', ')
          }
        });
        
        if (shot.asset_ids && Array.isArray(shot.asset_ids)) {
          shot.asset_ids.forEach((assetId: string) => {
            usedAssets.add(assetId);
            newEdges.push({
              id: `e_${assetId}-${imageNodeId}`,
              source: assetId,
              target: imageNodeId,
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 }
            });
          });
        }
      });
      
      let assetIndex = 0;
      usedAssets.forEach((assetId) => {
        const asset = charactersMetadata[assetId];
        if (asset) {
          newNodes.push({
            id: assetId,
            type: 'asset',
            position: { x: 50, y: assetIndex * 120 + 50 },
            data: { 
              name: asset.name,
              assetType: asset.type,
              imagePath: asset.local_image_path
            }
          });
          assetIndex++;
        }
      });
      
      setNodes(newNodes);
      setEdges(newEdges);
      
    } catch (error: any) {
      console.error(error);
      alert("Lỗi khi gọi AI Director: " + error.message);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const dataString = event.dataTransfer.getData('application/reactflow');
      if (!dataString || !reactFlowInstance) return;

      const dragData = JSON.parse(dataString);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const asset = charactersMetadata[dragData.id];
      if (!asset) return;

      const newNodeId = `v_${dragData.id}_${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: 'asset',
        position,
        data: {
          name: asset.name + (dragData.type === 'variation' ? " (Var)" : ""),
          assetType: asset.type,
          imagePath: dragData.imagePath,
          mediaId: dragData.mediaId,
          baseAssetId: dragData.type === 'variation' ? dragData.id : null
        }
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, charactersMetadata, setNodes]
  );

  const assets = Object.entries(charactersMetadata || {}).map(([id, data]) => ({ id, ...data }));

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: any[] }) => {
    if (!setActiveVideoNodeLineIds) return;
    if (selectedNodes.length === 0) {
      setActiveVideoNodeLineIds([]);
      return;
    }
    const selected = selectedNodes[0];
    if (selected.type === 'scene' && selected.data?.lines) {
      const linesStr = selected.data.lines as string;
      const ids = linesStr.split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
      setActiveVideoNodeLineIds(ids);
    } else if (selected.type === 'video') {
      const edge = edgesRef.current.find(e => e.target === selected.id);
      if (edge) {
        const sceneNode = nodesRef.current.find(n => n.id === edge.source && n.type === 'scene');
        if (sceneNode && sceneNode.data?.lines) {
          const linesStr = sceneNode.data.lines as string;
          const ids = linesStr.split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
          setActiveVideoNodeLineIds(ids);
        } else {
          setActiveVideoNodeLineIds([]);
        }
      } else {
        setActiveVideoNodeLineIds([]);
      }
    } else {
      setActiveVideoNodeLineIds([]);
    }
  }, [setActiveVideoNodeLineIds]);

  return (
    <div className="flex w-full overflow-hidden border border-slate-800 rounded-xl" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Khung Trái: Audio Script List */}
      <div className="w-1/4 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between sticky top-0 bg-slate-900 z-10 pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Audio Script
          </h2>
          <button
            onClick={handleGenerateStoryboard}
            disabled={isGeneratingStoryboard || script.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
          >
            {isGeneratingStoryboard ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            AI Director
          </button>
        </div>
        {script.length === 0 ? (
          <div className="text-slate-500 text-sm text-center mt-10">Kịch bản trống. Vui lòng thêm kịch bản bên Audio Studio.</div>
        ) : (
          script.map((line, idx) => {
            const isActive = activeVideoNodeLineIds.includes(line.id);
            return (
              <div 
                key={line.id} 
                ref={(el) => {
                  scriptListRefs.current[line.id] = el;
                }}
                className={`p-3 border rounded-lg transition-all duration-300 cursor-pointer group ${
                  isActive 
                    ? 'bg-emerald-900/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]' 
                    : 'bg-slate-800/40 border-slate-700/50 hover:border-amber-500/50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-amber-500/70'}`}>
                    Line {idx + 1}
                  </div>
                  <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'text-emerald-300 bg-emerald-500/20' : 'text-amber-400 bg-amber-500/10'}`}>
                    {line.speaker}
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${isActive ? 'text-emerald-100' : 'text-slate-300'}`}>{line.text}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Khung Giữa: ReactFlow Canvas */}
      <div className="flex-1 bg-slate-950 relative h-full" onDragOver={onDragOver} onDrop={onDrop}>
        <VideoStudioContext.Provider value={{ onGenFrame: handleGenFrame, onGenVideo: handleGenVideo, onRegenScenePrompt: handleRegenScenePrompt, charactersMetadata }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-slate-950"
            colorMode="dark"
          >
            <Background color="#1e293b" gap={16} />
            <Controls className="bg-slate-800 border-slate-700 text-slate-300 fill-slate-300" />
          </ReactFlow>
        </VideoStudioContext.Provider>
      </div>

      {/* Khung Phải: Assets Panel */}
      <div className="w-[350px] bg-slate-900 border-l border-slate-800 overflow-y-auto p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900 z-10 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Visual Assets</h2>
          </div>
          <button 
            onClick={handleExtractEntities}
            disabled={isExtractingEntities || script.length === 0}
            className="text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 disabled:pointer-events-none"
            title="Sử dụng AI phân tích kịch bản để tự động tạo danh sách Nhân vật"
          >
            {isExtractingEntities ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {isExtractingEntities ? "Extracting..." : "Extract Visuals"}
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
          <button onClick={handleAddAsset} className="w-full mt-2 py-1.5 border border-dashed border-emerald-500/50 text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/10 transition-colors">
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
              <div key={id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex gap-3 items-start cursor-grab active:cursor-grabbing hover:bg-slate-700/60 transition-colors" 
                draggable 
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', JSON.stringify({
                    id: id,
                    type: 'asset',
                    imagePath: entity.local_image_path,
                    mediaId: entity.media_id
                  }));
                }}
              >
                <label className="w-12 h-12 shrink-0 bg-slate-950 rounded-lg border border-slate-600 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer" title="Tải ảnh tham chiếu lên">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadCharacterImage(id, e)} />
                  {entity.local_image_path ? (
                    <img 
                      src={`http://localhost:8000/api/image?path=${encodeURIComponent(entity.local_image_path)}&t=${Date.now()}`} 
                      alt={entity.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0ibTIxIDE1LTMuMDgtMy4wOGExLjMzIDEuMzMgMCAwIDAtMS44OCAwTCAzIDE2Ii8+PC9zdmc+';
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
                      onChange={(e) => handleUpdateAsset(id, 'name', e.target.value)}
                      className="font-bold text-slate-200 text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-24"
                    />
                    <div className="flex items-center gap-2">
                      <select 
                        value={entity.type} 
                        onChange={(e) => handleUpdateAsset(id, 'type', e.target.value)}
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded outline-none border-none cursor-pointer ${entity.type === 'character' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}
                      >
                        <option value="character">Char</option>
                        <option value="location">Loc</option>
                        <option value="prop">Prop</option>
                      </select>
                      <button 
                        onClick={() => handleDeleteEntity(id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Xoá"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={entity.description || ''} 
                    onChange={(e) => handleUpdateAsset(id, 'description', e.target.value)}
                    placeholder="Mô tả cơ bản (Ngoại hình, tính cách)..."
                    className="text-[10px] text-slate-400 mt-1 w-full bg-slate-900 border border-slate-700 rounded p-1 resize-y min-h-12 focus:outline-none focus:border-indigo-500"
                  />
                  
                  <textarea 
                    value={entity.variation_context || ''} 
                    onChange={(e) => handleUpdateAsset(id, 'variation_context', e.target.value)}
                    placeholder="Mô tả Variation mới (vd: Kael đang giận dữ, ánh mắt hình viên đạn...)"
                    className="text-[10px] text-amber-500/80 mt-1 w-full bg-slate-900 border border-slate-700 rounded p-1 resize-y min-h-12 focus:outline-none focus:border-amber-500"
                  />
                  
                  <div className="mt-2 text-[9px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-700/50 relative group/prompt flex flex-col gap-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-indigo-400">Image Prompt:</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleEnhancePrompt(id)}
                          disabled={enhancingAssetId === id}
                          className="px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 disabled:opacity-50 rounded text-[8px] font-medium transition-colors flex items-center gap-1 border border-indigo-500/50"
                          title="Tự động Enhance Prompt bằng Gemini"
                        >
                          {enhancingAssetId === id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                          Enhance
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleGenerateAssetImage(id, (entity.image_prompt ? entity.image_prompt + ', ' + globalArtStyle : '')); }}
                          disabled={isGeneratingAsset === id}
                          className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-[8px] font-medium transition-colors flex items-center gap-1"
                          title="Tạo ảnh tự động bằng FlowKit AI"
                        >
                          {isGeneratingAsset === id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                          {isGeneratingAsset === id ? "Đang tạo..." : "Gen AI"}
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={entity.image_prompt || ''} 
                      onChange={(e) => handleUpdateAsset(id, 'image_prompt', e.target.value)}
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
                  
                  {/* Variation Gallery */}
                  {entity.variations && entity.variations.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'thin' }}>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 shrink-0 font-bold">Variations:</span>
                      {entity.variations.map((v: any) => {
                        const isPrimary = entity.local_image_path === v.local_image_path;
                        const isReference = entity.references && entity.references.some((r: any) => r.media_id === v.media_id);
                        
                        let borderClass = 'border-slate-700 hover:border-slate-400 opacity-70 hover:opacity-100';
                        if (isPrimary) {
                          borderClass = 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] opacity-100';
                        } else if (isReference) {
                          borderClass = 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] opacity-100';
                        }

                        return (
                          <div 
                            key={v.id} 
                            className={`w-8 h-8 shrink-0 rounded border-2 overflow-hidden cursor-pointer transition-all ${borderClass} relative group/var`}
                            onClick={() => handleToggleReference(id, v.id)}
                            title={`Name: ${v.name || 'Variation'}\nPrompt: ${v.prompt}\nClick to toggle reference status\nKéo thả hình này vào Flow để tạo Node tham chiếu`}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData('application/reactflow', JSON.stringify({
                                id: id,
                                type: 'variation',
                                name: v.name,
                                variationId: v.id,
                                imagePath: v.local_image_path,
                                mediaId: v.media_id
                              }));
                            }}
                          >
                            <img 
                              src={`http://localhost:8000/api/image?path=${encodeURIComponent(v.local_image_path)}`} 
                              className="w-full h-full object-cover" 
                              alt={v.name || 'variation'}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/var:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(`http://localhost:8000/api/image?path=${encodeURIComponent(v.local_image_path)}`);
                                }}
                                className="hover:scale-110 transition-transform"
                                title="Xem ảnh lớn"
                              >
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if(window.confirm("Xóa variation này?")) {
                                    handleDeleteVariation(id, v.id);
                                  }
                                }}
                                className="hover:scale-110 transition-transform"
                                title="Xóa variation"
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <img 
            src={previewImage} 
            className="max-w-full max-h-full object-contain rounded border border-slate-700 shadow-2xl" 
            alt="Preview" 
          />
        </div>
      )}
    </div>
  );
};

export default VideoStudio;
