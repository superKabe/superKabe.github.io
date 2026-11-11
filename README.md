# Kaden Suderman Portfolio

The source for [kaden-suderman.com](https://kaden-suderman.com), a project-first
portfolio for computer vision, embedded systems, and applied imaging work.

## Stack

The site uses semantic HTML, modern CSS, and small ES modules. It intentionally
has no framework or build step: GitHub Pages can serve the source directly, and
the interactive project labs can still use browser APIs, Web Workers, and
WebAssembly when needed.

## Site structure

- A responsive one-page portfolio with introduction, featured work, about, and
  contact sections.
- A keyboard-accessible project carousel with real project media, touch scrolling,
  and links to each source repository.
- A dedicated ISP demo at `/projects/isp/` that processes the bundled raw Bayer
  frame locally in a Web Worker and exposes the implementation details for every
  stage.
- An industrial-video timeline audit at `/projects/qwen-timeline/` with synchronized
  playback, human and Qwen3-VL event tracks, run comparison, and data-backed metrics.
- A small portrait Easter egg built with CSS animation and an accessible button.
- A browser résumé page at `/resume/` using the current PDF.

## Local preview

Node.js is the only local prerequisite. From the repository root:

```powershell
node .\tools\dev-server.mjs
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Deployment

The repository is deployed through GitHub Pages and retains the custom domain
declared in `CNAME`.
