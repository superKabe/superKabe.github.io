const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navigation = document.querySelector("[data-nav]");
const pointerGlow = document.querySelector("[data-pointer-glow]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
}

function closeNavigation() {
  if (!navToggle || !navigation) return;
  navToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
  document.body.classList.remove("nav-open");
}

navToggle?.addEventListener("click", () => {
  const shouldOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(shouldOpen));
  navigation?.classList.toggle("is-open", shouldOpen);
  document.body.classList.toggle("nav-open", shouldOpen);
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 720) closeNavigation();
});
updateHeader();

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector(".comparison-range");
  if (!range) return;

  const updateComparison = () => {
    comparison.style.setProperty("--position", `${range.value}%`);
  };

  range.addEventListener("input", updateComparison);
  updateComparison();
});

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );

  document.querySelectorAll(".reveal:not(.is-visible)").forEach((item) => {
    revealObserver.observe(item);
  });
} else {
  document.querySelectorAll(".reveal").forEach((item) => {
    item.classList.add("is-visible");
  });
}

if (pointerGlow && !prefersReducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      pointerGlow.style.setProperty("--glow-x", `${event.clientX}px`);
      pointerGlow.style.setProperty("--glow-y", `${event.clientY}px`);
    },
    { passive: true },
  );
}

const currentYear = document.querySelector("[data-current-year]");
if (currentYear) currentYear.textContent = new Date().getFullYear();
