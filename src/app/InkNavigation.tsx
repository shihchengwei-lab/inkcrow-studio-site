"use client";
import { useEffect } from "react";

/*
 * 換頁墨色轉場（離開頁這一半）
 * 點站內連結時，墨從點擊位置擴散蓋滿畫面，蓋完才換頁。
 * 新頁面那一半（墨從同一個位置退去）由 layout.tsx 的內嵌程式與 globals.css 的 .nav-cover 負責，
 * 兩邊靠 sessionStorage 的 "ink-nav" 交接點擊位置。
 */

const EXIT_MS = 520;
// 換頁一直沒發生時，多久後把墨幕移除，避免永遠蓋著
const SAFETY_MS = 6000;

export default function InkNavigation() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let leaving = false;

    const onClick = (e: MouseEvent) => {
      if (leaving || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as Element | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) {
        return;
      }
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // 同一頁（例如 #work 錨點）不轉場
      if (url.pathname === location.pathname && url.search === location.search) {
        return;
      }

      e.preventDefault();
      leaving = true;

      // 用鍵盤按下連結時沒有游標位置，改從連結中心擴散
      let x = e.clientX;
      let y = e.clientY;
      if (e.detail === 0) {
        const r = a.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      // 到最遠的畫面角落的距離，圓要長到這麼大才蓋得滿
      const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 8;

      const cover = document.createElement("div");
      cover.className = "nav-exit";
      cover.setAttribute("aria-hidden", "true");
      cover.style.clipPath = `circle(0px at ${x}px ${y}px)`;
      document.body.appendChild(cover);

      const go = () => {
        try {
          sessionStorage.setItem(
            "ink-nav",
            `${Math.round(x)},${Math.round(y)},${Date.now()}`
          );
        } catch {
          /* 存不進去就算了，新頁面只是不播退墨 */
        }
        window.location.assign(url.href);
      };

      const anim = cover.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
        ],
        {
          duration: EXIT_MS,
          easing: "cubic-bezier(0.6, 0, 0.3, 1)",
          fill: "forwards",
        }
      );
      anim.finished.then(go, go);

      window.setTimeout(() => {
        cover.remove();
        leaving = false;
      }, SAFETY_MS);
    };

    // 從瀏覽器的上一頁回來時，頁面可能是從快取還原的，要把殘留的墨幕拿掉
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      document.querySelectorAll(".nav-exit").forEach((n) => n.remove());
      leaving = false;
    };

    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return null;
}
