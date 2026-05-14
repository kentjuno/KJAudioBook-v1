# 🏗️ Refactoring Plan: AudioBook Studio 

This document outlines the strategy for breaking down the massive `App.tsx` and `server.py` files into a modular, maintainable, and scalable architecture.

## 1. Frontend Refactoring (`App.tsx`)

Currently, `App.tsx` handles state management, API calls, event listeners, and complex DAW rendering.

### Phase 1.1: State Extraction (Zustand or React Context)
We will move all project-level states out of `App.tsx` to prevent unnecessary re-renders and clean up the file.
- **`store/useProjectStore.ts`**: Manages `script`, `timelineClips`, `timelineVideoClips`, `activeTab`.
- **`store/usePlaybackStore.ts`**: Manages `isPlayingTimeline`, `timelineTime`, `zoomLevel`, and drag/drop states.

### Phase 1.2: Component Splitting
Break `App.tsx` into smaller, focused components:
- **`components/layout/Header.tsx`**: Top navigation, Export/Save buttons, and project name.
- **`components/script/ScriptSidebar.tsx`**: The entire left column (Voice selection, Line checkboxes, `toggleScriptLine` logic).
- **`components/timeline/Timeline.tsx`**: The core DAW rendering logic (ruler, audio tracks, video tracks).
- **`components/timeline/TimelineClip.tsx`**: Individual audio/video clip renderers with drag-and-drop logic.
- **`components/inspector/PropertiesInspector.tsx`**: The right sidebar for adjusting clip volume, offsets, and keep-sound toggles.

### Phase 1.3: Custom Hooks
Extract massive function logic into reusable hooks:
- **`hooks/useAudioMixer.ts`**: Handles calling `/api/mix-timeline` and downloading.
- **`hooks/useKeyboardShortcuts.ts`**: Extracts the global `useEffect` for Space and Arrow keys.

---

## 2. Backend Refactoring (`server.py`)

`server.py` is acting as a monolithic router, handling everything from serving files to complex `ffmpeg` logic and AI orchestration.

### Phase 2.1: Router Modularity (FastAPI/Flask Blueprints)
Split endpoints by domain into a `routes/` or `routers/` directory:
- **`routers/audio.py`**: `/api/audio`, `/api/generate-tts`
- **`routers/video.py`**: `/api/generate-video`, `/api/check-video-status`
- **`routers/script.py`**: `/api/generate-script`, `/api/regen-prompt`
- **`routers/export.py`**: `/api/mix-timeline`, `/api/mix-video-timeline`

### Phase 2.2: Services Extraction
Move heavy processing out of the route handlers:
- **`services/ffmpeg_service.py`**: Encapsulate all `subprocess.run(["ffmpeg", ...])` logic. The complex filter-graphs for mixing video and audio should live here.
- **`services/ai_service.py`**: Encapsulate MiniMax TTS requests and Gemini LLM subprocess calls. 
- **`services/file_manager.py`**: Handle saving to disk, checking if assets exist, and cleaning up temp files.

### Phase 2.3: `main.py` Entry Point
The new `main.py` will be incredibly lightweight—only responsible for configuring CORS, mounting static files, and registering the routers.

## 3. Core Infrastructure Upgrades

To ensure the system runs smoothly on low-end hardware and can scale to handle 60-minute long projects, we will implement the following:

### 3.1. Centralized Types (`src/types/index.ts`)
Move all interfaces (`TimelineClip`, `ScriptLine`, `VideoNode`) into a single types file. This eliminates cross-file dependency issues and provides better IntelliSense across the app.

### 3.2. Centralized Config (`src/config.ts`)
Remove all hardcoded `http://localhost:8000/api/...` strings. We will use a central configuration file (or `.env`) to manage API endpoints.

### 3.3. IndexedDB for Storage (`localForage`)
Replace `localStorage` (which has a strict 5MB limit) with `localForage`. This allows us to store hundreds of megabytes of script data, timeline configurations, and metadata directly in the browser's IndexedDB without crashing the tab or running out of memory.

### 3.4. Real-time Progress (WebSockets / Fastapi WebSockets)
Currently, rendering operations are mostly blocking or polling. We will implement **WebSockets** (since we use FastAPI/Python, `WebSocket` is natively supported and highly efficient) to stream real-time progress of `ffmpeg` rendering frames to the frontend, updating the UI smoothly without spamming HTTP requests.

### 3.5. Unified Notification System (`react-hot-toast`)
Replace blocking `alert()` calls with a non-intrusive toast notification system (`react-hot-toast`). This will improve the UX when displaying backend errors, API failures, or successful exports.

---

## 🚀 Execution Strategy

To avoid breaking the current stable workflow, we should execute this incrementally:
1. **Step 1**: Start with Frontend UI splitting. We can pull out `PropertiesInspector` and `ScriptSidebar` into separate files without touching state.
2. **Step 2**: Extract `App.tsx` state into a Context/Store.
3. **Step 3**: Split `server.py` into routers, verifying each API endpoint still works.
4. **Step 4**: Extract `ffmpeg` logic into a service.
