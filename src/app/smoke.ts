// 沿用原圖的三個香頭與煙色；煙絲受短暫氣流帶動，香頭持續補出新煙。
const TIPS = [
  { x: 0.456, y: 0.369 },
  { x: 0.502, y: 0.342 },
  { x: 0.554, y: 0.359 },
];
const COLOR = "238, 232, 222";
const LIFE = 3.8;
const EMIT_INTERVAL = 0.035;
const MAX_POINTS = 112;
const MAX_GUSTS = 32;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Point = { x: number; y: number; vx: number; vy: number; age: number };
type Gust = { x: number; y: number; vx: number; vy: number; age: number; weight: number };
type Sample = { x: number; y: number; at: number; id: number };

export function setupSmoke(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>(".smoke-canvas");
  const host = canvas?.parentElement;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !host || !ctx) return () => {};

  const trails: Point[][] = TIPS.map(() => []);
  const carry = TIPS.map(() => 0);
  const gusts: Gust[] = [];
  let raw: Sample | null = null;
  let anchor: Sample | null = null;
  let touchId: number | null = null;
  let visible = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let size = 1;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size = Math.max(1, Math.round(host.getBoundingClientRect().width * dpr));
    canvas.width = canvas.height = size;
    raw = anchor = null;
  };

  const step = (dt: number) => {
    time += dt;
    for (let i = gusts.length - 1; i >= 0; i--) {
      const g = gusts[i];
      g.age += dt;
      // 氣流離手後仍稍微往原方向前進，再逐漸消散。
      const drift = Math.exp(-g.age * 3) * dt * 0.06;
      g.x += g.vx * drift;
      g.y += g.vy * drift;
      if (g.age > 2.2) gusts.splice(i, 1);
    }

    trails.forEach((points, index) => {
      carry[index] += dt;
      while (carry[index] >= EMIT_INTERVAL) {
        carry[index] -= EMIT_INTERVAL;
        points.push({ ...TIPS[index], vx: 0, vy: -0.075, age: 0 });
      }
      if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.age += dt;
        if (p.age > LIFE || p.y < -0.06) { points.splice(i, 1); continue; }
        // 同一空間共享緩慢氣流，避免每顆粒子各自抖動而散成光點。
        let vx = 0.018 * Math.sin(p.y * 24 + time * 1.1 + index * 0.8)
          + 0.011 * Math.sin(p.y * 49 - time * 0.7);
        let vy = -0.078 - 0.018 * p.age / LIFE;
        for (const g of gusts) {
          const speed = Math.hypot(g.vx, g.vy);
          const fade = Math.exp(-g.age * 1.8) * g.weight;
          const dx = p.x - g.x, dy = p.y - g.y;
          const wake = Math.exp(-(dx * dx + dy * dy) / 0.009);
          vx += g.vx * wake * fade * 0.1;
          vy += g.vy * wake * fade * 0.1;
          // 手勢兩側的反向旋渦，讓被撥開的煙沿邊緣捲回。
          for (const side of [-1, 1]) {
            const ox = dx + g.vy / speed * 0.045 * side;
            const oy = dy - g.vx / speed * 0.045 * side;
            const r2 = ox * ox + oy * oy;
            const spin = side * speed * 0.012 * fade
              * Math.exp(-r2 / 0.012) / (r2 + 0.0012);
            vx -= oy * spin;
            vy += ox * spin;
          }
        }
        // 香頭附近固定出煙；外側煙流有慣性，反覆快速撥動也有速度上限。
        const freedom = Math.min(1, p.age / 0.22);
        const follow = 1 - Math.exp(-dt * 5);
        p.vx += (clamp(vx, -0.42, 0.42) * freedom - p.vx) * follow;
        p.vy += (clamp(vy, -0.34, 0.22) * freedom - 0.075 * (1 - freedom) - p.vy) * follow;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // 三層柔邊煙絲，寬度隨上升擴散；斷開拉得太遠的片段，不畫橡皮筋。
    for (const points of trails) {
      for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1], b = points[i], c = points[i + 1];
        const spacing = Math.max(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(c.x - b.x, c.y - b.y));
        if (spacing > 0.045) continue;
        const t = b.age / LIFE;
        // 拉長時煙會變稀，不把同樣濃度延展成一條白繩。
        const density = Math.min(1, 0.0035 / Math.max(0.001, spacing));
        const alpha = Math.min(1, b.age / 0.16) * Math.pow(1 - t, 1.25) * density;
        const width = (0.0025 + t * 0.019) * size;
        for (const [scale, opacity] of [[3.2, 0.065], [1.7, 0.11], [0.85, 0.12]]) {
          ctx.strokeStyle = `rgba(${COLOR}, ${alpha * opacity})`;
          ctx.lineWidth = Math.max(0.5, width * scale);
          ctx.beginPath();
          ctx.moveTo((a.x + b.x) * size / 2, (a.y + b.y) * size / 2);
          ctx.quadraticCurveTo(b.x * size, b.y * size,
            (b.x + c.x) * size / 2, (b.y + c.y) * size / 2);
          ctx.stroke();
        }
      }
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (now - last >= 1000 / 30 - 1) {
      step(Math.min(0.05, (now - last) / 1000));
      last = now;
      draw();
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const resetInput = () => { raw = anchor = null; };
  const move = (clientX: number, clientY: number, id: number) => {
    if (!visible || document.hidden) return;
    const now = performance.now();
    const sample = { x: clientX, y: clientY, at: now, id };
    const oldRaw = raw;
    raw = sample;
    if (!oldRaw || oldRaw.id !== id || now - oldRaw.at > 160) { anchor = sample; return; }
    // raw 判斷連續輸入；anchor 累積尚未用掉的細微位移，避免慢慢撥煙被門檻吃掉。
    const old = anchor ?? oldRaw;
    const rect = host.getBoundingClientRect();
    // 速度用螢幕座標差，避免把頁面捲動誤判成手指移動。
    const dx = (clientX - old.x) / rect.width;
    const dy = (clientY - old.y) / rect.height;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return;
    anchor = sample;
    if (distance > 0.4) return;
    const dt = Math.max(0.008, (now - old.at) / 1000);
    const speed = Math.min(1.6, distance / dt);
    const count = Math.ceil(distance / 0.035);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = (old.x - rect.left) / rect.width + dx * t;
      const y = (old.y - rect.top) / rect.height + dy * t;
      if (x < 0 || x > 1 || y < 0 || y > 0.48) continue;
      gusts.push({ x, y, vx: dx / distance * speed, vy: dy / distance * speed,
        age: 0, weight: Math.min(1, distance / (count * 0.035)) });
    }
    if (gusts.length > MAX_GUSTS) gusts.splice(0, gusts.length - MAX_GUSTS);
  };
  const pointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "touch") move(e.clientX, e.clientY, e.pointerId);
  };
  const touchStart = (e: TouchEvent) => {
    resetInput();
    touchId = e.touches.length === 1 ? e.touches[0].identifier : null;
    if (touchId !== null) move(e.touches[0].clientX, e.touches[0].clientY, touchId);
  };
  const touchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) { resetInput(); touchId = null; return; }
    const touch = Array.from(e.touches).find((t) => t.identifier === touchId);
    if (touch) move(touch.clientX, touch.clientY, touch.identifier);
  };
  const touchEnd = () => { resetInput(); touchId = null; };
  const visibility = () => {
    resetInput();
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else start();
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
    else { cancelAnimationFrame(raf); raf = 0; resetInput(); }
  });
  const ro = new ResizeObserver(resize);
  resize();
  io.observe(host);
  ro.observe(host);
  host.addEventListener("pointermove", pointerMove, { passive: true });
  host.addEventListener("pointerleave", resetInput);
  host.addEventListener("pointercancel", resetInput);
  // 瀏覽器開始捲頁後可能取消 pointer；被動 touchmove 仍可跟隨，不阻止原生手勢。
  host.addEventListener("touchstart", touchStart, { passive: true });
  host.addEventListener("touchmove", touchMove, { passive: true });
  host.addEventListener("touchend", touchEnd, { passive: true });
  host.addEventListener("touchcancel", touchEnd, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  return () => {
    host.removeEventListener("pointermove", pointerMove);
    host.removeEventListener("pointerleave", resetInput);
    host.removeEventListener("pointercancel", resetInput);
    host.removeEventListener("touchstart", touchStart);
    host.removeEventListener("touchmove", touchMove);
    host.removeEventListener("touchend", touchEnd);
    host.removeEventListener("touchcancel", touchEnd);
    document.removeEventListener("visibilitychange", visibility);
    io.disconnect();
    ro.disconnect();
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, size, size);
  };
}
