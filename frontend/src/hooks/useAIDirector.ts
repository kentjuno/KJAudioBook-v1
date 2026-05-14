import { useCallback, useRef } from 'react';
import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { Node, Edge } from '@xyflow/react';
import type { ScriptLine, CharacterMetadata } from '../types';
import { API } from '../config';
import { useExtractEntities, useEnhancePrompt } from './api/mutations';

const FLOWKIT_PROJECT_ID = 'a59651a1-70ff-44b6-ac42-c26d90ad28ef';

function getUpstreamMediaIds(
  nodeId: string,
  nodesRef: React.MutableRefObject<Node[]>,
  edgesRef: React.MutableRefObject<Edge[]>,
  charactersMetadata: Record<string, CharacterMetadata>
): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  const upstreamNodes: Node[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    for (const edge of edgesRef.current.filter((e) => e.target === currentId)) {
      const src = nodesRef.current.find((n) => n.id === edge.source);
      if (src && !visited.has(src.id)) { upstreamNodes.push(src); queue.push(src.id); }
    }
  }

  return upstreamNodes.flatMap((src) => {
    if (src.data.mediaId) return [src.data.mediaId as string];
    const baseId = (src.data.baseAssetId as string) || src.id;
    const entity = charactersMetadata[baseId];
    if (!entity) return [];
    const refs = entity.references?.map((r: any) => r.media_id).filter((id: any) => id && id !== entity.media_id) ?? [];
    return entity.media_id ? [entity.media_id, ...refs] : refs;
  }).filter(Boolean);
}

