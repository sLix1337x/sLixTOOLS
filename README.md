<div align="center">

# 🛠️ sLixTOOLS

**Free, offline-first media conversion tools — running entirely in your browser.**

A suite of 10 file-manipulation utilities that process everything client-side with
WebAssembly and modern browser APIs. **Your files never leave your device.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**[🌐 Live Demo](https://slix1337x.github.io/sLixTOOLS/)** · **[✨ Features](#-key-features)** · **[🚀 Quick Start](#-quick-start)**

</div>

---

## 📦 The Toolbox

| Tool | Description |
|:----:|-------------|
| 🎬 **Video to GIF** | Turn MP4/WEBM clips into smooth GIFs with fine-grained quality controls |
| 🗜️ **GIF Compressor** | Shrink oversized GIFs without gutting the animation |
| 🖼️ **Image Compressor** | Batch-compress JPG/PNG/WebP with a live before/after preview |
| 📐 **Image Resizer** | Resize images by pixels or percentage, bulk-ready |
| 🎥 **Video Converter** | Convert video formats right in the browser via ffmpeg.wasm |
| 🔄 **Image Converter** | Batch-convert many images between PNG / JPG / WebP — quality slider, per-file or ZIP download |
| 🧩 **Image Splitter** | Slice one image into a grid of tiles with view presets |
| 🔤 **Convert Case** | 7 instant case styles (Sentence, Title, camelCase, aLtErNaTiNg…) |
| 🧾 **XML Editor** | Format, validate and minify XML with instant feedback |
| 📄 **PDF Editor** | Merge, split and rearrange PDF pages with pdf-lib |

---

## ✨ Key Features

* 🔒 **100% Client-Side** — zero server uploads; every conversion happens locally for maximum speed and privacy
* ⚡ **High Performance** — GPU-accelerated layout transitions (`clip-path`) and smart animation scoping (`isVisible`) for 60fps scrolling
* 🧳 **Lean First Load** — every route and heavy library (like `ffmpeg.wasm`) is code-split and loaded on demand
* 🎨 **Dual Identity** — an indie-glitch aesthetic on the home page, a graphite + azure "pro" theme across the tools
* 📱 **Installable** — ships a web app manifest, so it installs to your home screen like a native app
* 🧪 **Tested** — 41 unit tests via Vitest, strict TypeScript, ESLint-clean

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| **Core** | React 18 · TypeScript · Vite |
| **Styling** | Tailwind CSS · shadcn/ui · dual-theme design system |
| **Animation** | Framer Motion · CSS `clip-path` (GPU-optimized) |
| **Processing** | `ffmpeg.wasm` (video) · `gif.js` (GIF) · `pdf-lib` + `pdfjs-dist` (PDF) · `jszip` (archives) |
| **State** | React Hooks — no global-store bloat |

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** v18+
* **npm**

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/sLix1337x/sLixTOOLS.git
cd sLixTOOLS

# 2. Install dependencies (workers are auto-copied to public/ via vite.config.ts)
npm install

# 3. Start the dev server — Vite prints the URL (http://localhost:5173/sLixTOOLS/)
npm run dev
```

### Production Build

```bash
npm run build     # optimized static site in dist/
npm run preview   # smoke-test the production build locally
```

The build splits vendor chunks (`framer-motion`, `react`, ffmpeg…). `public/404.html` is a static redirect page that routes GitHub Pages deep-link 404s into the app's hash router.

### Tests & Lint

```bash
npm test          # Vitest — 41 tests
npm run lint      # ESLint
```

### Deploy

```bash
npm run deploy    # predeploy builds, then pushes dist/ via gh-pages
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-tool`
3. Commit your changes: `git commit -m 'Add Amazing Tool'`
4. Push to the branch: `git push origin feature/amazing-tool`
5. Open a Pull Request

---

<div align="center">

**[🌐 Try it now → slix1337x.github.io/sLixTOOLS](https://slix1337x.github.io/sLixTOOLS/)**

MIT © sLix1337x

</div>
