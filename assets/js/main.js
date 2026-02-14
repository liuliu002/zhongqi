document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loaded");

  const siteNav = document.querySelector(".site-nav");
  if (siteNav && !siteNav.querySelector(".nav-dropdown")) {
    siteNav.innerHTML = `
      <a class="nav-link" href="index.html">首页</a>
      <details class="nav-dropdown" data-group="services">
        <summary class="nav-link">辅导方向</summary>
        <div class="dropdown-menu">
          <a class="dropdown-link" href="domestic.html">国内辅导</a>
          <a class="dropdown-link" href="international.html">国际辅导</a>
          <a class="dropdown-link" href="students.html">留学生辅导</a>
          <a class="dropdown-link" href="proposals.html">课题申报</a>
          <a class="dropdown-link" href="medical-proposals.html">医学申报</a>
        </div>
      </details>
      <details class="nav-dropdown" data-group="resources">
        <summary class="nav-link">资源中心</summary>
        <div class="dropdown-menu">
          <a class="dropdown-link" href="search.html">资源查询</a>
          <a class="dropdown-link" href="updates.html">最新动态</a>
          <a class="dropdown-link" href="downloads.html">资源下载</a>
        </div>
      </details>
      <a class="nav-link" href="about.html">关于我们</a>
      <a class="nav-link nav-cta" href="contact.html">联系</a>
    `;
  }

  const navToggle = document.querySelector(".nav-toggle");
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });
  }

  const items = document.querySelectorAll("[data-animate]");
  if (items.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    items.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });

  const navDropdowns = document.querySelectorAll(".nav-dropdown");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (navDropdowns.length && canHover) {
    navDropdowns.forEach((dropdown) => {
      let closeTimer = null;
      const summary = dropdown.querySelector("summary");
      if (summary) {
        summary.addEventListener("click", (event) => {
          event.preventDefault();
        });
      }

      dropdown.addEventListener("mouseenter", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        dropdown.setAttribute("open", "");
      });

      dropdown.addEventListener("mouseleave", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
        }
        closeTimer = setTimeout(() => {
          dropdown.removeAttribute("open");
          closeTimer = null;
        }, 220);
      });

      dropdown.addEventListener("focusin", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      });

      dropdown.addEventListener("focusout", (event) => {
        if (!dropdown.contains(event.relatedTarget)) {
          if (closeTimer) {
            clearTimeout(closeTimer);
          }
          closeTimer = setTimeout(() => {
            dropdown.removeAttribute("open");
            closeTimer = null;
          }, 220);
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-dropdown")) {
        navDropdowns.forEach((dropdown) => dropdown.removeAttribute("open"));
      }
    });
  }

  const copyButtons = document.querySelectorAll("[data-copy]");
  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.getAttribute("data-copy");
      if (!text) {
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      const original = button.textContent;
      button.textContent = "已复制";
      button.disabled = true;
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 1500);
    });
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollTopButtons = document.querySelectorAll("[data-scroll-top]");
  if (scrollTopButtons.length) {
    const toggleScrollTop = () => {
      const shouldShow = window.scrollY > 240;
      scrollTopButtons.forEach((button) => {
        button.classList.toggle("is-visible", shouldShow);
      });
    };

    scrollTopButtons.forEach((button) => {
      button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
    });

    window.addEventListener("scroll", toggleScrollTop, { passive: true });
    toggleScrollTop();
  }

  const carousels = document.querySelectorAll("[data-carousel]");
  carousels.forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    if (!track) {
      return;
    }
    const slides = Array.from(track.children);
    const prevButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
    const autoplayDelay = Number.parseInt(carousel.getAttribute("data-carousel-autoplay"), 10);
    let index = 0;
    let timerId = null;

    const updateDots = () => {
      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === index;
        dot.classList.toggle("is-active", isActive);
        if (isActive) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    };

    const goTo = (nextIndex) => {
      if (!slides.length) {
        return;
      }
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      updateDots();
    };

    const stop = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const start = () => {
      if (prefersReducedMotion || !autoplayDelay || slides.length < 2) {
        return;
      }
      stop();
      timerId = setInterval(() => {
        goTo(index + 1);
      }, autoplayDelay);
    };

    if (slides.length < 2) {
      carousel.classList.add("is-static");
      return;
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        goTo(index - 1);
        start();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        goTo(index + 1);
        start();
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const dotIndex = Number.parseInt(dot.getAttribute("data-carousel-dot"), 10);
        if (Number.isNaN(dotIndex)) {
          return;
        }
        goTo(dotIndex);
        start();
      });
    });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    goTo(0);
    start();
  });
});

