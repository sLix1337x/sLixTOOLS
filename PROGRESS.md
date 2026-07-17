# IMPROVEMENTS.md remediation — progress

Source: IMPROVEMENTS.md. Scope decided with user:
- FFmpeg fix: coi-serviceworker (not single-threaded core)
- Routing (5.1 HashRouter→BrowserRouter): explicitly SKIPPED this pass
- Major dependency upgrades (React 18→19, router 6→7, eslint 9→10): explicitly SKIPPED this pass — minor updates only

## Phases (see TaskList for live status)

1. Fix ffmpeg production breakage (1.1) — coi-serviceworker
2. Fix type errors + duplicate exports (1.3), add tsc+eslint CI gate (2.1)
3. Delete dead code + junk files (7, 8), CI cleanup (2.2, 2.4, 2.5)
4. Fix og:image, manifest.json, README claims (1.4, 1.5, 8)
5. Add Vitest + util tests (3)
6a. Mechanical refactors: ErrorBoundary split (4.4), App.tsx route config array (4.5), vite.config.ts worker-copy extraction (4.6)
6b. DEFERRED — PdfEditor god-component split (4.1), tool page hook consolidation (4.2), videoProcessor.ts dedup (4.3). User explicitly asked to defer these to their own session — highest risk/complexity in the whole plan, touches the most actively-used code (PdfEditor.tsx is 1665 lines).
7. SEO minor (5.2, 5.3) + security (6.1, 6.2) — no routing change
8. Accessibility (9) + minor dep updates only (10)

## HANDOFF STATUS (2026-07-17, for next agent/session)

**Phases 1-5 and Phase 6a are complete and verified.** Phase 6b is deferred (needs user re-confirmation). Phases 7-8 not started.

**Phases 1-5 are committed** as `4ca6cc8` ("Fix production ffmpeg breakage, type/lint errors, dead code, PWA metadata, add tests"). Working tree is clean as of this commit — that's your rollback point if Phase 6 needs to be reverted independently.

**Next task: Phase 7** (SEO minor 5.2/5.3 + security 6.1/6.2, no routing change) — see phase list above. Phase 6b remains deferred; do not start it without re-confirming with the user.

**Verification commands** (all currently passing, re-run after any change):
```bash
npx tsc -b --noEmit --pretty false   # must exit 0
npx eslint .                          # must be 0 errors (11 pre-existing warnings OK, see below)
npx vitest run                        # 41 tests must pass
npm run build                         # must succeed
```

**Known pre-existing eslint warnings (11, non-blocking, left as-is across all phases):**
- 6x `react-hooks/exhaustive-deps` (MultiPageRenderer.tsx x3, PdfTextBox.tsx, PdfEditor.tsx — stylistic, not bugs, low priority)
- 4x `@typescript-eslint/no-unused-vars` in XmlEditor.tsx (unused `error` catch bindings)
- 1x `react-refresh/only-export-components` in FooterLinks.tsx

**Next task (Phase 6a) — read task #6 in TaskList for full description.** Three independent, low-risk, no-behavior-change refactors:
1. Split `src/components/ErrorBoundary.tsx` (598 lines) into smaller pieces (e.g. `AppErrorBoundary`/`ToolErrorBoundary`), moving retry/logging/reporting logic to `utils/`.
2. `src/App.tsx` has 15 routes each hand-wrapped in `<Suspense>` with custom fallback text — convert to a route config array mapped over with one shared Suspense wrapper.
3. `vite.config.ts`'s `copyWorkerFiles()`/`copyWorkers()` (~140 lines) does worker copying + dev middleware + MIME fixes inline — extract to `scripts/` or replace with `vite-plugin-static-copy`.

