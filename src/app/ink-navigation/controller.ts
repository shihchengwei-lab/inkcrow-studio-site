import { destination, routePath } from "./destination";

type Router = { push(href: string): void; prefetch(href: string): void };
type Passage = { path: string; cover: HTMLDivElement; radius: number; dispose(): void };
const COVER_MS = 80, REVEAL_MS = 250, SAFETY_MS = 6000;

/** 一個控制器擁有一次換頁的遮幕、捲動目標、預載監聽與清理。 */
export function mountInkNavigation(router: Router) {
  let passage: Passage | null = null;
  let scrollTarget: string | null = null;
  let observer: IntersectionObserver | null = null;
  let disposed = false;
  let cancelReveal = () => {};
  const warm = (url: URL) => router.prefetch(url.pathname + url.search);
  const onIntent = (event: Event) => {
    const target = destination(event.target);
    if (target) warm(target.url);
  };
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = destination(event.target);
    if (!target) return;
    event.preventDefault();
    if (passage) return;
    const { url, anchor } = target;
    warm(url);
    const href = url.pathname + url.search + url.hash;
    scrollTarget = routePath(url.pathname);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    const cover = document.createElement("div");
    cover.className = "nav-ink";
    cover.dataset.phase = "cover";
    cover.setAttribute("aria-hidden", "true");
    cover.style.setProperty("--ink-x", `${x}px`);
    cover.style.setProperty("--ink-y", `${y}px`);
    document.body.appendChild(cover);
    const pending: Passage = {
      path: routePath(url.pathname), cover,
      radius: Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 100,
      dispose: () => {
        clearTimeout(safety);
        cover.getAnimations().forEach(animation => animation.cancel());
        cover.remove();
        if (passage === pending) passage = null;
      },
    };
    passage = pending;
    const safety = window.setTimeout(pending.dispose, SAFETY_MS);
    const animation = cover.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: COVER_MS, easing: "ease-out", fill: "forwards",
    });
    animation.finished.then(() => {
      if (passage === pending) {
        cover.dataset.phase = "waiting";
        router.push(href);
      }
    }, () => {});
  };
  const cancel = () => {
    scrollTarget = null;
    passage?.dispose();
  };
  document.addEventListener("pointerover", onIntent);
  document.addEventListener("focusin", onIntent);
  document.addEventListener("touchstart", onIntent, { passive: true });
  document.addEventListener("click", onClick);
  window.addEventListener("popstate", cancel);

  const commit = (pathname: string) => {
    if (disposed) return;
    cancelReveal();
    cancelReveal = () => {};
    if (scrollTarget === routePath(pathname)) {
      if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      scrollTarget = null;
    }
    const pending = passage;
    // 路由提交並準備繪製後才揭幕；資料較慢時先保持紙幕。
    if (pending && pending.path === routePath(pathname)) {
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (passage !== pending) return;
          pending.cover.dataset.phase = "reveal";
          const animation = pending.cover.animate(
            [{ "--ink-radius": "0px" }, { "--ink-radius": `${pending.radius}px` }],
            { duration: REVEAL_MS, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" },
          );
          animation.finished.then(pending.dispose, pending.dispose);
        });
      });
      cancelReveal = () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
    }
    // 靠近視窗的連結先預載；操作意圖與點擊時仍補一次，與覆幕同步。
    observer?.disconnect();
    const currentObserver = new IntersectionObserver(entries => {
      if (disposed || observer !== currentObserver) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        currentObserver.unobserve(entry.target);
        const target = destination(entry.target, pathname);
        if (target) warm(target.url);
      }
    }, { rootMargin: "160px" });
    observer = currentObserver;
    document.querySelectorAll("a[href]:not([target]):not([download])").forEach(anchor => currentObserver.observe(anchor));
  };
  return {
    commit,
    dispose() {
      disposed = true;
      cancelReveal();
      cancel();
      observer?.disconnect();
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", cancel);
    },
  };
}
