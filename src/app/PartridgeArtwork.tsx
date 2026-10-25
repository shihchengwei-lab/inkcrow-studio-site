import frames from "./partridge-frames.json";
import type { Ref } from "react";

export default function PartridgeArtwork({ elementRef }: { elementRef: Ref<HTMLButtonElement> }) {
  return (
    <button ref={elementRef} type="button" className="inline-deco partridge-deco" aria-label="逗一下竹雞">
      <span className="partridge-art" aria-hidden="true" style={{
        aspectRatio: `${frames.width} / ${frames.height}`,
        backgroundImage: `url('${frames.atlas}')`,
        backgroundSize: `100% ${frames.delays.length * 100}%`,
      }} />
    </button>
  );
}
