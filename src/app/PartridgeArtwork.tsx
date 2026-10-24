import frames from "./partridge-frames.json";

export default function PartridgeArtwork() {
  return (
    <button type="button" className="inline-deco partridge-deco" aria-label="逗一下竹雞">
      <span className="partridge-art" aria-hidden="true" style={{
        aspectRatio: `${frames.width} / ${frames.height}`,
        backgroundImage: `url('${frames.atlas}')`,
        backgroundSize: `100% ${frames.delays.length * 100}%`,
      }} />
    </button>
  );
}
