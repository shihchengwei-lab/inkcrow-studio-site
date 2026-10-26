"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { mountWhaleSea } from "./whale-sea/controller";
import { WHALE_ARTWORK, WHALE_SIZE } from "./whale-sea/model";
import "./whale-sea.css";

export default function WhaleSea() {
  const scene = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!scene.current || !image.current || !canvas.current) return;
    return mountWhaleSea(scene.current, image.current, canvas.current);
  }, []);

  return (
    <div className="whale-sea" ref={scene} aria-hidden="true" style={{
      "--whale-min": `${WHALE_SIZE.minimum}px`,
      "--whale-width": `${WHALE_SIZE.viewportWidth}vw`,
      "--whale-max": `${WHALE_SIZE.maximum}px`,
    } as CSSProperties}>
      {/* 靜態圖也是無 JavaScript、減少動態與繪圖失敗時的完整呈現。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} className="whale-still" src={WHALE_ARTWORK.src}
        width={WHALE_ARTWORK.width} height={WHALE_ARTWORK.height} alt="" decoding="async" />
      <canvas ref={canvas} className="whale-canvas" />
    </div>
  );
}
