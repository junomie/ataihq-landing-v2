/* ============================================================
   ATAIHQ — main.js
   GSAP scroll animations, stat count-ups, nav behaviour.
   Degrades gracefully: if GSAP fails to load, content stays
   visible because initial states are only set via JS.
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header scrolled state ---------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      burger.classList.toggle("is-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      burger.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (!hasGsap || prefersReducedMotion) return; // static page is fully usable

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll progress bar ---------- */
  gsap.to("#progressFill", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 }
  });

  /* ---------- Hero entrance ---------- */
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from("[data-hero-reveal]", {
      y: 46,
      opacity: 0,
      duration: 1.1,
      stagger: 0.12,
      delay: 0.15
    });

  /* ---------- Generic scroll reveals ---------- */
  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true }
    });
  });

  /* ---------- Media parallax drift ---------- */
  gsap.utils.toArray(".media-frame").forEach(function (frame) {
    gsap.fromTo(frame, { y: 30 }, {
      y: -30,
      ease: "none",
      scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  });

  /* ---------- Stat count-ups ---------- */
  gsap.utils.toArray(".js-count").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var counter = { value: 0 };
    var statNum = el.closest(".stat__num");
    gsap.to(counter, {
      value: target,
      duration: 2.4,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: function () {
        el.textContent = Math.round(counter.value).toLocaleString("en-GB");
      },
      onComplete: function () {
        if (statNum) statNum.classList.add("is-done");
      }
    });
  });

  /* ---------- Custom cursor (desktop pointer devices only) ---------- */
  var isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (isFinePointer) {
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.innerHTML = "<span>View</span>";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("has-cursor");

    var mouseX = 0, mouseY = 0;
    var ringX = 0, ringY = 0;
    var cursorShown = false;

    document.addEventListener("pointermove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorShown) {
        cursorShown = true;
        ringX = mouseX;
        ringY = mouseY;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    }, { passive: true });

    (function cursorLoop() {
      dot.style.transform = "translate3d(" + mouseX + "px," + mouseY + "px,0)";
      ringX += (mouseX - ringX) * 0.18; // ring trails the dot slightly
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";
      requestAnimationFrame(cursorLoop);
    })();

    var INTERACTIVE = "a, button, input, textarea, select, label";
    document.addEventListener("pointerover", function (e) {
      if (e.target.closest(".media-frame")) {
        document.body.classList.add("cursor-media");
        document.body.classList.remove("cursor-hover");
      } else if (e.target.closest(INTERACTIVE)) {
        document.body.classList.add("cursor-hover");
        document.body.classList.remove("cursor-media");
      } else {
        document.body.classList.remove("cursor-hover", "cursor-media");
      }
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      cursorShown = false;
    });
  }

  /* ---------- Media tilt toward the pointer ---------- */
  if (isFinePointer) {
    gsap.utils.toArray(".media-frame").forEach(function (frame) {
      var toRotX = gsap.quickTo(frame, "rotationX", { duration: 0.5, ease: "power2.out" });
      var toRotY = gsap.quickTo(frame, "rotationY", { duration: 0.5, ease: "power2.out" });

      frame.addEventListener("pointermove", function (e) {
        var rect = frame.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        toRotX(py * -7);
        toRotY(px * 9);
      }, { passive: true });

      frame.addEventListener("pointerleave", function () {
        toRotX(0);
        toRotY(0);
      });

      gsap.set(frame, { transformPerspective: 900 });
    });
  }

  /* ---------- Service titles: slight letter-spacing settle ---------- */
  gsap.utils.toArray(".service__title, .consultancy__title, .agi__title, .proof__title, .contact__title").forEach(function (title) {
    gsap.from(title, {
      letterSpacing: "0.06em",
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: { trigger: title, start: "top 85%", once: true }
    });
  });
})();
