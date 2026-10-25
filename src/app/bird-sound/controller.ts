import { CALL_DURATION_MS, nextCallDelay, peakVolumeAt, volumeAt } from "./rules";

type AudioPort = Pick<HTMLAudioElement, "play" | "pause" | "volume" | "currentTime" | "loop" | "preload">;
type Environment = {
  createAudio(): AudioPort;
  distance(): number | null;
  now(): number;
  random(): number;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  schedule(callback: () => void, delay: number): number;
  cancelTimer(id: number): void;
};
type Session = { audio: AudioPort; frame: number | null; timer: number | null };
type State =
  | { kind: "off" | "disposed" }
  | { kind: "starting"; session: Session }
  | { kind: "sounding"; session: Session; startedAt: number; peakVolume: number; nextAt: number }
  | { kind: "waiting"; session: Session; nextAt: number };
export type BirdSoundStatus = Exclude<State["kind"], "disposed">;
export type BirdSoundController = { toggle(): void; dispose(): void };

// 一個控制器獨佔一次啟用的聲音與排程；畫面只訂閱狀態，不另行控制音訊。
export function createBirdSoundController(
  env: Environment,
  notify: (status: BirdSoundStatus) => void,
): BirdSoundController {
  let state: State = { kind: "off" };
  const currentSession = () => "session" in state ? state.session : null;
  const change = (next: State) => {
    state = next;
    notify(next.kind === "disposed" ? "off" : next.kind);
  };
  const silence = (session: Session) => {
    if (session.frame !== null) env.cancelFrame(session.frame);
    if (session.timer !== null) env.cancelTimer(session.timer);
    session.frame = session.timer = null;
    session.audio.pause();
    session.audio.volume = 0;
  };
  const stop = (kind: "off" | "disposed") => {
    const session = currentSession();
    change({ kind });
    if (session) silence(session);
  };
  const tick = (session: Session) => {
    if (state.kind !== "sounding" || state.session !== session) return;
    session.frame = null;
    const elapsed = env.now() - state.startedAt;
    if (elapsed >= CALL_DURATION_MS) {
      session.audio.pause();
      session.audio.volume = 0;
      change({ kind: "waiting", session, nextAt: state.nextAt });
      return;
    }
    session.audio.volume = volumeAt(elapsed, state.peakVolume);
    session.frame = env.requestFrame(() => tick(session));
  };
  const playCall = async (session: Session) => {
    if (currentSession() !== session) return;
    const distance = env.distance();
    if (distance === null || !Number.isFinite(distance) || distance < 0) { stop("off"); return; }
    if (session.frame !== null) env.cancelFrame(session.frame);
    session.frame = null;
    change({ kind: "starting", session });
    const peakVolume = peakVolumeAt(distance);
    session.audio.volume = 0;
    session.audio.currentTime = 0;
    try {
      // 首次呼叫直接在點擊事件內執行，保留行動瀏覽器要求的使用者手勢。
      await session.audio.play();
    } catch {
      if (currentSession() === session) stop("off");
      return;
    }
    if (currentSession() !== session) {
      // 慢載入的舊工作不得復活；不同啟用工作不共用 Audio，亦不會誤停新的聲音。
      silence(session);
      return;
    }
    const startedAt = env.now();
    const delay = nextCallDelay(env.random());
    change({ kind: "sounding", session, startedAt, peakVolume, nextAt: startedAt + delay });
    session.frame = env.requestFrame(() => tick(session));
    session.timer = env.schedule(() => {
      session.timer = null;
      void playCall(session);
    }, delay);
  };
  return {
    toggle() {
      if (state.kind === "disposed") return;
      if (state.kind !== "off") { stop("off"); return; }
      const audio = env.createAudio();
      audio.preload = "auto";
      audio.loop = false;
      const session: Session = { audio, frame: null, timer: null };
      change({ kind: "starting", session });
      void playCall(session);
    },
    dispose() {
      if (state.kind !== "disposed") stop("disposed");
    },
  };
}

export function mountBirdSound(
  anchor: () => HTMLElement | null,
  notify: (status: BirdSoundStatus) => void,
): BirdSoundController {
  return createBirdSoundController({
    createAudio: () => new Audio("/assets/partridge_call.mp3"),
    distance: () => {
      const element = anchor();
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
    },
    now: () => performance.now(),
    random: () => Math.random(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancelTimer: (id) => clearTimeout(id),
  }, notify);
}
