# Phase 1.3 — Component Splitting Checklist

> Components are extracted in order of simplicity (least dependencies first).
> Each component imports state directly from Zustand stores — no more prop drilling for shared state.

---

## ✅ 1. `PropertiesInspector.tsx`
**Path:** `src/components/inspector/PropertiesInspector.tsx`  
**Complexity:** Low — reads selected clip state from store, updates clip properties  
**Depends on:** `useProjectStore`, `usePlaybackStore`  
- [x] Extract component from App.tsx
- [x] Wire to Zustand stores directly (no props for state)
- [x] TypeScript compile clean
- [ ] Visual verify: inspector still shows/updates correctly

---

## ✅ 2. `Header.tsx`
**Path:** `src/components/layout/Header.tsx`  
**Complexity:** Low — tab switcher, export/save buttons  
**Depends on:** `useProjectStore` (activeTab), callbacks passed as props  
- [x] Extract tab buttons + project title from App.tsx
- [x] Export/Import/Save buttons wired to props
- [x] TypeScript compile clean

---

## ✅ 3. `ScriptSidebar.tsx`
**Path:** `src/components/script/ScriptSidebar.tsx`  
**Complexity:** High — largest section (voice params, script lines, generation controls)  
**Depends on:** `useProjectStore`, `usePlaybackStore`, many callbacks  
- [x] Extract left sidebar (Audio Studio tab) from App.tsx
- [x] Voice section: speakerVoiceParams, lockedVoices, synthetic voice creation
- [x] Script line list: expandedScriptLines, toggleScriptLine, line checkboxes
- [x] TypeScript compile clean
- [ ] Visual verify: script sidebar still works end-to-end

---

## ✅ 4. `AudioClip.tsx`
**Path:** `src/components/timeline/AudioClip.tsx`  
**Complexity:** Medium — drag logic, waveform rendering  
**Depends on:** Props only (no store needed at this level)  
- [x] Extract audio clip renderer from timeline section of App.tsx
- [x] Drag mousedown handler wired correctly
- [x] Waveform canvas component included (inline)
- [x] TypeScript compile clean

---

## ✅ 5. `VideoClip.tsx`
**Path:** `src/components/timeline/VideoClip.tsx`  
**Complexity:** Medium — drag + resize handles on both edges  
**Depends on:** Props only  
- [x] Extract video clip renderer from timeline section
- [x] Left/right resize handles wired correctly
- [x] Video element ref forwarding preserved
- [x] TypeScript compile clean

---

## ✅ 6. `Timeline.tsx`
**Path:** `src/components/timeline/Timeline.tsx`  
**Complexity:** High — ruler, track rows, clips, playhead, scrolling  
**Depends on:** `useProjectStore`, `usePlaybackStore`, `AudioClip`, `VideoClip`  
- [x] Extract entire timeline panel from App.tsx
- [x] Ruler (time markers) renders correctly
- [x] Audio track rows with speaker labels
- [x] Video track row
- [x] Playhead syncs to timelineTime
- [x] Scroll container preserved
- [x] Zoom controls working
- [x] TypeScript compile clean
- [ ] Visual verify: playback, drag, seek still work

---

## 📊 Progress Summary

| Component | Status | Lines saved |
|-----------|--------|-------------|
| PropertiesInspector | ✅ Done — commit `3ff2d32` | ~130 lines |
| Header | ✅ Done — commit `3ff2d32` | ~60 lines |
| ScriptSidebar | ✅ Done — commit `3ff2d32` | ~450 lines |
| AudioClip | ✅ Done — commit `3ff2d32` | ~60 lines |
| VideoClip | ✅ Done — commit `3ff2d32` | ~80 lines |
| Timeline | ✅ Done — commit `3ff2d32` | ~350 lines |
| **Total** | ✅ **ALL DONE** | **~1130 lines** |

> ⚠️ **Next step:** Wire the new components into App.tsx to replace the old inline JSX blocks.
> App.tsx should drop from ~1962 → ~700 lines after wiring.

---

## 🔲 Còn lại — Wire vào App.tsx

- [x] Thay `<header>...</header>` trong App.tsx → `<Header ... />`
- [x] Thay script + voice panel → `<ScriptSidebar ... />`
- [x] Thay timeline JSX block → `<Timeline ... />`
- [x] Thay inspector JSX block → `<PropertiesInspector />`
- [x] `npx tsc --noEmit` pass clean sau khi wire
- [ ] Visual verify toàn bộ UI hoạt động đúng
- [ ] Git commit checkpoint
