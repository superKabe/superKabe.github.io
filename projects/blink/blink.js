const MODULE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const startButton = document.querySelector("[data-start-camera]");
const stopButton = document.querySelector("[data-stop-camera]");
const poster = document.querySelector("[data-blink-poster]");
const liveCamera = document.querySelector("[data-live-camera]");
const video = document.querySelector("[data-blink-video]");
const canvas = document.querySelector("[data-blink-canvas]");
const status = document.querySelector("[data-blink-status]");
const countOutput = document.querySelector("[data-blink-count]");
const bpmOutput = document.querySelector("[data-blink-bpm]");
const earOutput = document.querySelector("[data-blink-ear]");
const thresholdOutput = document.querySelector("[data-blink-threshold]");
const earMeter = document.querySelector("[data-ear-meter]");

let landmarker;
let stream;
let frameRequest;
let running = false;
let lastVideoTime = -1;
let openSamples = [];
let threshold = 0.23;
let calibrated = false;
let closedFrames = 0;
let wasClosed = false;
let blinkCount = 0;
let blinkTimes = [];

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function eyeAspectRatio(points, indices) {
  const p = indices.map((index) => points[index]);
  return (distance(p[1], p[5]) + distance(p[2], p[4])) / (2 * Math.max(.0001, distance(p[0], p[3])));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function drawEyes(points) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#8cf0bc";
  context.strokeStyle = "rgba(140,240,188,.72)";
  context.lineWidth = 2;
  [LEFT_EYE, RIGHT_EYE].forEach((eye) => {
    context.beginPath();
    eye.forEach((index, position) => {
      const point = points[index];
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (position === 0) context.moveTo(x, y); else context.lineTo(x, y);
      context.fillRect(x - 2, y - 2, 4, 4);
    });
    context.closePath();
    context.stroke();
  });
}

function updateMetrics(ear) {
  if (!calibrated) {
    openSamples.push(ear);
    if (openSamples.length >= 45) {
      threshold = median(openSamples) * .72;
      calibrated = true;
      if (status) { status.textContent = "Calibrated. Blink naturally."; status.dataset.tone = "good"; }
    }
  }

  const closed = calibrated && ear < threshold;
  closedFrames = closed ? closedFrames + 1 : 0;
  if (closedFrames >= 2) wasClosed = true;
  if (!closed && wasClosed) {
    blinkCount += 1;
    blinkTimes.push(performance.now());
    wasClosed = false;
  }
  const cutoff = performance.now() - 60000;
  blinkTimes = blinkTimes.filter((time) => time >= cutoff);

  if (countOutput) countOutput.textContent = String(blinkCount);
  if (bpmOutput) bpmOutput.textContent = String(blinkTimes.length);
  if (earOutput) earOutput.textContent = ear.toFixed(3);
  if (thresholdOutput) thresholdOutput.textContent = calibrated ? threshold.toFixed(3) : `${openSamples.length} / 45`;
  if (earMeter) {
    earMeter.style.width = `${Math.min(100, Math.max(0, ear / .4 * 100))}%`;
    earMeter.classList.toggle("is-closed", closed);
  }
}

async function ensureLandmarker() {
  if (landmarker) return landmarker;
  const module = await import(MODULE_URL);
  const vision = await module.FilesetResolver.forVisionTasks(WASM_URL);
  landmarker = await module.FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: .6,
    minFacePresenceConfidence: .6,
    minTrackingConfidence: .6,
  });
  return landmarker;
}

function processFrame() {
  if (!running || !landmarker) return;
  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, performance.now());
    const points = result.faceLandmarks?.[0];
    if (points) {
      const ear = (eyeAspectRatio(points, LEFT_EYE) + eyeAspectRatio(points, RIGHT_EYE)) / 2;
      drawEyes(points);
      updateMetrics(ear);
    } else {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      if (status) { status.textContent = "No face found. Face the camera in even light."; status.dataset.tone = ""; }
    }
  }
  frameRequest = requestAnimationFrame(processFrame);
}

async function start() {
  try {
    startButton.disabled = true;
    if (status) { status.textContent = "Loading the face landmark model…"; status.dataset.tone = ""; }
    await ensureLandmarker();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    openSamples = [];
    calibrated = false;
    closedFrames = 0;
    wasClosed = false;
    poster.hidden = true;
    liveCamera.hidden = false;
    running = true;
    stopButton.disabled = false;
    if (status) status.textContent = "Hold your eyes naturally open while the demo calibrates.";
    processFrame();
  } catch (error) {
    startButton.disabled = false;
    if (status) { status.textContent = error.name === "NotAllowedError" ? "Camera permission was not granted." : "The browser demo could not start. The original recording is still available."; status.dataset.tone = "error"; }
  }
}

function stop() {
  running = false;
  cancelAnimationFrame(frameRequest);
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  liveCamera.hidden = true;
  poster.hidden = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  if (status) { status.textContent = "Camera stopped. Showing the original desktop demo."; status.dataset.tone = ""; }
}

startButton?.addEventListener("click", start);
stopButton?.addEventListener("click", stop);
window.addEventListener("pagehide", stop);
