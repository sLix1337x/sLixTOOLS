# Improvement plan

Findings from a correctness pass (lint, tests, build, code read). Items already
fixed in this branch are listed at the bottom so the plan only carries open work.

Effort: S (< 1 h), M (half day), L (a day or more).

## P0 - broken or misleading for users

### GIF Compressor options are ignored by the engine
- **Problem:** The UI exposes `compressionMethod`, `gifsicle`, `lossy`, `lossyLevel`,
  `optimizationLevel`, `dithering`, but `compressGif` only reads `quality`, `maxWidth`,
  `maxHeight`, `frameSkip`. Users tune knobs that do nothing.
- **Files:** `src/pages/tools/GifCompressor.tsx`, `src/utils/gifCompressor.ts`
- **Fix:** Remove the dead controls (preferred) or wire the real ones: `dithering` maps to
  gif.js `dither`, `optimizationLevel` to `quality`. Drop gifsicle/lossy entirely unless a
  wasm gifsicle build is added.
- **Effort:** S to remove, M to wire.

### Video tools advertise formats the browser cannot decode
- **Problem:** Video to GIF decodes with `<video>` + canvas, so AVI/FLV/WMV/ASF/MKV
  (non-VP9/H.264) fail at `loadedmetadata` with a generic error, yet the drop zone and
  help text list them.
- **Files:** `src/pages/tools/VideoToGif.tsx` (help text), `src/components/tools/FileUploadArea.tsx`
  (format labels), `src/utils/gifConverter.ts`
- **Fix:** Either list only MP4/WebM/MOV(H.264)/OGG, or route unsupported containers through
  the already-bundled ffmpeg.wasm (`videoProcessor.ts`) to transcode to MP4 first.
- **Effort:** S (text) / M (ffmpeg fallback).

### Sitemap lists `#/` URLs crawlers ignore
- **Problem:** `public/sitemap.xml` and canonicals use hash routes. Googlebot drops the
  fragment, so every tool page indexes as the home page.
- **Files:** `public/sitemap.xml`, `src/App.tsx` (HashRouter), `public/404.html`
- **Fix:** Switch to `BrowserRouter` with `basename={import.meta.env.BASE_URL}`; `404.html`
  already implements the SPA redirect. Then rewrite sitemap/canonicals to path URLs
  (`canonicalFor` in `src/config/externalUrls.ts` is the single place to change).
- **Effort:** M.

## P1 - correctness and quality

### NotFound page off-theme and indexable
- **Problem:** `bg-gray-100` light panel on a dark-only site; no `noindex`; a
  `process.env.NODE_ENV` effect that Vite never defines.
- **Files:** `src/pages/NotFound.tsx`
- **Fix:** Use the dark layout, `<SEO noIndex />`, delete the effect. **Effort:** S.
  (Left untouched here because another agent owns landing/listing UI.)

### Image Compressor recomputes blob size every render and logs success as an error
- **Problem:** `dataURItoBlob(compressedUrl).size` runs in JSX on each render (base64 decode
  of the full image); successful compressions go through `errorLogger.logError`.
- **Files:** `src/pages/tools/ImageCompressor.tsx`
- **Fix:** Keep the compressed `Blob` in state (size is free) and drop the success log.
  **Effort:** S.

### `useUrlFileLoader` callback identity changes every render
- **Problem:** `useCallback` depends on the `options` object, which callers create inline, so
  memoisation is void and effects depending on it re-run.
- **Files:** `src/hooks/useUrlFileLoader.ts`
- **Fix:** Depend on the individual option fields, or keep `options` in a ref. **Effort:** S.

### Video Converter ignores `codec`, `bitrate`, `maxFileSize`
- **Problem:** Options are collected in the UI and typed, but `compressVideo` only uses
  quality/resolution/fps.
- **Files:** `src/pages/tools/VideoConverter.tsx`, `src/utils/videoProcessor.ts`
- **Fix:** Pass `-c:v`, `-b:v`, and a two-pass size target to ffmpeg, or remove the controls.
  **Effort:** M.

### Domain ambiguity (slixtools.io vs github.io)
- **Problem:** `EXTERNAL_URLS.OG_IMAGE`, `SEO` default `url`, robots/sitemap host and the
  Pages deploy base differ. OG images 404 on whichever host is not live.
- **Files:** `src/config/externalUrls.ts`, `src/components/SEO.tsx`, `public/robots.txt`,
  `public/sitemap.xml`, `vite.config.ts`
- **Fix:** One `SITE_ORIGIN` constant derived from `window.location.origin` at runtime and a
  build-time env for the static files. **Effort:** S.

## P2 - hygiene

- **Lint warnings (3):** `PdfTextBox.tsx:158` missing `hasMoved` dep; `PdfEditor.tsx:1146`
  unnecessary `zoom` dep; `FooterLinks.tsx:3` non-component export (move `CopyrightNotice`
  to its own file). Effort: S.
- **`vite.config.ts` manualChunks** has a dead `/lenis/` entry (dependency not installed).
  Effort: S.
- **Video to GIF double object URL:** `gifResult.url` and `GifPreview` each create a URL for
  the same blob. Pass the blob down and create one URL. Effort: S.
- **Test coverage:** no tests for `videoProcessor`, `fileValidation` wildcard matching,
  `useUrlFileLoader`. Add vitest units for the pure parts. Effort: M.

## Fixed in this branch

- gif.js worker leak (`gifConverter.ts`, `gifCompressor.ts`): workers now terminated after
  finish/error/cleanup; `terminateGifWorkers` unit-tested.
- `compressGif` no longer re-wraps its own `GifCompressionError`.
- `SEO.tsx`: `noindex` was immediately contradicted by an unconditional `index, follow` tag.
- CSP `connect-src` blocked every URL file load; now allows `https:` and `blob:`.
- Canonical URLs were relative/mixed-domain; `canonicalFor` builds the absolute hash URL
  that matches `sitemap.xml` for all tool pages.
- Video to GIF: rejected MOV/MKV/AVI because the accept lists used fake MIME names
  (`video/mov`); now `video/*`. Removed dead `conversionState` and a stale-closure
  `setTimeout`; post-edit buttons no longer fake a success toast; added Remove button and
  state reset when a new file is chosen.
- `videoProcessor.ts`: removed 160 lines of commented-out class; byte-by-byte copy loop
  replaced with `slice()`.
- `XmlEditor.tsx`: unused catch bindings.
- `404.html`: SPA redirect now keeps `location.search` (`?url=` deep links).
