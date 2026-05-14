# UI/UX Polish Plan

**Scope:** Small, 1-2 days of polish (~8-10 hours total)
**Target pain:** "UI feels cluttered or busy" — reduce visual noise, tighten hierarchy
**Created:** 2026-05-14
**Status:** Awaiting approval

---

## Guiding principles

- **No new dependencies** unless absolutely required (CSS transitions over animation libraries)
- **Each item independently revertable** — one commit per item
- **Verify TypeScript clean after each item** — `npx tsc --noEmit`
- **No behavior changes** — only visual / ergonomic; existing flows must still work
- **Persist user choices** where it makes sense (e.g. panel collapse state)

---

## Day 1 — Visual baseline (highest feel-per-minute)

### [x] 1. Header: collapse secondary actions into a "File ▾" menu
- **Files:** `components/layout/Header.tsx`
- **Today:** 6 buttons crammed in the header (Load JSON, Save JSON, Upload .md, Render All, etc.)
- **Change:**
  - Group Load/Save/Upload into a single dropdown labeled "File ▾"
  - Keep the **primary action** (Render All / Mix & Export / Sync To Timeline) prominent and on the right
- **Outcome:** Header drops from 6 → 2 visible buttons per tab
- **Risk:** Low. Pure visual reorg.

### [x] 2. Tighten the color palette
- **Files:** `components/layout/Header.tsx`, `components/script/ScriptSidebar.tsx`, `components/timeline/*`, button instances in `App.tsx`
- **Today:** indigo, purple, amber, orange, emerald, red, plus indigo→purple gradients
- **Change:**
  - Keep only: **indigo** (primary), **emerald** (success), **amber** (warning/secondary action), **red** (danger)
  - Drop purple and orange entirely
  - Replace indigo-to-purple gradients with solid indigo
- **Outcome:** Reduces visual noise; brand feels intentional
- **Risk:** Low. Find/replace tailwind classes.

### [x] 3. Standardize button hierarchy
- Found that buttons were already largely consistent (size-based: full → lg → md).
- Only fix needed: Download link (Post-Production) didn't match other header CTAs (no shadow, smaller padding) — brought it in line.
- Added a doc-comment at top of `Header.tsx` codifying the convention so new buttons follow it.
- **Files:** Component buttons across the app
- **Today:** Mix of `rounded-full` gradient, `rounded-lg` solid, ghost — applied inconsistently
- **Change:** Define 3 tiers in a comment in `Header.tsx`:
  - **Primary** — `rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20`
  - **Secondary** — `rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700`
  - **Tertiary** — `rounded-lg text-slate-300 hover:text-white hover:bg-slate-800`
  - Apply consistently — one primary per tab area, secondaries for support, tertiary for low-priority
- **Risk:** Low

### [ ] 5. Real progress bar under the header
- **Files:** `components/layout/Header.tsx`
- **Today:** "Đang Render (2/10)" as text only inside the button label
- **Change:** Add a thin 2px gradient progress bar across the bottom edge of the header (`absolute bottom-0 left-0 right-0`), width = `(currentLine / totalLines) * 100%`
- **Visible when:** `renderProgress.status === 'rendering' || 'assembling'`
- **Color:** indigo for render, amber for mix
- **Outcome:** Big perceived-quality upgrade for ~5 lines of JSX
- **Risk:** Low

### [ ] 6. Better empty states
- **Files:** `components/script/ScriptSidebar.tsx`, `components/videostudio/VideoAssetsPanel.tsx`
- **Today:** Empty script list shows just the "+ Add Line" button; empty asset panel shows the form only
- **Change:** When `script.length === 0`, show centered icon + tagline + big primary CTA button:
  - Script empty → "Upload .md to start" with FileText icon, single big Upload button
  - Asset panel empty (no `charactersMetadata`) → "Run Extract Entities to detect characters" with sparkle icon, big Extract button
- **Reuse** the existing PropertiesInspector empty state as the visual template
- **Risk:** Low

---

## Day 2 — Ergonomic refinements

