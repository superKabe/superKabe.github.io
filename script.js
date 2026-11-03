const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navigation = document.querySelector("[data-nav]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
}

function setNavigation(open) {
  if (!navToggle || !navigation) return;
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.textContent = open ? "Close" : "Menu";
  navigation.classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
}

navToggle?.addEventListener("click", () => {
  setNavigation(navToggle.getAttribute("aria-expanded") !== "true");
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavigation(false));
});

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 620) setNavigation(false);
});
updateHeader();

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector(".comparison-range");
  if (!range) return;

  const update = () => comparison.style.setProperty("--position", `${range.value}%`);
  range.addEventListener("input", update);
  update();
});

const carousel = document.querySelector("[data-carousel]");
const carouselTrack = carousel?.querySelector("[data-carousel-track]");
const slides = carouselTrack ? [...carouselTrack.querySelectorAll("[data-project-slide]")] : [];
const previousButton = document.querySelector("[data-carousel-previous]");
const nextButton = document.querySelector("[data-carousel-next]");
const carouselStatus = document.querySelector("[data-carousel-status]");
const dotsContainer = document.querySelector("[data-carousel-dots]");
let activeSlide = 0;
let scrollFrame;

function updateCarousel(index) {
  activeSlide = Math.max(0, Math.min(index, slides.length - 1));
  if (carouselStatus) carouselStatus.textContent = `${activeSlide + 1} / ${slides.length}`;
  if (previousButton) previousButton.disabled = activeSlide === 0;
  if (nextButton) nextButton.disabled = activeSlide === slides.length - 1;

  slides.forEach((slide, slideIndex) => {
    slide.toggleAttribute("inert", slideIndex !== activeSlide);
  });

  dotsContainer?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeSlide);
    dot.setAttribute("aria-current", dotIndex === activeSlide ? "true" : "false");
  });
}

function goToSlide(index, behavior = reduceMotion.matches ? "auto" : "smooth") {
  if (!carouselTrack || !slides.length) return;
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  carouselTrack.scrollTo({ left: carouselTrack.clientWidth * nextIndex, behavior });
  updateCarousel(nextIndex);
}

if (dotsContainer && slides.length) {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    const title = slide.querySelector("h3")?.textContent || `Project ${index + 1}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Show ${title}`);
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.append(dot);
  });
}

previousButton?.addEventListener("click", () => goToSlide(activeSlide - 1));
nextButton?.addEventListener("click", () => goToSlide(activeSlide + 1));

carouselTrack?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToSlide(activeSlide - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToSlide(activeSlide + 1);
  }
});

carouselTrack?.addEventListener("scroll", () => {
  window.cancelAnimationFrame(scrollFrame);
  scrollFrame = window.requestAnimationFrame(() => {
    const nextIndex = Math.round(carouselTrack.scrollLeft / Math.max(1, carouselTrack.clientWidth));
    if (nextIndex !== activeSlide) updateCarousel(nextIndex);
  });
}, { passive: true });

window.addEventListener("resize", () => goToSlide(activeSlide, "auto"));
updateCarousel(0);

const portrait = document.querySelector("[data-portrait]");
const polarBear = document.querySelector("[data-polar-bear]");
let portraitTimer;

if (portrait && "IntersectionObserver" in window) {
  const portraitObserver = new IntersectionObserver(([entry]) => {
    portrait.classList.toggle("is-visible", entry.isIntersecting);
  }, { threshold: 0.35 });
  portraitObserver.observe(portrait);
} else {
  portrait?.classList.add("is-visible");
}

polarBear?.addEventListener("click", () => {
  window.clearTimeout(portraitTimer);
  portrait?.classList.add("is-flipped");
  portraitTimer = window.setTimeout(() => portrait?.classList.remove("is-flipped"), 5000);
});

const currentYear = document.querySelector("[data-current-year]");
if (currentYear) currentYear.textContent = new Date().getFullYear();
