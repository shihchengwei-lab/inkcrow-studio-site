// 水墨的歸處是整張長卷上的固定位置；靜態替代與 shader 共用這份構圖。
// x、y 是頁面比例；rx、ry 是相對頁寬的半徑。
export const INK_HOMES = [
  [0.04, 0.045, 0.29, 0.28],
  [0.92, 0.135, 0.27, 0.32],
  [0.13, 0.285, 0.28, 0.27],
  [0.91, 0.405, 0.23, 0.34],
  [0.05, 0.56, 0.27, 0.32],
  [0.95, 0.69, 0.28, 0.29],
  [0.26, 0.805, 0.30, 0.23],
] as const;

export const INK_COLOR = [0.14, 0.145, 0.15] as const;
export const FORM_SECONDS = 5;
export const DRIFT_SECONDS = 1.5;
export const RETURN_SECONDS = 9;

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

// 位移場在文件座標中保存，捲頁不會被當成撥水速度。
// 每格以阻尼與回復力歸攏，少量殘餘位移保留上次手勢的形狀。
export class InkFlow {
  readonly width: number;
  readonly height: number;
  readonly columns = 48;
  readonly rows: number;
  readonly pixels: Uint8Array;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly restX: Float32Array;
  private readonly restY: Float32Array;
  private sinceTouch = DRIFT_SECONDS + RETURN_SECONDS;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rows = clamp(Math.ceil((height / width) * this.columns), 48, 768);
    const count = this.columns * this.rows;
    this.pixels = new Uint8Array(count * 4);
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    this.restX = new Float32Array(count);
    this.restY = new Float32Array(count);
    this.encode();
  }

  disturb(px: number, py: number, dx: number, dy: number) {
    const radius = clamp(this.width * 0.17, 100, 210);
    const length = Math.hypot(dx, dy);
    if (length < 0.3) return false;
    const scale = Math.min(1, 45 / length);
    dx *= scale;
    dy *= scale;
    const fromX = Math.max(1, Math.floor(((px - radius) / this.width) * (this.columns - 1)));
    const toX = Math.min(this.columns - 2, Math.ceil(((px + radius) / this.width) * (this.columns - 1)));
    const fromY = Math.max(1, Math.floor(((py - radius) / this.height) * (this.rows - 1)));
    const toY = Math.min(this.rows - 2, Math.ceil(((py + radius) / this.height) * (this.rows - 1)));
    for (let row = fromY; row <= toY; row++) {
      for (let col = fromX; col <= toX; col++) {
        const i = row * this.columns + col;
        const ox = (col / (this.columns - 1)) * this.width - px;
        const oy = (row / (this.rows - 1)) * this.height - py;
        const d = Math.hypot(ox, oy) / radius;
        if (d >= 1) continue;
        const weight = (1 - d * d) ** 3;
        // 剪切讓水流有側向捲動，而不是把一個圓整塊平移。
        const curl = (ox * dy - oy * dx) / radius;
        const fx = (dx - (oy / radius) * curl * 1.8) * weight;
        const fy = (dy + (ox / radius) * curl * 1.8) * weight;
        this.vx[i] = clamp(this.vx[i] + fx * 2.8, -160, 160);
        this.vy[i] = clamp(this.vy[i] + fy * 2.8, -160, 160);
        this.restX[i] = clamp(this.restX[i] + fx * 0.065, -12, 12);
        this.restY[i] = clamp(this.restY[i] + fy * 0.065, -12, 12);
      }
    }
    this.sinceTouch = 0;
    return true;
  }

  step(dt: number) {
    this.sinceTouch += dt;
    const returning = this.sinceTouch > DRIFT_SECONDS;
    const finished = this.sinceTouch >= DRIFT_SECONDS + RETURN_SECONDS;
    const damping = Math.exp(-2.6 * dt);
    const limit = Math.min(100, this.width * 0.16);
    for (let i = 0; i < this.x.length; i++) {
      if (finished) {
        this.x[i] = this.restX[i];
        this.y[i] = this.restY[i];
        this.vx[i] = this.vy[i] = 0;
      } else {
        const spring = returning ? 2.4 : 0;
        this.vx[i] = (this.vx[i] + (this.restX[i] - this.x[i]) * spring * dt) * damping;
        this.vy[i] = (this.vy[i] + (this.restY[i] - this.y[i]) * spring * dt) * damping;
        this.x[i] = clamp(this.x[i] + this.vx[i] * dt, -limit, limit);
        this.y[i] = clamp(this.y[i] + this.vy[i] * dt, -limit, limit);
      }
    }
    this.encode();
    return !finished;
  }

  private encode() {
    // 兩個色頻各用 16 bit，避免低速歸攏出現 8 bit 的階梯跳動。
    const range = this.width * 0.4;
    for (let i = 0; i < this.x.length; i++) {
      const x = Math.round(clamp(0.5 + this.x[i] / range, 0, 1) * 65535);
      const y = Math.round(clamp(0.5 + this.y[i] / range, 0, 1) * 65535);
      this.pixels[i * 4] = x >> 8;
      this.pixels[i * 4 + 1] = x & 255;
      this.pixels[i * 4 + 2] = y >> 8;
      this.pixels[i * 4 + 3] = y & 255;
    }
  }
}

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
varying vec2 uv;
uniform sampler2D flow;
uniform vec2 viewport;
uniform float pageHeight;
uniform float scrollY;
uniform float forming;
uniform float inkGain;
uniform float inkSpread;
uniform vec4 homes[${INK_HOMES.length}];
uniform vec3 inkColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 8.7;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 pixel = vec2(uv.x * viewport.x, (1.0 - uv.y) * viewport.y + scrollY);
  vec2 doc = pixel / vec2(viewport.x, pageHeight);
  vec4 flowSample = texture2D(flow, clamp(doc, 0.0, 1.0));
  vec2 shift = vec2(dot(flowSample.rg, vec2(65280.0,255.0)),
                    dot(flowSample.ba, vec2(65280.0,255.0))) / 65535.0 - 0.5;
  vec2 p = pixel / viewport.x - shift * 0.4;
  vec2 warp = vec2(fbm(p * 3.8 + 3.1), fbm(p * 3.8 + 17.4)) - 0.46;
  vec2 q = p + warp * (0.20 + forming * 0.32);
  float envelope = 0.0;
  for (int i = 0; i < ${INK_HOMES.length}; i++) {
    vec4 h = homes[i];
    vec2 center = vec2(h.x, h.y * pageHeight / viewport.x);
    // 墨團留在兩側，水平方向逐漸滲進中央；紋理與手勢位移仍在文件座標。
    vec2 d = (q - center) / (h.zw * vec2(inkSpread, 1.0) * (1.0 + forming * 0.5));
    envelope += exp(-dot(d,d) * 2.2);
  }
  float cloud = fbm(q * 8.5 + warp * 3.8);
  float veins = fbm(q * 19.0 + warp * 6.0);
  float body = smoothstep(0.23, 0.72, cloud);
  float filaments = pow(1.0 - abs(veins * 2.0 - 1.0), 7.0);
  float density = envelope * (body * 0.14 + filaments * 0.055);
  // 中間的閱讀區更透，兩側與留白保留細絲、深淺層次。
  float reading = 0.62 + 0.38 * smoothstep(0.18, 0.49, abs(doc.x - 0.5));
  gl_FragColor = vec4(inkColor, clamp(density * reading, 0.0, 0.19) * inkGain);
}
`;

export function createInkRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: false, antialias: false,
    depth: false, stencil: false, powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  const dispose = () => {
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
  };
  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("無法建立水墨 shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "水墨 shader 編譯失敗");
      }
      return shader;
    };
    program = gl.createProgram();
    if (!program) throw new Error("無法建立水墨程式");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("水墨程式連結失敗");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture) throw new Error("無法配置水墨資源");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uniforms = Object.fromEntries(
      ["viewport", "pageHeight", "scrollY", "forming", "inkGain", "inkSpread", "homes", "inkColor"].map(
        (name) => [name, gl.getUniformLocation(program!, name)],
      ),
    );
    gl.uniform4fv(uniforms.homes, new Float32Array(INK_HOMES.flat()));
    gl.uniform3fv(uniforms.inkColor, INK_COLOR);
    return {
      draw(field: InkFlow, height: number, scroll: number, forming: number, scale: number, inkGain = 1, inkSpread = 1) {
        const w = Math.max(1, Math.round(field.width * scale));
        const h = Math.max(1, Math.round(height * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.columns, field.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, field.pixels);
        gl.uniform2f(uniforms.viewport, field.width, height);
        gl.uniform1f(uniforms.pageHeight, field.height);
        gl.uniform1f(uniforms.scrollY, scroll);
        gl.uniform1f(uniforms.forming, forming);
        gl.uniform1f(uniforms.inkGain, inkGain);
        gl.uniform1f(uniforms.inkSpread, inkSpread);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return !gl.isContextLost() && gl.getError() === gl.NO_ERROR;
      },
      dispose,
    };
  } catch (error) {
    console.warn("水墨改用靜態呈現：", error);
    dispose();
    return null;
  }
}
