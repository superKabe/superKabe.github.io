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
let visualSlide = 1;
let isCarouselAnimating = false;

let firstClone;
let lastClone;
if (carouselTrack && slides.length > 1) {
  firstClone = slides[0].cloneNode(true);
  lastClone = slides.at(-1).cloneNode(true);
  firstClone.dataset.carouselClone = "true";
  lastClone.dataset.carouselClone = "true";
  firstClone.removeAttribute("aria-labelledby");
  lastClone.removeAttribute("aria-labelledby");
  firstClone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  lastClone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  firstClone.setAttribute("aria-hidden", "true");
  lastClone.setAttribute("aria-hidden", "true");
  firstClone.inert = true;
  lastClone.inert = true;
  carouselTrack.prepend(lastClone);
  carouselTrack.append(firstClone);
}

function updateCarousel(index) {
  activeSlide = Math.max(0, Math.min(index, slides.length - 1));
  if (carouselStatus) carouselStatus.textContent = `${activeSlide + 1} / ${slides.length}`;
  if (previousButton) previousButton.disabled = slides.length < 2;
  if (nextButton) nextButton.disabled = slides.length < 2;

  slides.forEach((slide, slideIndex) => {
    slide.toggleAttribute("inert", slideIndex !== activeSlide);
    slide.classList.toggle("is-active", slideIndex === activeSlide);
  });

  dotsContainer?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeSlide);
    dot.setAttribute("aria-current", dotIndex === activeSlide ? "true" : "false");
  });
}

function positionCarousel(animate = true) {
  if (!carouselTrack || !slides.length) return;
  const viewport = carouselTrack.parentElement?.clientWidth || carouselTrack.clientWidth;
  const slideWidth = slides[0].getBoundingClientRect().width;
  const gap = Number.parseFloat(getComputedStyle(carouselTrack).columnGap) || 0;
  const offset = (viewport - slideWidth) / 2 - visualSlide * (slideWidth + gap);
  carouselTrack.style.transition = animate && !reduceMotion.matches ? "" : "none";
  carouselTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
}

function goToSlide(index) {
  if (!carouselTrack || !slides.length || isCarouselAnimating) return;
  const normalized = (index + slides.length) % slides.length;
  const delta = index > activeSlide ? 1 : index < activeSlide ? -1 : 0;
  if (Math.abs(index - activeSlide) > 1) {
    activeSlide = normalized;
    visualSlide = activeSlide + 1;
  } else {
    activeSlide = normalized;
    visualSlide += delta;
  }
  updateCarousel(activeSlide);
  positionCarousel(true);
  isCarouselAnimating = !reduceMotion.matches && delta !== 0;
}

if (dotsContainer && slides.length) {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    const title = slide.querySelector("h3")?.textContent || `Project ${index + 1}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Show ${title}`);
    dot.addEventListener("click", () => {
      if (index === activeSlide || isCarouselAnimating) return;
      activeSlide = index;
      visualSlide = index + 1;
      updateCarousel(index);
      positionCarousel(true);
      isCarouselAnimating = !reduceMotion.matches;
    });
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

carouselTrack?.addEventListener("transitionend", (event) => {
  if (event.propertyName !== "transform") return;
  isCarouselAnimating = false;
  if (visualSlide === 0) {
    visualSlide = slides.length;
    positionCarousel(false);
  } else if (visualSlide === slides.length + 1) {
    visualSlide = 1;
    positionCarousel(false);
  }
});

window.addEventListener("resize", () => positionCarousel(false));
updateCarousel(0);
positionCarousel(false);

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
