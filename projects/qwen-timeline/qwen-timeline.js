const DURATION = 70;

const DATA_URLS = {
  groundTruth: "data/ground_truth.json",
  models: [
    {
      id: "qwen-4b-bf16",
      shortLabel: "4B · BF16",
      trackLabel: "Qwen 4B",
      title: "Qwen3-VL 4B",
      precision: "BF16",
      coverage: 3,
      prediction: "data/timeline_qwen3-vl-4b-instruct_1fps_prediction.json",
      evaluation: "data/qwen3_vl_4b_1fps_evaluation.json",
      run: "data/timeline_qwen3-vl-4b-instruct_1fps_run.json",
    },
    {
      id: "qwen-8b-int8",
      shortLabel: "8B · INT8",
      trackLabel: "Qwen 8B",
      title: "Qwen3-VL 8B",
      precision: "INT8",
      coverage: 4,
      prediction: "data/timeline_qwen3-vl-8b-instruct_1fps_int8_prediction.json",
      evaluation: "data/qwen3_vl_8b_1fps_int8_evaluation.json",
      run: "data/timeline_qwen3-vl-8b-instruct_1fps_int8_run.json",
    },
  ],
};

const state = {
  groundTruth: [],
  models: [],
  activeModelId: null,
  selectedKey: null,
};

const ui = {
  video: document.querySelector("#source-video"),
  videoFallback: document.querySelector("#video-fallback"),
  videoFile: document.querySelector("#video-file"),
  hudTime: document.querySelector("#hud-time"),
  scrubber: document.querySelector("#scrubber"),
  currentTime: document.querySelector("#current-time"),
  durationTime: document.querySelector("#duration-time"),
  nowHuman: document.querySelector("#now-human"),
  nowModel: document.querySelector("#now-model"),
  modelSwitcher: document.querySelector("#model-switcher"),
  activeModelTitle: document.querySelector("#active-model-title"),
  precisionBadge: document.querySelector("#precision-badge"),
  modelTrackLabel: document.querySelector("#model-track-label"),
  metrics: document.querySelector("#metrics"),
  findingCopy: document.querySelector("#finding-copy"),
  ruler: document.querySelector("#ruler"),
  humanTrack: document.querySelector("#human-track"),
  modelTrack: document.querySelector("#model-track"),
  playhead: document.querySelector("#playhead"),
  eventDetail: document.querySelector("#event-detail"),
};

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function positionPercent(value) {
  return `${Math.max(0, Math.min(100, (value / DURATION) * 100))}%`;
}

