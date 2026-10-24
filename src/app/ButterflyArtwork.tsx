// 三層共用原圖；身體遮罩由兩翼的補集推導，不另外維護第三份輪廓。
export default function ButterflyArtwork() {
  return (
    <span className="inline-deco butterfly-deco" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <image id="butterfly-art" href="/assets/butterfly_corner.webp" width="1" height="1" />
          <path id="butterfly-left-shape" d="M0 0 H.38 V.22 L.465 .39 V.49 L.475 .66 H.5 V1 H0 Z" />
          <path id="butterfly-right-shape" d="M.62 0 H1 V1 H.5 V.66 H.525 L.535 .49 V.39 L.62 .22 Z" />
          <clipPath id="butterfly-left-clip"><use href="#butterfly-left-shape" /></clipPath>
          <clipPath id="butterfly-right-clip"><use href="#butterfly-right-shape" /></clipPath>
          <mask id="butterfly-body-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1" style={{ maskType: "luminance" }}>
            <rect width="1" height="1" fill="white" />
            {/* 翅根保留極小重疊，避免分層邊緣的抗鋸齒產生細縫。 */}
            <g fill="black" stroke="white" strokeWidth="0.005">
              <use href="#butterfly-left-shape" />
              <use href="#butterfly-right-shape" />
            </g>
          </mask>
        </defs>
      </svg>
      <span className="butterfly-pose">
        <span className="butterfly-original"><svg viewBox="0 0 1 1"><use href="#butterfly-art" /></svg></span>
        <span className="butterfly-wing butterfly-wing-left"><svg viewBox="0 0 1 1"><use href="#butterfly-art" clipPath="url(#butterfly-left-clip)" /></svg></span>
        <span className="butterfly-wing butterfly-wing-right"><svg viewBox="0 0 1 1"><use href="#butterfly-art" clipPath="url(#butterfly-right-clip)" /></svg></span>
        <span className="butterfly-body"><svg viewBox="0 0 1 1"><use href="#butterfly-art" mask="url(#butterfly-body-mask)" /></svg></span>
      </span>
    </span>
  );
}
