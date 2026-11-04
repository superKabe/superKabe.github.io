const timer = document.querySelector("[data-blink-timer]");
const value = timer?.querySelector("[data-timer-value]");
const label = timer?.querySelector("[data-timer-label]");
const toggle = timer?.querySelector("[data-timer-toggle]");
const toast = timer?.querySelector("[data-toast]");
let remaining = 20;
let intervalId;

function render() {
  if (value) value.textContent = `00:${String(remaining).padStart(2, "0")}`;
}

function reset() {
  window.clearInterval(intervalId);
  intervalId = undefined;
  remaining = 20;
  toast?.setAttribute("hidden", "");
  if (label) label.textContent = "Ready for a short test";
  if (toggle) toggle.textContent = "Start 20-second demo";
  render();
}

toggle?.addEventListener("click", () => {
  if (intervalId) {
    reset();
    return;
  }
  if (remaining === 0) {
    remaining = 20;
    toast?.setAttribute("hidden", "");
    render();
  }
  if (toggle) toggle.textContent = "Reset timer";
  if (label) label.textContent = "Keep working. Blink will interrupt when it is time.";
  intervalId = window.setInterval(() => {
    remaining -= 1;
    render();
    if (remaining > 0) return;
    window.clearInterval(intervalId);
    intervalId = undefined;
    toast?.removeAttribute("hidden");
    if (label) label.textContent = "Time to give your eyes a short break.";
    if (toggle) toggle.textContent = "Run it again";
  }, 1000);
});

render();
