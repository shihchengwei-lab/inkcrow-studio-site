import type { SmokeField, SmokeParameters } from "./model";

const COLOR = "238, 232, 222";

// Canvas 的線條、漸層與像素換算留在繪製端；壽命與作用範圍直接使用同幀參數。
export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  trails: SmokeField["trails"],
  parameters: SmokeParameters,
  size: number,
  height: number,
) {
  const life = parameters.life;
  const offset = height - size;
  ctx.clearRect(0, 0, size, height);
  // 出圖範圍隨願力向上開展，柔邊遮罩也涵蓋煙絲線寬，避免越界硬切。
  const top = parameters.top;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // 三層柔邊煙絲，寬度隨上升擴散；斷開拉得太遠的片段，不畫橡皮筋。
  for (const points of trails) {
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1];
      const spacing = Math.max(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(c.x - b.x, c.y - b.y));
      if (spacing > 0.045) continue;
      const t = b.age / life;
      // 拉長時煙會變稀，不把同樣濃度延展成一條白繩。
      const density = Math.min(1, 0.0035 / Math.max(0.001, spacing));
      const alpha = Math.min(1, b.age / 0.16) * Math.pow(1 - t, 1.25) * density;
      const width = (0.0025 + t * 0.019) * size * parameters.width;
      for (const [scale, opacity] of [[3.2, 0.065], [1.7, 0.11], [0.85, 0.12]]) {
        ctx.strokeStyle = `rgba(${COLOR}, ${alpha * opacity * parameters.gain})`;
        ctx.lineWidth = Math.max(0.5, width * scale);
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) * size / 2, (a.y + b.y) * size / 2 + offset);
        ctx.quadraticCurveTo(b.x * size, b.y * size + offset,
          (b.x + c.x) * size / 2, (b.y + c.y) * size / 2 + offset);
        ctx.stroke();
      }
    }
  }
  const fade = ctx.createLinearGradient(0, top * size + offset, 0, (top + 0.06) * size + offset);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, size, height);
  ctx.globalCompositeOperation = "source-over";
}
