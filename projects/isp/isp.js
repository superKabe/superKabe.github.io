const canvas = document.querySelector("[data-canvas]");
const context = canvas.getContext("2d", { alpha: false });
const runButton = document.querySelector("[data-run]");
const statusText = document.querySelector("[data-status]");
const detailText = document.querySelector("[data-detail]");
const statusDot = document.querySelector("[data-status-dot]");
const progress = document.querySelector("[data-progress]");
const emptyState = document.querySelector("[data-empty]");
const stageTitle = document.querySelector("[data-stage-title]");
const stageDescription = document.querySelector("[data-stage-description]");
const stageOriginal = document.querySelector("[data-stage-original]");
const stageBrowser = document.querySelector("[data-stage-browser]");
const stageButtons = [...document.querySelectorAll("[data-stage]")];

const stageCopy = {
  raw: {
    title: "Raw Bayer data",
    description: "The sensor records one color value at each pixel location, not a complete RGB pixel.",
    original: "np.fromfile + reshape",
    browser: "fetch + Uint8Array",
  },
  demosaic: {
    title: "Demosaiced image",
    description: "Bilinear interpolation estimates the two missing color channels from neighboring RGGB samples.",
    original: "cv2.cvtColor(COLOR_BayerRG2BGR)",
    browser: "Bilinear RGGB interpolation",
  },
  color: {
    title: "Color and gamma correction",
    description: "A fixed 3 × 3 matrix corrects the sensor response before a 1/2.2 gamma curve prepares the image for display.",
    original: "NumPy matrix multiply + gamma",
    browser: "Int32 matrix math + lookup table",
  },
  denoise: {
    title: "Luminance-guided denoising",
    description: "A tuned 3 × 3 bilateral pass reduces small variations while using luminance differences to avoid crossing visible edges.",
    original: "cv2.bilateralFilter(d=25, 60, 60)",
    browser: "3 × 3 joint bilateral, σr=22",
  },
  sharpen: {
    title: "Controlled edge enhancement",
    description: "A small unsharp mask restores local detail without reintroducing the broad, oversharpened halos from the first port.",
    original: "skimage.filters.laplace",
    browser: "3 × 3 unsharp mask, amount=0.85",
  },
  contrast: {
    title: "Final contrast",
    description: "The useful 30 to 240 intensity range is mapped across the full 8-bit output.",
    original: "exposure.rescale_intensity",
    browser: "Linear 30–240 remap",
  },
};

let worker;
let stages = {};
let outputWidth = 1024;
let outputHeight = 540;

function setStatus(title, detail, state = "working") {
  statusText.textContent = title;
  detailText.textContent = detail;
  statusDot.classList.toggle("is-ready", state === "ready");
  statusDot.classList.toggle("is-error", state === "error");
}

function showStage(name) {
  const pixels = stages[name];
  if (!pixels) return;

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.putImageData(new ImageData(pixels, outputWidth, outputHeight), 0, 0);
  emptyState.classList.add("is-hidden");

  stageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stage === name);
  });

  const copy = stageCopy[name];
  stageTitle.textContent = copy.title;
  stageDescription.textContent = copy.description;
  stageOriginal.textContent = copy.original;
  stageBrowser.textContent = copy.browser;
}

function runPipeline() {
  worker?.terminate();
  stages = {};
  runButton.disabled = true;
  stageButtons.forEach((button) => {
    button.disabled = true;
    button.classList.remove("is-active");
  });
  emptyState.classList.remove("is-hidden");
  emptyState.textContent = "Loading the raw sensor data...";
  progress.value = 2;
  setStatus("Loading image", "Fetching the 8.4 MB raw camera frame.");

  worker = new Worker("isp-worker.js", { type: "module" });
  worker.addEventListener("message", ({ data }) => {
    if (data.type === "progress") {
      progress.value = data.value;
      setStatus(data.title, data.detail);
      return;
    }

    if (data.type === "complete") {
      outputWidth = data.width;
      outputHeight = data.height;
      stages = Object.fromEntries(
        Object.entries(data.stages).map(([name, buffer]) => [name, new Uint8ClampedArray(buffer)]),
      );

      stageButtons.forEach((button) => {
        button.disabled = false;
      });
      progress.value = 100;
      runButton.disabled = false;
      setStatus("Processing complete", `Finished locally in ${(data.elapsedMs / 1000).toFixed(1)} seconds.`, "ready");
      showStage("contrast");
      worker.terminate();
      worker = undefined;
      return;
    }

    if (data.type === "error") {
      progress.value = 0;
      runButton.disabled = false;
      emptyState.textContent = "The demo could not finish. Try running it again.";
      setStatus("Demo error", data.message, "error");
    }
  });

  worker.addEventListener("error", (error) => {
    progress.value = 0;
    runButton.disabled = false;
    setStatus("Demo error", error.message || "The browser worker stopped unexpectedly.", "error");
  });

  worker.postMessage({ type: "run", url: "assets/chart.raw" });
}

stageButtons.forEach((button) => {
  button.addEventListener("click", () => showStage(button.dataset.stage));
});

runButton.addEventListener("click", runPipeline);

const currentYear = document.querySelector("[data-current-year]");
if (currentYear) currentYear.textContent = new Date().getFullYear();

runPipeline();
