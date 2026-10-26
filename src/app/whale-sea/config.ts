export const WHALE_ARTWORK = { src: "/assets/whale-island.webp", width: 941, height: 1672 } as const;
export const WHALE_SIZE = { minimum: 960, viewportWidth: 126, maximum: 1920 } as const;
export const WHALE_ROWS = 48;
export const WHALE_COLUMNS = 24;
// 同一個整身彎角同時決定關節與頭部的轉彎能力，避免兩套限制互相拉扯。
export const MAX_BODY_BEND = Math.PI * .75;
export const MAX_JOINT_BEND = MAX_BODY_BEND / WHALE_ROWS;
export const MIN_TURN_RADIUS = 1 / MAX_BODY_BEND;
export const MAX_TURN_RATE = .20;

export function whaleLength(width: number) {
  return Math.max(WHALE_SIZE.minimum, Math.min(WHALE_SIZE.maximum, width * WHALE_SIZE.viewportWidth / 100));
}
