import React from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import type { ScriptLine, CharacterMetadata } from './types';
import { API } from './config';
import { VideoStudioContext } from './components/videostudio/VideoStudioContext';
import VideoSidebar from './components/videostudio/VideoSidebar';
import VideoAssetsPanel from './components/videostudio/VideoAssetsPanel';
import { useNodeGraph } from './hooks/useNodeGraph';
import { useAIDirector } from './hooks/useAIDirector';

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
}

const VideoStudio: React.FC<VideoStudioProps> = ({
  script,
  charactersMetadata,
  setCharactersMetadata,
  flowkitProjectId,
  setFlowkitProjectId,
  handleUploadCharacterImage,
  handleGenerateAssetImage,
  handleDeleteEntity,
  isGeneratingAsset,
}) => {
  const [activeVideoNodeLineIds, setActiveVideoNodeLineIds] = React.useState<number[]>([]);
  const [globalArtStyle, setGlobalArtStyle] = React.useState('Cinematic, highly detailed, Unreal Engine 5');
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const scriptListRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  const {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    nodesRef, edgesRef,
    nodeTypes, edgeTypes,
    onConnect, onDragOver, onDrop,
    handleSelectionChange,
    reactFlowInstance, setReactFlowInstance,
  } = useNodeGraph({ charactersMetadata, onLineIdsChange: setActiveVideoNodeLineIds });

  const {
    isGeneratingStoryboard, isExtractingEntities, enhancingAssetId,
    handleGenFrame, handleGenVideo, handleRegenScenePrompt,
    handleGenerateStoryboard, handleExtractEntities, handleEnhancePrompt,
  } = useAIDirector({
    script, charactersMetadata, setCharactersMetadata,
    globalArtStyle, nodesRef, edgesRef, setNodes, setEdges,
  });

  React.useEffect(() => {
    if (activeVideoNodeLineIds.length > 0) {
      const el = scriptListRefs.current[activeVideoNodeLineIds[0]];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeVideoNodeLineIds]);

  // Asset management callbacks
  const handleUpdateAsset = React.useCallback(async (id: string, field: string, value: string) => {
    setCharactersMetadata(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    try { await axios.post(API.updateAsset, { id, field, value }); } catch (e) { console.error(e); }
  }, [setCharactersMetadata]);

  const handleAddAsset = React.useCallback(() => {
    const id = `asset_${Date.now()}`;
    setCharactersMetadata(prev => ({
      ...prev,
      [id]: { name: 'New Asset', type: 'character', description: '', image_prompt: '', local_image_path: '', media_id: null, last_uploaded_at: 0 },
    }));
  }, [setCharactersMetadata]);

  const handleDeleteVariation = React.useCallback(async (assetId: string, variationId: string) => {
    try {
      const res = await axios.post(API.deleteVariation, { asset_id: assetId, variation_id: variationId });
      if (res.data.status === 'success') setCharactersMetadata(res.data.metadata);
    } catch (e: any) { alert('Lỗi xoá variation: ' + e.message); }
  }, [setCharactersMetadata]);

  const handleToggleReference = React.useCallback(async (assetId: string, variationId: string) => {
    try {
      const res = await axios.post(API.toggleReferenceVariation, { asset_id: assetId, variation_id: variationId });
      if (res.data.status === 'success') setCharactersMetadata(res.data.metadata);
    } catch { alert('Lỗi khi chuyển đổi ảnh tham chiếu!'); }
  }, [setCharactersMetadata]);

  return (
    <div className="flex w-full overflow-hidden border border-slate-800 rounded-xl" style={{ height: 'calc(100vh - 140px)' }}>
      <VideoSidebar
        script={script}
        activeLineIds={activeVideoNodeLineIds}
        isGeneratingStoryboard={isGeneratingStoryboard}
        onGenerateStoryboard={handleGenerateStoryboard}
        scriptListRefs={scriptListRefs}
      />

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

      <VideoAssetsPanel
        charactersMetadata={charactersMetadata}
        flowkitProjectId={flowkitProjectId}
        setFlowkitProjectId={setFlowkitProjectId}
        globalArtStyle={globalArtStyle}
        setGlobalArtStyle={setGlobalArtStyle}
        isExtractingEntities={isExtractingEntities}
        isGeneratingAsset={isGeneratingAsset}
        enhancingAssetId={enhancingAssetId}
        script={script}
        onExtractEntities={handleExtractEntities}
        onAddAsset={handleAddAsset}
        onUpdateAsset={handleUpdateAsset}
        onDeleteEntity={handleDeleteEntity}
        onUploadCharacterImage={handleUploadCharacterImage}
        onGenerateAssetImage={handleGenerateAssetImage}
        onEnhancePrompt={(id) => handleEnhancePrompt(id, handleUpdateAsset)}
        onToggleReference={handleToggleReference}
        onDeleteVariation={handleDeleteVariation}
        onPreviewImage={setPreviewImage}
      />

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} className="max-w-full max-h-full object-contain rounded border border-slate-700 shadow-2xl" alt="Preview" />
        </div>
      )}
    </div>
  );
};

export default VideoStudio;
