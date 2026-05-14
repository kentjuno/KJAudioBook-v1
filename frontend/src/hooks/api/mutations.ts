// ==========================================================================
// hooks/api/mutations.ts
// Centralized TanStack Query mutation hooks for common API calls.
// Caller passes onSuccess/onError when wiring side effects.
// ==========================================================================
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { API } from '../../config';
import type { ScriptLine, CharacterMetadata, VoiceParams } from '../../types';

// ── Script / AI ─────────────────────────────────────────────────────────────

export function useGenerateScript() {
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await axios.post(API.generateScript, { text });
      return res.data as { script: ScriptLine[] };
    },
  });
}

export function useExtractEntities() {
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await axios.post(API.extractEntities, { text });
      return res.data as { metadata: Record<string, CharacterMetadata> };
    },
  });
}

export function useEnhanceMotion() {
  return useMutation({
    // _lineId is a UI passthrough so callers can read mutation.variables._lineId
    // to identify which row is currently enhancing. Stripped before sending.
    mutationFn: async (vars: { dialogue: string; motion_prompt: string; _lineId?: number }) => {
      const { _lineId, ...payload } = vars;
      void _lineId;
      const res = await axios.post(API.enhanceMotion, payload);
      return res.data as { prompt: string };
    },
  });
}

export function useEnhancePrompt() {
  return useMutation({
    // _assetId is a UI passthrough so callers can identify which asset row is
    // currently enhancing via mutation.variables._assetId. Stripped before send.
    mutationFn: async (vars: {
      prompt: string;
      asset_type: string;
      asset_name: string;
      global_style: string;
      _assetId?: string;
    }) => {
      const { _assetId, ...payload } = vars;
      void _assetId;
      const res = await axios.post(API.enhancePrompt, payload);
      return res.data as { prompt: string };
    },
  });
}

// ── Voice ──────────────────────────────────────────────────────────────────

export function useCreateSyntheticVoice() {
  return useMutation({
    mutationFn: async (vars: { speaker: string; instruct: string }) => {
      const res = await axios.post(API.createSyntheticVoice, vars);
      return res.data as { message?: string };
    },
  });
}

// ── Project profile ────────────────────────────────────────────────────────

export function useSaveProfile() {
  return useMutation({
    mutationFn: async (vars: {
      speakerVoiceParams: Record<string, VoiceParams>;
      lockedVoices: Record<string, boolean>;
      flowkitProjectId: string;
    }) => {
      const res = await axios.post(API.projectProfile, vars);
      return res.data;
    },
  });
}
