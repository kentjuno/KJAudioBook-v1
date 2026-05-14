import React from 'react';
import type { CharacterMetadata } from '../../types';

export interface VideoStudioContextType {
  onGenFrame: (nodeId: string) => void;
  onGenVideo: (nodeId: string) => void;
  onRegenScenePrompt: (nodeId: string) => Promise<void>;
  charactersMetadata: Record<string, CharacterMetadata>;
}

export const VideoStudioContext = React.createContext<VideoStudioContextType | null>(null);