function activeModel() {
  return state.models.find((model) => model.id === state.activeModelId) ?? state.models[0];
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function normalizeRun(config, prediction, evaluation, run) {
  const matchedPredictions = new Map(
    evaluation.matches.map((match) => [match.prediction_index, match]),
  );
  const unmatchedPredictions = new Map(
    evaluation.unmatched_predictions.map((item) => [item.prediction_index, item]),
  );
  const matchedGroundTruth = new Map(
    evaluation.matches.map((match) => [match.ground_truth_index, match]),
  );

  return {
    ...config,
    evaluation,
    run,
    events: prediction.events.map((event, index) => {
      const match = matchedPredictions.get(index);
      const unmatched = unmatchedPredictions.get(index);
      const invalid = Number(event.start_s) >= Number(event.end_s);
      return {
        ...event,
        index,
        key: `${config.id}-prediction-${index}`,
        source: "model",
        status: invalid ? "invalid" : match ? "matched" : unmatched?.category ?? "unmatched",
        match,
        unmatched,
      };
    }),
    groundTruthStatus: state.groundTruth.map((event, index) => ({
      ...event,
      index,
      key: `${config.id}-human-${index}`,
      source: "human",
      status: matchedGroundTruth.has(index) ? "matched" : "missed",
      match: matchedGroundTruth.get(index),
    })),
  };
}

async function loadData() {
  const groundTruthPayload = await fetchJson(DATA_URLS.groundTruth);
  state.groundTruth = groundTruthPayload.events;

  state.models = await Promise.all(
    DATA_URLS.models.map(async (config) => {
      const [prediction, evaluation, run] = await Promise.all([
        fetchJson(config.prediction),
        fetchJson(config.evaluation),
        fetchJson(config.run),
      ]);
      return normalizeRun(config, prediction, evaluation, run);
    }),
  );
  state.activeModelId = state.models[0]?.id ?? null;
}

function renderRuler() {
  const ticks = [];
  for (let second = 0; second <= DURATION; second += 10) {
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.style.left = positionPercent(second);
    tick.textContent = `${second}s`;
    ticks.push(tick);
  }
  ui.ruler.replaceChildren(...ticks);
}

function renderModelSwitcher() {
  const buttons = state.models.map((model) => {
    const button = document.createElement("button");
    button.className = `model-button${model.id === state.activeModelId ? " active" : ""}`;
    button.type = "button";
    button.textContent = model.shortLabel;
    button.setAttribute("aria-pressed", String(model.id === state.activeModelId));
    button.addEventListener("click", () => {
      state.activeModelId = model.id;
      state.selectedKey = null;
      renderAllModelData();
      updatePlaybackUi(ui.video.currentTime || 0);
    });
    return button;
  });
  ui.modelSwitcher.replaceChildren(...buttons);
}

function createMetric(label, value, suffix = "") {
  const metric = document.createElement("div");
  metric.className = "metric";

  const metricLabel = document.createElement("span");
  metricLabel.className = "metric-label";
  metricLabel.textContent = label;

  const metricValue = document.createElement("span");
  metricValue.className = "metric-value";
  metricValue.textContent = value;
  if (suffix) {
    const small = document.createElement("small");
    small.textContent = suffix;
    metricValue.append(small);
  }

  metric.append(metricLabel, metricValue);
  return metric;
}

function renderMetrics(model) {
  const summary = model.evaluation.summary;
  ui.metrics.replaceChildren(
    createMetric("Matched", `${summary.matched_events}/${summary.ground_truth_events}`),
    createMetric("F1", summary.f1.toFixed(2)),
    createMetric("Mean tIoU", summary.mean_temporal_iou.toFixed(2)),
    createMetric("Boundary error", summary.median_boundary_error_s.toFixed(2), "sec"),
    createMetric("Inference", model.run.inference_seconds.toFixed(1), "sec"),
    createMetric("Peak VRAM", model.run.peak_vram_gb.toFixed(1), "GB"),
  );
  ui.findingCopy.textContent = `Strict matching recovered ${summary.matched_events} of ${summary.ground_truth_events} event instances. Independent coverage rises to ${model.coverage} of ${summary.ground_truth_events}; 4 of 5 action types were recognized. The main weakness was timing and instance separation.`;
}

function statusClass(status) {
  if (status === "matched") return "matched";
  if (status === "missed") return "missed";
  if (status === "invalid") return "invalid";
  return "mislocalized";
}

function makeEventBlock(event) {
  const block = document.createElement("button");
  const duration = Math.max(0, Number(event.end_s) - Number(event.start_s));
  block.type = "button";
  block.className = `event-block status-${statusClass(event.status)}`;
  block.dataset.key = event.key;
  block.dataset.start = event.start_s;
  block.dataset.end = event.end_s;
  block.style.left = positionPercent(Number(event.start_s));
  block.style.width = duration > 0 ? positionPercent(duration) : "7px";
  block.setAttribute(
    "aria-label",
    `${event.source === "human" ? "Human annotation" : "Model prediction"}: ${event.event_type}, ${formatTime(Number(event.start_s))} to ${formatTime(Number(event.end_s))}, ${event.status.replaceAll("_", " ")}`,
  );
  block.title = `${event.event_type} · ${Number(event.start_s).toFixed(1)}–${Number(event.end_s).toFixed(1)}s`;

  const name = document.createElement("span");
  name.className = "event-name";
  name.textContent = event.event_type;
  const time = document.createElement("span");
  time.className = "event-time";
  time.textContent = `${Number(event.start_s).toFixed(1)}–${Number(event.end_s).toFixed(1)}s`;
  block.append(name, time);
  block.addEventListener("click", () => selectEvent(event, true));
  return block;
}

function renderTracks(model) {
  ui.humanTrack.replaceChildren(...model.groundTruthStatus.map(makeEventBlock));
  ui.modelTrack.replaceChildren(...model.events.map(makeEventBlock));
}

function matchScore(event) {
  return event.match?.temporal_iou == null ? "n/a" : event.match.temporal_iou.toFixed(2);
}

function eventDescription(event) {
  if (event.source === "model" && event.evidence) return event.evidence;
  if (event.status === "matched") {
    return `Matched the ${event.source === "human" ? "model prediction" : "human reference"} at the 0.30 temporal-IoU threshold.`;
  }
  if (event.status === "missed") return "No model prediction matched this reference event.";
  if (event.status === "invalid") return "The model returned a zero-length interval, so this prediction is invalid for temporal evaluation.";
  return "The label is plausible, but the timing did not overlap a reference interval enough to count as a match.";
}

function renderEventDetail(event) {
  const time = document.createElement("div");
  time.className = "detail-time";
  time.append(formatTime(Number(event.start_s)), document.createElement("br"), formatTime(Number(event.end_s)));

  const copy = document.createElement("div");
  const type = document.createElement("p");
  type.className = "detail-type";
  type.textContent = `${event.source === "human" ? "Human reference" : "Model prediction"} · ${event.status.replaceAll("_", " ")}`;
  const heading = document.createElement("h3");
  heading.textContent = event.event_type;
  const description = document.createElement("p");
  description.textContent = eventDescription(event);
  copy.append(type, heading, description);

  const score = document.createElement("div");
  score.className = "detail-score";
  const scoreLabel = document.createElement("span");
  scoreLabel.textContent = "tIoU";
  const scoreValue = document.createElement("strong");
  scoreValue.textContent = matchScore(event);
  score.append(scoreLabel, scoreValue);

  ui.eventDetail.replaceChildren(time, copy, score);
}

function selectEvent(event, startPlayback) {
  state.selectedKey = event.key;
  document.querySelectorAll(".event-block").forEach((block) => {
    block.classList.toggle("selected", block.dataset.key === event.key);
  });
  renderEventDetail(event);
  ui.video.currentTime = Math.max(0, Number(event.start_s));
  updatePlaybackUi(ui.video.currentTime);
  if (startPlayback) ui.video.play().catch(() => {});
}

function renderAllModelData() {
  const model = activeModel();
  if (!model) return;
  ui.activeModelTitle.textContent = model.title;
  ui.precisionBadge.textContent = model.precision;
  ui.modelTrackLabel.textContent = model.trackLabel;
  renderModelSwitcher();
  renderMetrics(model);
  renderTracks(model);
}

function currentEvents(events, time) {
  return events.filter(
    (event) => Number(event.start_s) <= time && time <= Number(event.end_s),
  );
}

function setNowPill(element, prefix, events) {
  const names = [...new Set(events.map((event) => event.event_type))];
  element.textContent = `${prefix}: ${names.length ? names.join(" + ") : "none"}`;
  element.classList.toggle("active", names.length > 0);
}

function updatePlaybackUi(time) {
  const safeTime = Math.max(0, Math.min(DURATION, Number(time) || 0));
  const ratio = (safeTime / DURATION) * 100;
  const model = activeModel();
  ui.hudTime.textContent = formatTime(safeTime);
  ui.currentTime.textContent = formatTime(safeTime);
  ui.scrubber.value = safeTime;
  ui.scrubber.setAttribute("aria-valuetext", `${safeTime.toFixed(1)} seconds`);
  ui.scrubber.style.background = `linear-gradient(90deg, var(--green) 0%, var(--green) ${ratio}%, var(--line) ${ratio}%)`;
  ui.playhead.style.left = `${ratio}%`;

  setNowPill(ui.nowHuman, "Human", currentEvents(model?.groundTruthStatus ?? [], safeTime));
  setNowPill(ui.nowModel, "Qwen", currentEvents(model?.events ?? [], safeTime));

  document.querySelectorAll(".event-block").forEach((block) => {
    const start = Number(block.dataset.start);
    const end = Number(block.dataset.end);
    block.classList.toggle("active", start <= safeTime && safeTime <= end && start < end);
  });
}

function wireVideo() {
  ui.video.addEventListener("loadedmetadata", () => {
    ui.videoFallback.hidden = true;
    updatePlaybackUi(ui.video.currentTime);
  });
  ui.video.addEventListener("timeupdate", () => updatePlaybackUi(ui.video.currentTime));
  ui.video.addEventListener("seeked", () => updatePlaybackUi(ui.video.currentTime));
  ui.video.addEventListener("error", () => {
    ui.videoFallback.hidden = false;
  });
  ui.scrubber.addEventListener("input", () => {
    ui.video.currentTime = Number(ui.scrubber.value);
    updatePlaybackUi(Number(ui.scrubber.value));
  });
  ui.videoFile.addEventListener("change", () => {
    const [file] = ui.videoFile.files;
    if (!file) return;
    if (ui.video.dataset.objectUrl) URL.revokeObjectURL(ui.video.dataset.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    ui.video.dataset.objectUrl = objectUrl;
    ui.video.src = objectUrl;
    ui.video.load();
  });
}

async function init() {
  renderRuler();
  wireVideo();
  ui.durationTime.textContent = formatTime(DURATION);
  try {
    await loadData();
    renderAllModelData();
    updatePlaybackUi(0);
  } catch (error) {
    const heading = document.createElement("h3");
    heading.textContent = "Timeline data could not be loaded.";
    const message = document.createElement("p");
    message.textContent = `${error.message}. Serve the repository over HTTP and reload the page.`;
    ui.eventDetail.replaceChildren(heading, message);
    console.error(error);
  }
}

init();
