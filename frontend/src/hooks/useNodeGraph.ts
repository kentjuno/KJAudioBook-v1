import { useCallback, useMemo, useRef } from 'react';
import React from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import type { CharacterMetadata } from '../types';
import AssetNodeCard from '../components/videostudio/AssetNodeCard';
import SceneNodeCard from '../components/videostudio/SceneNodeCard';
import VideoNodeCard from '../components/videostudio/VideoNodeCard';
import DeletableEdge from '../components/videostudio/DeletableEdge';

function loadInitialNodes(): Node[] {
  const saved = localStorage.getItem('video_nodes');
  if (!saved) return [];
  try {
    return JSON.parse(saved).map((n: Node) => ({
      ...n,
      data: {
        ...n.data,
        isGeneratingVideo: n.type === 'video' && !(n.data as any).videoUrl ? true : false,
        isGeneratingFrame: false,
      },
    }));
  } catch {
    return [];
  }
}

function loadInitialEdges(): Edge[] {
  const saved = localStorage.getItem('video_edges');
  if (!saved) return [];
  try { return JSON.parse(saved); } catch { return []; }
}

export function useNodeGraph({
  charactersMetadata,
  onLineIdsChange,
}: {
  charactersMetadata: Record<string, CharacterMetadata>;
  onLineIdsChange: (ids: number[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadInitialEdges());
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  React.useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  React.useEffect(() => { edgesRef.current = edges; }, [edges]);

  React.useEffect(() => {
    localStorage.setItem('video_nodes', JSON.stringify(nodes));
    localStorage.setItem('video_edges', JSON.stringify(edges));
  }, [nodes, edges]);

  const nodeTypes = useMemo(() => ({ asset: AssetNodeCard, scene: SceneNodeCard, video: VideoNodeCard }), []);
  const edgeTypes = useMemo(() => ({ default: DeletableEdge }), []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const asset = charactersMetadata[dragData.id];
      if (!asset) return;

      setNodes((nds) => nds.concat({
        id: `v_${dragData.id}_${Date.now()}`,
        type: 'asset',
        position,
        data: {
          name: asset.name + (dragData.type === 'variation' ? ' (Var)' : ''),
          assetType: asset.type,
          imagePath: dragData.imagePath,
          mediaId: dragData.mediaId,
          baseAssetId: dragData.type === 'variation' ? dragData.id : null,
        },
      }));
    },
    [reactFlowInstance, charactersMetadata, setNodes]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: any[] }) => {
      if (selectedNodes.length === 0) { onLineIdsChange([]); return; }
      const sel = selectedNodes[0];
      const parseIds = (linesStr: string) =>
        linesStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

      if (sel.type === 'scene' && sel.data?.lines) {
        onLineIdsChange(parseIds(sel.data.lines as string));
      } else if (sel.type === 'video') {
        const edge = edgesRef.current.find((e) => e.target === sel.id);
        if (edge) {
          const sceneNode = nodesRef.current.find((n) => n.id === edge.source && n.type === 'scene');
          if (sceneNode?.data?.lines) {
            onLineIdsChange(parseIds(sceneNode.data.lines as string));
            return;
          }
        }
        onLineIdsChange([]);
      } else {
        onLineIdsChange([]);
      }
    },
    [onLineIdsChange]
  );

  return {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    nodesRef, edgesRef,
    nodeTypes, edgeTypes,
    onConnect, onDragOver, onDrop,
    handleSelectionChange,
    reactFlowInstance, setReactFlowInstance,
  };
}