export function useAIDirector({
  script,
  charactersMetadata,
  setCharactersMetadata,
  globalArtStyle,
  nodesRef,
  edgesRef,
  setNodes,
  setEdges,
}: {
  script: ScriptLine[];
  charactersMetadata: Record<string, CharacterMetadata>;
  setCharactersMetadata: React.Dispatch<React.SetStateAction<Record<string, CharacterMetadata>>>;
  globalArtStyle: string;
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}) {
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = React.useState(false);

  // TanStack Query mutations — isPending replaces manual loading flags
  const extractEntitiesMut = useExtractEntities();
  const enhancePromptMut = useEnhancePrompt();
  const isExtractingEntities = extractEntitiesMut.isPending;
  const enhancingAssetId = enhancePromptMut.isPending
    ? (enhancePromptMut.variables as any)?._assetId ?? null
    : null;

  // Keep a stable ref to globalArtStyle for use in callbacks
  const globalArtStyleRef = useRef(globalArtStyle);
  React.useEffect(() => { globalArtStyleRef.current = globalArtStyle; }, [globalArtStyle]);

  const handleGenFrame = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const mediaIds = getUpstreamMediaIds(nodeId, nodesRef, edgesRef, charactersMetadata);

    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: true } } : n));
    try {
      const res = await axios.post(API.generateSceneFrame, {
        prompt: node.data.prompt,
        project_id: FLOWKIT_PROJECT_ID,
        reference_media_ids: mediaIds,
      });
      const url = res.data.url;
      if (!url) throw new Error('No image URL returned from API');
      setNodes((nds) => nds.map((n) => n.id === nodeId ? {
        ...n, data: { ...n.data, isGenerating: false, frameUrl: url, frameMediaId: res.data.media_id },
      } : n));
    } catch (err: any) {
      toast.error('Lỗi khi gọi API tạo ảnh: ' + err.message);
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false } } : n));
    }
  }, [charactersMetadata, nodesRef, edgesRef, setNodes]);

  const handleGenVideo = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const mediaIds = getUpstreamMediaIds(nodeId, nodesRef, edgesRef, charactersMetadata);

    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: true } } : n));
    try {
      const res = await axios.post(API.generateSceneVideo, {
        prompt: node.data.prompt,
        project_id: FLOWKIT_PROJECT_ID,
        scene_id: nodeId,
        start_image_media_id: node.data.frameMediaId || null,
        reference_media_ids: mediaIds,
      });
      const { operation_name: opName, primary_media_id: mediaId } = res.data;
      if (!opName && !mediaId) throw new Error('No operation_name or primary_media_id returned');

      const yOffset = edgesRef.current.filter((e) => e.source === nodeId).length * 120;
      const videoNodeId = `video_${Date.now()}`;
      setNodes((nds) =>
        nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: false } } : n)
          .concat({
            id: videoNodeId,
            type: 'video',
            position: { x: node.position.x + 350, y: node.position.y + yOffset },
            data: { opName, mediaId, isGeneratingVideo: true, frameUrl: node.data.frameUrl },
          })
      );
      setEdges((eds) => eds.concat({
        id: `e_${nodeId}-${videoNodeId}`,
        source: nodeId,
        target: videoNodeId,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2, opacity: 0.6 },
      }));
    } catch (err: any) {
      toast.error('Lỗi khi gọi API tạo Video: ' + err.message);
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGeneratingVideo: false } } : n));
    }
  }, [charactersMetadata, nodesRef, edgesRef, setNodes, setEdges]);

  const handleRegenScenePrompt = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, prompt: 'Đang phân tích kịch bản và viết lại prompt...' } } : n));
    try {
      let rawText = '';
      if (node.data.lines) {
        const lineIds = (node.data.lines as string).split(',').map((s) => s.trim());
        rawText = script.filter((l) => lineIds.includes(l.id.toString())).map((l) => l.text).join(' ');
      }
      const res = await axios.post(API.enhancePrompt, {
        prompt: rawText || 'A generic scene',
        asset_type: 'scene',
        asset_name: node.data.sceneName,
        global_style: globalArtStyleRef.current,
      });
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, prompt: res.data.prompt } } : n));
    } catch (e: any) {
      toast.error('Lỗi khi Regen Prompt: ' + e.message);
    }
  }, [script, nodesRef, setNodes]);

  const handleGenerateStoryboard = useCallback(async () => {
    setIsGeneratingStoryboard(true);
    try {
      const response = await axios.post(API.generateStoryboard, { script, metadata: charactersMetadata });
      const shots = response.data.shots;
      if (!shots?.length) { toast.error('AI Director không trả về được cảnh nào. Vui lòng thử lại!'); return; }

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const usedAssets = new Set<string>();

      shots.forEach((shot: any, index: number) => {
        const imageNodeId = `shot_${index}`;
        newNodes.push({
          id: imageNodeId, type: 'scene',
          position: { x: 450, y: index * 220 + 50 },
          data: { sceneName: `Scene ${index + 1}`, prompt: shot.visual_prompt, lines: shot.script_line_ids.join(', ') },
        });
        shot.asset_ids?.forEach((assetId: string) => {
          usedAssets.add(assetId);
          newEdges.push({
            id: `e_${assetId}-${imageNodeId}`, source: assetId, target: imageNodeId,
            animated: true, style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
          });
        });
      });

      let assetIndex = 0;
      usedAssets.forEach((assetId) => {
        const asset = charactersMetadata[assetId];
        if (asset) {
          newNodes.push({
            id: assetId, type: 'asset',
            position: { x: 50, y: assetIndex++ * 120 + 50 },
            data: { name: asset.name, assetType: asset.type, imagePath: asset.local_image_path },
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error: any) {
      toast.error('Lỗi khi gọi AI Director: ' + error.message);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [script, charactersMetadata, setNodes, setEdges]);

  const handleExtractEntities = useCallback(() => {
    if (!script.length) return;
    const fullText = script.map((l) => l.text).join('\n\n');
    extractEntitiesMut.mutate(fullText, {
      onSuccess: (data) => {
        if (data?.metadata) {
          setCharactersMetadata(data.metadata);
          toast.success('Đã trích xuất xong Danh sách Nhân Vật & Bối Cảnh!');
        }
      },
      onError: () => toast.error('Lỗi khi trích xuất thực thể. Vui lòng check console backend.'),
    });
  }, [script, setCharactersMetadata, extractEntitiesMut]);

  const handleEnhancePrompt = useCallback((
    id: string,
    handleUpdateAsset: (id: string, field: string, value: string) => void
  ) => {
    const entity = charactersMetadata[id];
    if (!entity) return;
    let basePrompt = entity.description || 'A character';
    if (entity.variation_context) basePrompt = `Context/Action: ${entity.variation_context}. Character description: ${basePrompt}`;

    enhancePromptMut.mutate(
      {
        prompt: basePrompt,
        asset_type: entity.type,
        asset_name: entity.name,
        global_style: globalArtStyleRef.current,
        _assetId: id,
      },
      {
        onSuccess: (data) => handleUpdateAsset(id, 'image_prompt', data.prompt),
        onError: (e: any) => toast.error('Lỗi Enhance: ' + e.message),
      }
    );
  }, [charactersMetadata, enhancePromptMut]);

  return {
    isGeneratingStoryboard, isExtractingEntities, enhancingAssetId,
    handleGenFrame, handleGenVideo, handleRegenScenePrompt,
    handleGenerateStoryboard, handleExtractEntities, handleEnhancePrompt,
  };
}
