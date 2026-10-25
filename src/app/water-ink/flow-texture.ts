import type { DisplacementField } from "./model";

// CPU 與 shader 共用的 16-bit 位移格式。這是顯示範圍，不是物理位移上限。
export const FLOW_RANGE_RATIO = 0.4;
const BYTE_BITS = 8;
const BYTE_BASE = 2 ** BYTE_BITS;
const BYTE_MAX = BYTE_BASE - 1;
const VALUE_MAX = BYTE_BASE * BYTE_BASE - 1;
const CENTER = 0.5;
const CHANNELS = { x: [0, 1], y: [2, 3] } as const;
const swizzle = (channels: readonly number[]) => channels.map(i => "rgba"[i]).join("");
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const glsl = (n: number) => n.toFixed(1);

export const FLOW_DECODE_GLSL = `
vec2 decodeFlow(vec4 sampleValue) {
  return vec2(dot(sampleValue.${swizzle(CHANNELS.x)}, vec2(${glsl(BYTE_BASE * BYTE_MAX)},${glsl(BYTE_MAX)})),
              dot(sampleValue.${swizzle(CHANNELS.y)}, vec2(${glsl(BYTE_BASE * BYTE_MAX)},${glsl(BYTE_MAX)})))
    / ${glsl(VALUE_MAX)} - ${glsl(CENTER)};
}
`;

// 每個 renderer 擁有一份緩衝；只有場或位移版本改變時才重新編碼。
export class FlowTexture {
  private field: DisplacementField | null = null;
  private revision = -1;
  private pixels = new Uint8Array(0);

  encode(field: DisplacementField): Uint8Array {
    if (field === this.field && field.revision === this.revision) return this.pixels;
    const count = field.columns * field.rows;
    if (this.pixels.length !== count * 4) this.pixels = new Uint8Array(count * 4);
    const range = field.width * FLOW_RANGE_RATIO;
    const xs = field.offsetX, ys = field.offsetY;
    for (let i = 0; i < count; i++) {
      const x = Math.round(clamp(CENTER + xs[i] / range) * VALUE_MAX);
      const y = Math.round(clamp(CENTER + ys[i] / range) * VALUE_MAX);
      this.pixels[i * 4 + CHANNELS.x[0]] = x >> BYTE_BITS;
      this.pixels[i * 4 + CHANNELS.x[1]] = x & BYTE_MAX;
      this.pixels[i * 4 + CHANNELS.y[0]] = y >> BYTE_BITS;
      this.pixels[i * 4 + CHANNELS.y[1]] = y & BYTE_MAX;
    }
    this.field = field;
    this.revision = field.revision;
    return this.pixels;
  }
}
