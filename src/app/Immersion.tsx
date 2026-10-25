"use client";
import { useEffect } from "react";
import { setupSmoke } from "./smoke";
import { setupButterfly } from "./butterfly";
import { setupPartridge } from "./partridge";

/*
 * 首頁沉浸效果（只負責動態，不負責版面）
 * 1. 線香煙霧：小畫布疊在香爐圖上，煙會被游標撥動
 * 2. 活的蝴蝶與竹雞：蝴蝶閃躲游標，竹雞察覺後停頓、點擊短跳
 * 全部在使用者要求「減少動態」時不啟動。
 */

export default function Immersion() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanups: (() => void)[] = [];
    const sync = () => {
      cleanups.forEach((fn) => fn());
      cleanups = motion.matches ? [] : [setupSmoke(), setupButterfly(), setupPartridge()];
    };
    sync();
    motion.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      cleanups.forEach((fn) => fn());
    };
  }, []);
  return null;
}
