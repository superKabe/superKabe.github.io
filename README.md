# Kaden Suderman — Portfolio

The source for [kaden-suderman.com](https://kaden-suderman.com), a project-first
portfolio for computer vision, embedded systems, and applied imaging work.

## Stack

The site uses semantic HTML, modern CSS, and small ES modules. It intentionally
has no framework or build step: GitHub Pages can serve the source directly, and
the interactive project labs can still use browser APIs, Web Workers, and
WebAssembly when needed.

## V1 structure

- A responsive one-page portfolio with introduction, featured work, about, and
  contact sections.
- A featured Image Signal Processor card with an interactive raw/processed
  comparison sourced from the original project notebook.
- A dedicated ISP project lab at `/projects/isp/`, ready for the client-side
  processing implementation.

## Local preview

Node.js is the only local prerequisite. From the repository root:

```powershell
node .\tools\dev-server.mjs
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Deployment

The repository is deployed through GitHub Pages and retains the custom domain
declared in `CNAME`.
