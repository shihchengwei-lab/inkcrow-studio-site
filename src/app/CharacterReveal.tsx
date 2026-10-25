"use client";

import { useSyncExternalStore } from "react";
import { getWishEffects, subscribeWishProgress } from "./wish-progress";
import { getFieldReturned, subscribeFieldReturn } from "./character-reveal";
import "./character-reveal.css";

const images = {
  street: { back: "/assets/work_hero_back.webp", original: "/assets/work_hero.webp", alt: "願行 — 神明陪你日常行走" },
  field: { back: "/assets/col_2_companion_back.webp", original: "/assets/col_2_companion.webp", alt: "神明同行 — 歸安陪女玩家走田野" },
} as const;
const getTimedReveal = () => getWishEffects().visibleMs >= 120_000;
const getServerReveal = () => false;

export default function CharacterReveal({ scene }: { scene: keyof typeof images }) {
  const turned = useSyncExternalStore(
    scene === "street" ? subscribeWishProgress : subscribeFieldReturn,
    scene === "street" ? getTimedReveal : getFieldReturned,
    getServerReveal,
  );
  const image = images[scene];
  return (
    <div className={`character-reveal character-reveal-${scene}`} data-turned={turned}>
      {/* 新圖只提供神明頭部；周圍持續顯示原圖，避免生成差異帶動玩家或背景。 */}
      {/* eslint-disable @next/next/no-img-element */}
      <img src={image.back} alt={image.alt} className="character-back" loading="lazy" decoding="async" />
      <img src={image.original} alt="" aria-hidden="true" className="character-surroundings" loading="lazy" decoding="async" />
      <img src={image.original} alt="" aria-hidden="true" className="character-turned" loading="lazy" decoding="async" />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
