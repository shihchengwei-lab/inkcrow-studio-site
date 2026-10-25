/** 一個字與自己的 SVG 濾鏡一起掛載，不依賴全頁文字的排列。 */
export function setupInkCharacter(el: HTMLElement, blur: SVGFEGaussianBlurElement, mat: SVGFEColorMatrixElement, filterId: string) {
  let k = 0, target = 0, raf = 0, last = 0;
  const loop = (now: number) => {
    const frames = Math.min(3, Math.max(0, (now - last) / 16.67));
    last = now;
    const rate = target > k ? 0.04 : 0.055;
    k += (target - k) * (1 - Math.pow(1 - rate, frames));
    if (target === 0 && k < 0.015) {
      k = 0;
      raf = 0;
      el.style.filter = "";
      return;
    }
    const a = 1 + 19 * k;
    blur.setAttribute("stdDeviation", (k * 14).toFixed(2));
    mat.setAttribute("values", `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a.toFixed(2)} ${(-(a - 1) * 0.45).toFixed(2)}`);
    el.style.filter = `url(#${filterId})`;
    if (target > 0 && Math.abs(target - k) < 0.004) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
  };
  const setHover = (on: boolean) => {
    target = on ? 0.6 : 0;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  const enter = () => setHover(true);
  const leave = () => setHover(false);
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  el.addEventListener("pointercancel", leave);
  return () => {
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
    el.removeEventListener("pointercancel", leave);
    el.style.filter = "";
    cancelAnimationFrame(raf);
  };
}
