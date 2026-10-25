"use client";

import { useEffect, useRef } from "react";
import { mountFooterStamp } from "../../public/assets/footer-stamp.mjs";

export default function StampedColophon() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return mountFooterStamp(ref.current, { imageUrl: "/assets/studio-colophon.webp" });
  }, []);
  return <span ref={ref} className="studio-seal" data-stamp-state="pending" aria-hidden="true" />;
}
