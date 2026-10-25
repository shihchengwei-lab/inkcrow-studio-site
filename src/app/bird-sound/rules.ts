// 鳥叫的時間與音量規則；不讀取頁面、時鐘或音訊物件。
export const CALL_DURATION_MS = 5000; // 第五聲後收尾，避開音檔最後半聲。
const BASE_VOLUME = 0.16;
const MIN_VOLUME = 0.08;
const PEAK_DISTANCE_PX = 400;
const OUTER_WIDTH_PX = 4000;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 600;

export function peakVolumeAt(distance: number): number {
  return Math.max(MIN_VOLUME, BASE_VOLUME * (1 - Math.max(0, distance - PEAK_DISTANCE_PX) / OUTER_WIDTH_PX));
}

export function volumeAt(elapsedMs: number, peakVolume: number): number {
  if (elapsedMs >= CALL_DURATION_MS) return 0;
  const factor = elapsedMs < FADE_IN_MS
    ? elapsedMs / FADE_IN_MS
    : elapsedMs < CALL_DURATION_MS - FADE_OUT_MS
      ? 1
      : (CALL_DURATION_MS - elapsedMs) / FADE_OUT_MS;
  return peakVolume * Math.max(0, Math.min(1, factor));
}

// 從本次播放成功開始算，並非叫完五秒後再多等一段。
export function nextCallDelay(randomUnit: number): number {
  return 8000 + randomUnit * 7000;
}
