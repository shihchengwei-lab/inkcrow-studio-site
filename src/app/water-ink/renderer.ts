import { INK_HOMES, INK_COLOR } from "./composition";
import type { DisplacementField } from "./model";
import { FlowTexture, FLOW_DECODE_GLSL, FLOW_RANGE_RATIO } from "./flow-texture";

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
${FLOW_DECODE_GLSL}

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
  vec2 shift = decodeFlow(flowSample);
  vec2 p = pixel / viewport.x - shift * ${FLOW_RANGE_RATIO.toFixed(1)};
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
  const flowTexture = new FlowTexture();
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
      draw(field: DisplacementField, height: number, scroll: number, forming: number, scale: number, inkGain = 1, inkSpread = 1) {
        const w = Math.max(1, Math.round(field.width * scale));
        const h = Math.max(1, Math.round(height * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.columns, field.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, flowTexture.encode(field));
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
