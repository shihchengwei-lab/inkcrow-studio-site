"use client";

import { useEffect, useId, useRef } from "react";
import { setupInkCharacter } from "./ink-title";

function InkCharacter({ children }: { children: string }) {
  const id = useId();
  const character = useRef<HTMLSpanElement>(null);
  const blur = useRef<SVGFEGaussianBlurElement>(null);
  const matrix = useRef<SVGFEColorMatrixElement>(null);
  useEffect(() => {
    const el = character.current, gaussian = blur.current, mat = matrix.current;
    if (!el || !gaussian || !mat) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    const sync = () => {
      cleanup();
      cleanup = motion.matches ? () => {} : setupInkCharacter(el, gaussian, mat, id);
    };
    sync();
    motion.addEventListener("change", sync);
    return () => { motion.removeEventListener("change", sync); cleanup(); };
  }, [id]);
  return (
    <span className="ink-char" ref={character}>
      {children}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur ref={blur} stdDeviation="0" />
            <feColorMatrix ref={matrix} type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
    </span>
  );
}

export default function InkTitle({ text }: { text: string }) {
  return <h1 className="hero-title">{Array.from(text, (char, index) => <InkCharacter key={index}>{char}</InkCharacter>)}</h1>;
}
