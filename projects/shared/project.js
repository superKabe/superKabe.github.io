document.querySelectorAll("[data-tabs]").forEach((tabs) => {
  const buttons = [...tabs.querySelectorAll("[data-tab]")];
  const target = document.querySelector(tabs.dataset.tabs);
  if (!target) return;
  const panes = [...target.querySelectorAll("[data-pane]")];

  function select(name) {
    buttons.forEach((button) => {
      const active = button.dataset.tab === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    panes.forEach((pane) => { pane.hidden = pane.dataset.pane !== name; });
  }

  buttons.forEach((button) => button.addEventListener("click", () => select(button.dataset.tab)));
  if (buttons[0]) select(buttons[0].dataset.tab);
});

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector("input[type='range']");
  if (!range) return;
  const update = () => comparison.style.setProperty("--position", `${range.value}%`);
  range.addEventListener("input", update);
  update();
});

document.querySelectorAll("[data-current-year]").forEach((year) => { year.textContent = new Date().getFullYear(); });
