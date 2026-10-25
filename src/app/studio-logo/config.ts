export const SOURCE = "/assets/logo-mark.webp";
export const CORE_MS = 1050;
export const ORBIT_START_MS = 825;
export const RING_MS = 1100;
export const DOT_MS = 140;
export const DOT_GAP_MS = 220;
export const DOTS = [{ x: 157.2, y: 628.77 }, { x: 1124.34, y: 628.77 }];
export const DOT_RADIUS = 22;
export const REPLAY_MS = RING_MS + DOTS.length * DOT_MS + (DOTS.length - 1) * DOT_GAP_MS;
export const INTRO_MS = ORBIT_START_MS + REPLAY_MS;
export const RING_RADIUS = 480;
export const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
export const LOGO_SEEN_KEY = "inkcrow-logo-seen";
// 必須在首次繪製前執行，和播放控制器共用儲存鍵。
export const LOGO_PRELUDE = `(function(){try{if(location.pathname!=="/")return;if(!sessionStorage.getItem(${JSON.stringify(LOGO_SEEN_KEY)}))document.documentElement.setAttribute("data-logo-intro","")}catch(e){}})()`;
