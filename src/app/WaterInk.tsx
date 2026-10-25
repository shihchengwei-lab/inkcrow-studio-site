"use client";

import { useEffect, useRef } from "react";
import { INK_COLOR, INK_HOMES } from "./water-ink/composition";
import { setupWaterInk, type IntroPlayback } from "./water-ink/controller";
import "./water-ink.css";

export default function WaterInk() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playback = useRef<IntroPlayback>({ kind: "pending" });

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const page = scene?.parentElement;
    if (!scene || !canvas || !page) return;
    return setupWaterInk(scene, canvas, page, playback);
  }, []);

  const color = `rgb(${INK_COLOR.map((v) => Math.round(v * 255)).join(" ")})`;
  return (
    <div className="water-ink" ref={sceneRef} aria-hidden="true">
      <div className="paper-static" />
      <div className="paper-age" />
      <div className="paper-fibers" />
      <div className="ink-still">
        {INK_HOMES.map(([x, y, rx, ry], i) => (
          <svg key={i} viewBox="-100 -100 200 200" className="ink-cloud"
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${rx * 200}vw`, height: `${ry * 200}vw` }}>
            <defs>
              <filter id={`still-ink-${i}`} x="-60%" y="-60%" width="220%" height="220%">
                <feTurbulence type="fractalNoise" baseFrequency="0.018 0.026" numOctaves="3" seed={i + 4} result="grain" />
                <feDisplacementMap in="SourceGraphic" in2="grain" scale="55" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>
            <g fill={color} filter={`url(#still-ink-${i})`}>
              <ellipse rx="61" ry="28" style={{ opacity: "calc(0.055 * var(--wish-ink-gain, 1))" }} transform="rotate(-24)" />
              <ellipse cx="16" cy="5" rx="41" ry="35" style={{ opacity: "calc(0.045 * var(--wish-ink-gain, 1))" }} transform="rotate(22)" />
              <ellipse cx="-8" cy="-13" rx="48" ry="12" style={{ opacity: "calc(0.05 * var(--wish-ink-gain, 1))" }} transform="rotate(-38)" />
            </g>
          </svg>
        ))}
      </div>
      <canvas ref={canvasRef} className="ink-water-canvas" />
    </div>
  );
}
