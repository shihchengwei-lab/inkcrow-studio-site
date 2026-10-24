"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const COVER_MS = 80;
const REVEAL_MS = 250;
const SAFETY_MS = 6000;
const routePath = (path: string) => path.replace(/\/+$/, "") || "/";
const SITE_ROUTES = new Set(["/", "/privacy", "/terms"]);
type Passage = { path: string; cover: HTMLDivElement; radius: number; dispose: () => void };

export default function InkNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const passage = useRef<Passage | null>(null);
  const scrollTarget = useRef<string | null>(null);

  // 路由提交並準備繪製後才揭幕；資料較慢時先保持紙幕。
  useEffect(() => {
    if (scrollTarget.current === routePath(pathname)) {
      if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      scrollTarget.current = null;
    }
    const pending = passage.current;
    if (!pending || pending.path !== routePath(pathname)) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (passage.current !== pending) return;
        pending.cover.dataset.phase = "reveal";
        const animation = pending.cover.animate(
          [{ "--ink-radius": "0px" }, { "--ink-radius": `${pending.radius}px` }],
          { duration: REVEAL_MS, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" },
        );
        animation.finished.then(pending.dispose, pending.dispose);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  useEffect(() => {
    const destination = (target: EventTarget | null) => {
      const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || !SITE_ROUTES.has(routePath(url.pathname))) return null;
      if (routePath(url.pathname) === routePath(location.pathname)) return null;
      return { url, anchor };
    };
    const warm = (url: URL) => {
      const href = url.pathname + url.search;
      router.prefetch(href);
    };
    const onIntent = (event: Event) => {
      const target = destination(event.target);
      if (target) warm(target.url);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = destination(event.target);
      if (!target) return;
      event.preventDefault();
      if (passage.current) return;
      const { url, anchor } = target;
      warm(url);
      const href = url.pathname + url.search + url.hash;
      scrollTarget.current = routePath(url.pathname);
      // 返回首頁直接承接已成形的淡墨，避免與換頁揭幕重疊。
      if (routePath(url.pathname) === "/") {
        document.documentElement.setAttribute("data-intro-seen", "");
        try { sessionStorage.setItem("water-ink-seen", "1"); } catch { /* 不影響導覽 */ }
      }
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
          cover.getAnimations().forEach((animation) => animation.cancel());
          cover.remove();
          if (passage.current === pending) passage.current = null;
        },
      };
      passage.current = pending;
      const safety = window.setTimeout(pending.dispose, SAFETY_MS);
      const animation = cover.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: COVER_MS, easing: "ease-out", fill: "forwards",
      });
      animation.finished.then(() => {
        if (passage.current === pending) {
          cover.dataset.phase = "waiting";
          router.push(href);
        }
      }, () => {});
    };
    const cancel = () => {
      scrollTarget.current = null;
      passage.current?.dispose();
    };
    // 即時切換減少動態由 CSS 隱藏紙幕；導覽仍照常完成。

    document.addEventListener("pointerover", onIntent);
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", cancel);

    return () => {
      cancel();
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", cancel);

    };
  }, [router]);

  // 靠近視窗的站內連結先預載；點擊時仍補一次預載，與覆幕同步進行。
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const anchor = entry.target as HTMLAnchorElement;
        const url = new URL(anchor.href, location.href);
        if (url.origin !== location.origin || !SITE_ROUTES.has(routePath(url.pathname)) || routePath(url.pathname) === routePath(pathname)) continue;
        const href = url.pathname + url.search;
        router.prefetch(href);
      }
    }, { rootMargin: "160px" });
    document.querySelectorAll("a[href]:not([target]):not([download])").forEach((anchor) => observer.observe(anchor));
    return () => observer.disconnect();
  }, [pathname, router]);

  return null;
}
