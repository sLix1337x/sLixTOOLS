
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

# sLixTOOLS 🛠️

**Free, offline-first media conversion tools running entirely in your browser.**

sLixTOOLS is a high-performance web application offering a suite of file manipulation utilities (Video-to-GIF, Image Compression, PDF Editing). It prioritizes privacy by processing files client-side using WebAssembly and modern browser APIs, ensuring user data never leaves their device.

## ⚡ Tech Stack

*   **Core**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS, shadcn/ui, Custom "Indie" Theme
*   **Animation**: Framer Motion, CSS `clip-path` (GPU Optimized)
*   **Processing**: `ffmpeg.wasm` (Video), `gif.js` (GIF), `pdf-lib` + `pdfjs-dist` (PDF), `jszip` (Archives)
*   **State**: React Hooks (no global store bloat)

## ✨ Key Features

*   **Client-Side Processing**: Zero server uploads. All conversions happen locally for maximum speed and privacy.
*   **High Performance**: GPU-accelerated layout transitions (`clip-path`) and smart animation scoping (`isVisible`) for 60fps scrolling.
*   **Lazy Loading**: Tools and libraries (like `lenis` and `ffmpeg`) are loaded on-demand to keep the initial bundle size small.
*   **Modern UI**: Glassmorphism aesthetic with custom "glitch" interactions and smooth full-page scrolling.
*   **Installable**: ships a web app manifest so it can be added to your home screen / installed as an app.

## 🚀 How to Run

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation
1.  **Clone the repo:**
    ```bash
    git clone https://github.com/sLix1337x/sLixTOOLS.git
    cd sLixTOOLS
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # Note: Workers are automatically copied to public/ via vite.config.ts
    ```
3.  **Start Development Server:**
    ```bash
    npm run dev
    # Open http://localhost:3000
    ```

### Build for Production
To generate the optimized static site in the `dist/` folder:
```bash
npm run build
```
The build process includes chunk splitting (separating vendor libs like `framer-motion` and `react`). `public/404.html` is a static redirect page (copied as-is like any other public asset) that sends GitHub Pages' deep-link 404s into the app's hash router.

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/amazing-tool`.
3.  Commit your changes: `git commit -m 'Add Amazing Tool'`.
4.  Push to the branch: `git push origin feature/amazing-tool`.
5.  Open a Pull Request.


🌐 **Live Demo:** [https://slix1337x.github.io/sLixTOOLS/](https://slix1337x.github.io/sLixTOOLS/)
