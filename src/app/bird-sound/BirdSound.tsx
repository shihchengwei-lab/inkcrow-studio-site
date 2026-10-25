"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { mountBirdSound, type BirdSoundController, type BirdSoundStatus } from "./controller";

export default function BirdSound({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const controller = useRef<BirdSoundController | null>(null);
  const [status, setStatus] = useState<BirdSoundStatus>("off");
  useEffect(() => {
    const mounted = mountBirdSound(() => anchorRef.current, setStatus);
    controller.current = mounted;
    return () => {
      controller.current = null;
      mounted.dispose();
    };
  }, [anchorRef]);
  const audioOn = status !== "off";
  return (
    <button
      type="button"
      onClick={() => controller.current?.toggle()}
      className="audio-toggle"
      aria-label={audioOn ? "關閉鳥叫" : "開啟鳥叫"}
      aria-pressed={audioOn}
      title={audioOn ? "關閉鳥叫" : "開啟鳥叫"}
    >
      <span className="audio-toggle-bird audio-toggle-bird--closed" aria-hidden="true" />
      <span className="audio-toggle-bird audio-toggle-bird--open" aria-hidden="true" />
      {audioOn && (
        <svg className="audio-toggle-call" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="m63 18 5-5m-2 14 7-1m-9 10 5 4" />
        </svg>
      )}
    </button>
  );
}
