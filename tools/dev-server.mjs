import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 4173;
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
};

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let filePath = normalize(join(root, requestPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    const stats = statSync(filePath);
    const contentType = types[extname(filePath)] ?? "application/octet-stream";
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);

    if (request.headers.range && !range) {
      response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
      response.end();
      return;
    }

    if (range) {
      const [, startValue, endValue] = range;
      const suffixLength = startValue === "" ? Number(endValue) : null;
      const start = suffixLength == null
        ? Number(startValue)
        : Math.max(0, stats.size - suffixLength);
      const end = suffixLength == null && endValue !== ""
        ? Number(endValue)
        : stats.size - 1;

      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= stats.size) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        response.end();
        return;
      }

      const safeEnd = Math.min(end, stats.size - 1);
      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Length": safeEnd - start + 1,
        "Content-Range": `bytes ${start}-${safeEnd}/${stats.size}`,
        "Content-Type": contentType,
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(filePath, { start, end: safeEnd }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Length": stats.size,
      "Content-Type": contentType,
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local preview: http://127.0.0.1:${port}`);
});
