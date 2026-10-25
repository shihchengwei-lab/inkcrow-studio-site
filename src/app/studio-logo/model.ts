import { CIRCUMFERENCE, CORE_MS, DOTS, DOT_RADIUS, DOT_MS, DOT_GAP_MS, RING_MS, ORBIT_START_MS, INTRO_MS, REPLAY_MS } from "./config";

export type Playback = { kind: "forming" | "replaying"; elapsed: number };
export type LogoMemory = { introWanted: boolean | null; playback: Playback | null };
const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function orbitPose(elapsed: number) {
  return {
    offset: CIRCUMFERENCE * (1 - ease(elapsed / RING_MS)),
    radii: DOTS.map((_, i) => DOT_RADIUS * ease((elapsed - RING_MS - i * (DOT_MS + DOT_GAP_MS)) / DOT_MS)),
  };
}
export function playbackPose(active: Playback) {
  return {
    rise: active.kind === "forming" ? 1030 - 1000 * ease(active.elapsed / CORE_MS) : null,
    orbit: orbitPose(active.elapsed - (active.kind === "forming" ? ORBIT_START_MS : 0)),
    done: active.elapsed >= (active.kind === "forming" ? INTRO_MS : REPLAY_MS),
  };
}
export function createHoverState() {
  return { amount: 0, target: 0, x: 0, y: 0, targetX: 0, targetY: 0 };
}
export function stepHover(s: ReturnType<typeof createHoverState>, dt: number) {
  s.amount += (s.target - s.amount) * (1 - Math.exp(-dt / (s.target ? 160 : 230)));
  s.x += (s.targetX - s.x) * (1 - Math.exp(-dt / 65));
  s.y += (s.targetY - s.y) * (1 - Math.exp(-dt / 65));
  return { clear: !s.target && s.amount < 0.005,
    moving: Math.abs(s.target - s.amount) > 0.005 || Math.hypot(s.targetX - s.x, s.targetY - s.y) > 0.2 };
}
