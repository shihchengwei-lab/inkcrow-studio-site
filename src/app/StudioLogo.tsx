"use client";

import { useEffect, useRef } from "react";
import "./studio-logo.css";

import { SOURCE, DOTS, DOT_RADIUS, RING_RADIUS, CIRCUMFERENCE } from "./studio-logo/config";
import { mountStudioLogo } from "./studio-logo/controller";
import type { LogoMemory } from "./studio-logo/model";

export default function StudioLogo() {
  const hostRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const riseRef = useRef<SVGRectElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const memory = useRef<LogoMemory>({ introWanted: null, playback: null });

  useEffect(() => {
    const host = hostRef.current, image = imageRef.current, rise = riseRef.current;
    const ring = ringRef.current, dots = dotsRef.current;
    if (!host || !image || !rise || !ring || !dots) return;
    return mountStudioLogo({ host, image, rise, ring, dots }, memory.current);
  }, []);

  return (
    <button type="button" className="studio-logo" ref={hostRef} data-phase="waiting" aria-label="重播墨鴉 Logo 的墨環與墨點">
      {/* 完成後直接顯示原圖；動畫與暈墨只是同一張圖的遮罩層。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className="logo-source" src={SOURCE} alt="墨鴉工作室 標記" width="1280" height="1280" />
      <svg className="logo-formation" viewBox="0 0 1280 1280" aria-hidden="true">
        <defs>
          <clipPath id="logo-core"><circle cx="625" cy="640" r="365" /></clipPath>
          <mask id="logo-outside" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <rect width="1280" height="1280" fill="white" />
            <circle cx="625" cy="640" r="365" fill="black" />
          </mask>
          <linearGradient id="logo-rise" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.075" stopColor="white" />
          </linearGradient>
          <filter id="logo-wet-front" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="8" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="20" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <g id="logo-orbit">
            <circle ref={ringRef} cx="625" cy="640" r={RING_RADIUS} fill="none" stroke="white" strokeWidth="340"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} transform="rotate(90 625 640)" />
            {DOTS.map(({ x, y }) => <circle key={x} cx={x} cy={y} r={DOT_RADIUS} fill="black" />)}
            <g ref={dotsRef} fill="white">
              {DOTS.map(({ x, y }) => <circle key={x} cx={x} cy={y} r="0" />)}
            </g>
          </g>
          <mask id="logo-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <g clipPath="url(#logo-core)">
              <rect ref={riseRef} y="1030" width="1280" height="1280" fill="url(#logo-rise)" filter="url(#logo-wet-front)" />
            </g>
            <g mask="url(#logo-outside)">
              <use href="#logo-orbit" />
            </g>
          </mask>
          {/* 範圍落在原圖的留白處，避開上、下文字，只取兩側墨環和墨點。 */}
          <mask id="logo-replay-region" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <path d="M0 330H625V980H0Z M625 360H1280V980H625Z" fill="white" />
            <circle cx="625" cy="640" r="385" fill="black" />
          </mask>
          <mask id="logo-replay" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <rect width="1280" height="1280" fill="white" />
            <g mask="url(#logo-replay-region)">
              <rect width="1280" height="1280" fill="black" />
              <use href="#logo-orbit" />
            </g>
          </mask>
          <filter id="logo-edge-bleed" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="12" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="5" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="logo-wish-feather" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <image className="logo-intro-image" href={SOURCE} width="1280" height="1280" mask="url(#logo-reveal)" />
        <image className="logo-replay-image" href={SOURCE} width="1280" height="1280" mask="url(#logo-replay)" />
      </svg>
      <svg className="logo-wish-aura" viewBox="0 0 1280 1280" aria-hidden="true">
        <image href={SOURCE} width="1280" height="1280" mask="url(#logo-replay-region)" filter="url(#logo-wish-feather)" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-bleed" src={SOURCE} alt="" aria-hidden="true" width="1280" height="1280" />
    </button>
  );
}
