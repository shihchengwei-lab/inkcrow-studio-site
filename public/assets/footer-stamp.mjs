/**
 * 到頁底才蓋印；圖紋載入後才允許顯示，單次掛載只播放一次。
 * @param {HTMLElement} element
 * @param {{imageUrl: string, motionEnabled?: () => boolean}} options
 */
export function mountFooterStamp(element, { imageUrl, motionEnabled = () => true }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ready = false;
  let started = false;
  let finished = false;
  let disposed = false;
  let frame = 0;
  let last = 0;
  let position = 1;
  let velocity = 0;
  let motionObserver = null;
  element.dataset.stampState = 'pending';

  function detach() {
    window.removeEventListener('scroll', check);
    window.removeEventListener('resize', check);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', motionChanged);
    motionObserver?.disconnect();
  }

  function finish() {
    finished = true;
    cancelAnimationFrame(frame);
    frame = 0;
    element.dataset.stampState = 'stamped';
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    detach();
  }

  function render() {
    element.style.opacity = String(Math.max(0, Math.min(1, 1 - position)));
    element.style.transform = `translateY(${-12 * position}px) scale(${1 + 0.08 * position})`;
  }

  function tick(now) {
    frame = 0;
    if (disposed || finished || document.hidden) return;
    if (reduced.matches || !motionEnabled()) { finish(); return; }
    // 小步積分維持不同更新率下的阻尼手感，背景時間不補播。
    let remaining = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      velocity += (-240 * position - 24 * velocity) * step;
      position += velocity * step;
      remaining -= step;
    }
    render();
    if (Math.abs(position) < 0.001 && Math.abs(velocity) < 0.01) finish();
    else frame = requestAnimationFrame(tick);
  }

  function check() {
    if (disposed || !ready || started || document.hidden) return;
    if (scrollY + innerHeight < document.documentElement.scrollHeight - 2) return;
    started = true;
    window.removeEventListener('scroll', check);
    window.removeEventListener('resize', check);
    if (reduced.matches || !motionEnabled()) { finish(); return; }
    element.dataset.stampState = 'stamping';
    motionObserver = new MutationObserver(motionChanged);
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    render();
    frame = requestAnimationFrame(tick);
  }

  function motionChanged() {
    if (started && !finished && (reduced.matches || !motionEnabled())) finish();
  }

  function visibility() {
    if (!started) { check(); return; }
    if (finished) return;
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (!document.hidden) frame = requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', motionChanged);
  const image = new Image();
  image.src = imageUrl;
  image.decode().then(() => { if (!disposed) { ready = true; check(); } }).catch(() => {
    // 圖紋無法載入時保留空白，不顯示缺少陰刻圖紋的實心色塊。
    if (!disposed) detach();
  });
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    detach();
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
  };
}
