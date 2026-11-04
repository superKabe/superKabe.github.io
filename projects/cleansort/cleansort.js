const categories = [
  ["Recyclable waste", "♻"],
  ["Kitchen waste", "●"],
  ["Other waste", "◆"],
  ["Hazardous waste", "!"],
  ["Glass", "◇"],
];

const counts = Object.fromEntries(categories.map(([name]) => [name, 0]));
const controls = document.querySelector("[data-sample-controls]");
const board = document.querySelector("[data-bin-board]");
const processButton = document.querySelector("[data-process-sample]");
const resetButton = document.querySelector("[data-reset-counts]");
const status = document.querySelector("[data-cleansort-status]");
let selected = categories[0][0];
const capacity = 5;

function renderControls() {
  if (!controls) return;
  controls.replaceChildren(...categories.map(([name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `sample-choice${selected === name ? " is-selected" : ""}`;
    button.textContent = name;
    button.addEventListener("click", () => { selected = name; renderControls(); });
    return button;
  }));
}

function renderCounts() {
  if (!board) return;
  board.replaceChildren(...categories.map(([name, symbol]) => {
    const value = counts[name];
    const full = value >= capacity;
    const item = document.createElement("div");
    item.className = `bin${full ? " is-full" : ""}`;
    item.innerHTML = `<div class="bin-head"><span>${symbol} ${name}</span><span>${value} / ${capacity}</span></div><div class="bin-meter"><span style="--fill:${Math.min(100, value / capacity * 100)}%"></span></div>`;
    return item;
  }));
}

processButton?.addEventListener("click", () => {
  counts[selected] += 1;
  const full = counts[selected] >= capacity;
  if (status) status.textContent = full ? `${selected} full. Empty now.` : `${selected} detected and added to the running count.`;
  renderCounts();
});

resetButton?.addEventListener("click", () => {
  Object.keys(counts).forEach((name) => { counts[name] = 0; });
  if (status) status.textContent = "Counts reset.";
  renderCounts();
});

renderControls();
renderCounts();