### [x] 4. Tooltip pass for all icon-only buttons
Added `title=` to: VideoClip delete X, AudioClip delete X, Timeline play/pause, zoom +/-, Sync-to-Post button, SceneNodeCard "Frame" button. Other buttons already had titles or visible text labels that disambiguate them.
- **Files:** ScriptSidebar (per-line buttons), AudioClip, VideoClip, asset cards
- **Today:** Several icon-only buttons (delete, drag handle, chevron, etc.) have no `title=`
- **Change:** Add `title="..."` to each, in Vietnamese to match the UI language
- **Risk:** Zero

### [ ] 7. Collapsible Voice Casting panel
- **Files:** `components/script/ScriptSidebar.tsx`, `store/useProjectStore.ts`
- **Today:** Right `lg:col-span-4` voice panel always expanded in Audio Studio
- **Change:**
  - Click the panel header to collapse (chevron icon flips)
  - When collapsed: 4/12 → 1/12 column, just a vertical tab/strip; script expands to 11/12
  - Persist state as `isVoicePanelCollapsed: boolean` in `useProjectStore`
- **Risk:** Medium — needs to verify the grid math doesn't break

### [ ] 8. Move secondary per-line actions into a row-hover `⋯` overflow menu
- **Files:** `components/script/ScriptSidebar.tsx`
- **Today:** Each script line shows: render-status chip, delete, motion-enhance, regen prompt, expand chevron, drag handle — all visible by default
- **Change:**
  - Keep visible by default: speaker pill, text, render-status dot, expand chevron
  - Move into a `⋯` overflow shown on row-hover: delete, motion-enhance, regen-prompt, video buttons
- **Risk:** Medium — touches the densest component

### [ ] 8a. Render-status: chip → colored dot
- **Files:** `components/script/ScriptSidebar.tsx`
- **Today:** Full-text status labels per line take a row's worth of width
- **Change:**
  - 6px colored dot: grey (idle), indigo pulse (rendering), emerald (done), red (error)
  - `title=` for the full status text
- **Risk:** Low

### [ ] 9. Subtle motion
- **Files:** `App.tsx` (tab transitions), `index.css` (global transitions)
- **Today:** Tab switches snap; panel collapses snap
- **Change:** Add CSS-only transitions (no library):
  - Tab content: 150ms crossfade via `transition-opacity duration-150`
  - Collapsible panels: `transition-[grid-template-columns] duration-200`
  - Toast already animates (react-hot-toast default)
- **Risk:** Low. Test on each tab.

### [ ] 10. Bottom-of-header sticky status strip
- **Files:** `components/layout/Header.tsx`
- **Today:** Long-running mix uses `toast.loading()` which can drift offscreen
- **Change:** Below the header, a 28px-tall strip visible during `status === 'rendering' || 'assembling'` showing:
  - Operation name ("Render câu thoại" / "FFmpeg encode")
  - Live progress text from `renderProgress` / mix WebSocket message
  - Same gradient progress bar as #5 inside it
- **Outcome:** Replaces transient toast.loading() for long ops with persistent feedback
- **Risk:** Medium — needs the WebSocket progress from Phase 4.3 to populate it; may need a small new state slice for the active operation message
- **Note:** Either keep this OR keep toast.loading — pick one to avoid double feedback

---

## What we are deliberately NOT doing

- ❌ **Light theme toggle** — significant work, low payoff for a solo dev tool
- ❌ **Command palette (Cmd+K)** — fun but ~half a day, out of scope
- ❌ **Animation library (framer-motion)** — CSS transitions cover 80% with zero deps
- ❌ **Mobile responsive** — this is a desktop NLE-style tool
- ❌ **Design system extraction** — too heavy for 1-2 days
- ❌ **Restructuring panel layouts** — only #7 makes one panel collapsible; no major layout changes

---

## Verification per item

After each item:
1. `npx tsc --noEmit` clean
2. Manual smoke test of the touched panel
3. Single git commit (so any item can be reverted in isolation)

After all items:
- Full smoke test: upload .md → render → mix audio → mix video → switch all 3 tabs
- Merge to master

---

## Decisions (locked in 2026-05-14)

1. **Purple — fully drop.** Replace logo gradient with solid indigo too.
2. **Voice Casting — make collapsible** (#7 in scope).
3. **Long-op feedback — sticky header strip** (#10). Remove toast.loading() for long ops; keep toast for short success/error.
4. **Execution order — top to bottom**, one commit per item.
