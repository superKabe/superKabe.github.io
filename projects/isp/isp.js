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
const stageButtons = [...document.querySelectorAll("[data-stage]")];

const stageCopy = {
  raw: ["Raw Bayer data", "The sensor records one color value at each pixel location."],
  demosaic: ["Demosaiced image", "Neighboring samples are combined to estimate red, green, and blue at every pixel."],
  color: ["Color and gamma correction", "The original project matrix corrects color, then a gamma curve prepares the image for display."],
  denoise: ["Edge-aware denoising", "A bilateral filter reduces small variations without treating every edge as noise."],
  sharpen: ["Edge enhancement", "Local contrast around edges is increased to recover detail after denoising."],
  contrast: ["Final contrast", "The useful intensity range is mapped across the full 8-bit output."],
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

  const [title, description] = stageCopy[name];
  stageTitle.textContent = title;
  stageDescription.textContent = description;
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
