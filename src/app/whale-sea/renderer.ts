import { createWhaleMesh, positionWhale } from "./model";
import type { WhaleRoute } from "./whale-route";

export function createWhaleRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, route: WhaleRoute) {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: false, antialias: false,
    depth: false, stencil: false, powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  let program: WebGLProgram | null = null;
  let texture: WebGLTexture | null = null;
  const dispose = () => {
    shaders.forEach(shader => gl.deleteShader(shader));
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    gl.deleteProgram(program);
    gl.deleteTexture(texture);
  };
  try {
    const shader = (type: number, source: string) => {
      const result = gl.createShader(type);
      if (!result) throw new Error("whale shader");
      shaders.push(result);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error("whale shader compile");
      return result;
    };
    program = gl.createProgram();
    if (!program) throw new Error("whale program");
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec2 position;
      attribute vec2 texcoord;
      varying vec2 uv;
      void main() { uv = texcoord; gl_Position = vec4(position, 0.0, 1.0); }
    `));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D artwork;
      varying vec2 uv;
      void main() { gl_FragColor = texture2D(artwork, uv); }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("whale program link");
    gl.useProgram(program);
    const mesh = createWhaleMesh();
    const buffer = (target: number, data: Float32Array | Uint16Array, usage: number) => {
      const result = gl.createBuffer();
      if (!result) throw new Error("whale buffer");
      buffers.push(result);
      gl.bindBuffer(target, result);
      gl.bufferData(target, data, usage);
      return result;
    };
    buffer(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
    const texcoord = gl.getAttribLocation(program, "texcoord");
    gl.enableVertexAttribArray(texcoord);
    gl.vertexAttribPointer(texcoord, 2, gl.FLOAT, false, 0, 0);
    const positions = buffer(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    buffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    texture = gl.createTexture();
    if (!texture) throw new Error("whale texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, "artwork"), 0);
    gl.clearColor(0, 0, 0, 0);

    return {
      draw(width: number, height: number, seconds: number) {
        // 上限 65 萬像素，避免大螢幕／高倍率裝置持續繪製整張高解析海圖。
        const scale = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(650_000 / (width * height)));
        const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        positionWhale(mesh, width, height, seconds, route);
        gl.bindBuffer(gl.ARRAY_BUFFER, positions);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.positions);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        return !gl.isContextLost() && gl.getError() === gl.NO_ERROR;
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