**Deferred (Phase 6b, task #9) — do NOT start without re-confirming with the user first:**
- PdfEditor.tsx (1665 lines) god-component split — `docs/PDF_EDITOR_REDESIGN_PLAN.md` already has a plan, never executed.
- Consolidate ImageCompressor/ImageResizer/ImageConverter/GifCompressor onto the existing `useToolFile`/`useProcessingState`/`ToolPageLayout` shared hooks (only 2 of 9 tool pages currently use them).
- Dedup `videoProcessor.ts`'s two near-identical ffmpeg load/exec blocks (~lines 420-670 and 742-890) into one `loadFFmpeg()`/`runFFmpeg()` helper.

**Also explicitly out of scope for this whole pass (confirmed with user, do not attempt without asking):**
- 5.1: HashRouter → BrowserRouter migration (SEO). Skip entirely.
- Major dependency upgrades: React 18→19, react-router 6→7, eslint 9→10. Only minor/patch updates are in scope (Phase 8, not yet started).

**Gotcha for whoever continues:** this repo has a "GateGuard" pre-tool-use hook that requires a 4-fact justification (importers, affected API, data schema, verbatim user instruction) before the FIRST Edit/Write of each file per session, and before the first Bash command. It re-triggers per new session. Expect it and answer briefly — don't try to bypass it.

## Log

- 2026-07-17: Plan created, tasks #1-8 filed. Starting Phase 1.
- 2026-07-17: Phase 1 done. Installed `coi-serviceworker` npm package (not curled from GitHub directly — auto-mode classifier blocked that; user chose npm route). Wired into vite.config.ts copyWorkerFiles() to copy node_modules/coi-serviceworker/coi-serviceworker.js -> public/coi-serviceworker.js on buildStart/dev server start. Registered `<script src="%BASE_URL%coi-serviceworker.js">` in index.html before the module entry. Added public/coi-serviceworker.js to .gitignore (generated file, same as public/workers/). Verified via `npm run build`: dist/index.html resolves to `/sLixTOOLS/coi-serviceworker.js` and dist/coi-serviceworker.js exists. Did not touch videoProcessor.ts SharedArrayBuffer checks — they should now pass once the service worker's first-load reload completes.
- 2026-07-17: Phase 2 done. Fixed all 57 `tsc -b --noEmit` errors: dedup'd src/hooks/index.ts exports, removed unused imports/vars across ~20 files, fixed real bugs (ParticleBackground missing prop type, PdfThumbnails.tsx pdfjs-dist v5 RenderParameters needs `canvas` field, VideoToGif.tsx handleError metadata objects now JSON.stringify'd to satisfy ErrorMetadata's primitive-only index signature), deleted genuinely dead code (PdfEditor.tsx rotatePage+createRotation, had zero callers). Note: initially over-deleted viewMode/searchText/searchResults state in PdfEditor.tsx (grep missed camelCase setter calls due to case sensitivity) — restored as setter-only destructures `[, setX]` since only the getters were truly unused. eslint: fixed all 11 errors (no-unused-expressions in App.tsx, no-case-declarations in MultiPageRenderer.tsx switch cases, no-explicit-any in PdfSearch.tsx and vite.config.ts using proper pdfjs-dist/Vite/Connect types) — 11 warnings remain (react-hooks/exhaustive-deps, unused catch bindings in XmlEditor.tsx), left as-is, non-blocking. Added tsc+lint gate to .github/workflows/deploy.yml before the build step; also removed the noisy "Debug Environment" step while there (pulls forward 2.5). Verified: tsc exit 0, eslint 0 errors/11 warnings, `npm run build` succeeds.
- 2026-07-17: Phase 3 done. Removed unused deps: @tanstack/react-query (provider was mounted in App.tsx, zero useQuery/useMutation anywhere), react-hook-form + src/components/ui/form.tsx + src/utils/formUtils.ts (dead shadcn boilerplate, zero external importers), @types/jszip (jszip ships its own types). Deleted dead files: src/utils/advancedCaching.ts, memoryManager.ts, errorBoundaryUtils.ts (zero importers), public/sw.js (never registered). Deleted junk: all .DS_Store (excl. node_modules/.git/dist), src/pages/Home_HEADER.txt, public/_redirects (Netlify-only). Moved completed docs (ANALYSIS_REPORT.md, REFACTORING_SUMMARY.md, FINAL_REFACTORING_SUMMARY.md, PDF_EDITOR_REDESIGN_PLAN.md) to docs/ instead of deleting — PDF_EDITOR_REDESIGN_PLAN.md is still needed for Phase 6. CI (2.2/2.3): confirmed clean `npm ci` works without --legacy-peer-deps now that the dead peer-conflicting deps are gone, dropped the flag; also removed `cp dist/index.html dist/404.html` from the build step — it was overwriting Vite's already-correct copy of public/404.html (a working HashRouter deep-link redirect) with a non-functional plain index.html copy. Gated all 15 real console.log calls (videoProcessor.ts, PdfEditor.tsx) behind `import.meta.env.DEV` — left vite.config.ts's build-time Node console.log alone (never ships to client). Reviewed all 8 eslint-disable comments: all are legitimate `catch (_error)` silent-cleanup patterns, no action needed. Verified: tsc exit 0, eslint 0 errors/11 warnings, `npm run build` succeeds, dist/404.html still has the working redirect.
- 2026-07-17: Phase 4 done. Found manifest.json was never actually linked from index.html (zero referrers anywhere) — a bug beyond what IMPROVEMENTS.md 1.5 described. Fixed manifest.json: start_url and icon src now use /sLixTOOLS/ base path; dropped the false "192x192" icon entry (pwa-192x192.png is actually mislabeled SVG content, not a real PNG — using it would break icon rendering) in favor of one honest 512x512 entry using the real formen.png. Added the missing `<link rel="manifest">` and a `theme-color` meta (#2AD587, matching manifest) to index.html. Fixed broken og:image/twitter:image (pointed to non-existent assets/images/slixtool-banner.svg) — repointed to the existing formen.png (512x512) since no real banner asset exists in the repo; a proper 1200x300 banner is a design task, not a code fix. README: corrected false "PWA Ready (Service Workers included)" claim to describe the manifest-based installability that actually exists, added pdfjs-dist/jszip to the tech stack list, corrected the 404.html description now that CI no longer generates it dynamically (Phase 3 removed that step). Verified: `npm run build` succeeds, dist/index.html has correct manifest link and theme-color.
- 2026-07-17: Phase 5 done. Installed vitest + jsdom + @vitest/coverage-v8. Added vitest.config.ts (separate from vite.config.ts, jsdom environment, same @ alias) and `test`/`test:coverage` npm scripts. Wrote 41 tests across 5 files for the pure/near-pure utils named in IMPROVEMENTS.md: formatters.ts (all 7 functions), dataConversion.ts (dataURItoBlob/blobToDataURI round-trip), download.ts (generateFilename, using vi.useFakeTimers for deterministic timestamps), fileValidation.ts (getFileExtension, validateFileExtension, validateFile — using real File/Blob via jsdom), gifCompressor.ts (getOptimalCompressionSettings pure sizing logic; skipped compressGif itself, needs canvas/gif.js worker mocking, out of scope for this pass). One test caught my wrong assumption about getFileExtension's no-dot behavior (returns the whole lowercased string, not '') — fixed the test to match real behavior, not the implementation. Added a "Test" step to deploy.yml between Lint and Build. Verified: all 41 tests pass, tsc/eslint still clean, `npm run build` still succeeds.
- 2026-07-17: Phase 6a done (all 3 mechanical refactors, zero behavior change). (1) `src/components/ErrorBoundary.tsx` (598 lines) split into `src/components/ErrorBoundary/index.tsx` (248 lines — class component, state, lifecycle, retry, handlers), `StandardErrorFallback.tsx` and `FileProcessingErrorFallback.tsx` (pure presentational, one per existing UI variant), plus `src/utils/errorReporting.ts` (170 lines — pure logic: error report build/store/retrieve, category/suggestion heuristics, performance metrics, GitHub issue URL). Kept the `ErrorBoundary` folder as `index.tsx` so `import ErrorBoundary from './components/ErrorBoundary'` in App.tsx/ImageCompressor.tsx resolves unchanged — no caller edits needed. (2) `src/App.tsx`'s 15 hand-wrapped `<Route><Suspense>` blocks replaced with a `lazyRoutes: LazyRouteConfig[]` array + one `.map()` with a shared Suspense wrapper (293 → 207 lines). Note: `exactOptionalPropertyTypes` required `{...(fallbackText ? { text: fallbackText } : {})}` instead of `text={fallbackText}` to preserve LoadingSpinner's default text when a route has no custom fallback. (3) `vite.config.ts`'s `copyWorkerFiles()`/`copyWorkers()` (~140 lines) extracted to new `scripts/viteWorkerCopyPlugin.ts` (218 → 75 lines in vite.config.ts); had to change its internal `resolve(__dirname, ...)` calls to `resolve(__dirname, '..', ...)` since `__dirname` now points at `scripts/` instead of repo root — verified by deleting `public/workers/`, `public/coi-serviceworker.js`, `dist/` and re-running `npm run build` from clean, confirming all 4 worker files + coi-serviceworker.js regenerate correctly and `dist/index.html` still resolves the script path. Added `scripts/**/*.ts` to `tsconfig.node.json` include so `tsc -b` type-checks the new file. Verified: tsc exit 0, eslint 0 errors/11 pre-existing warnings, 41/41 tests pass, `npm run build` succeeds (confirmed via full clean rebuild, not just incremental).
