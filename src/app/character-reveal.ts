const RETURN_KEY = "inkcrow-field-returned";
let fieldReturned = false;

export const getFieldReturned = () => fieldReturned;

// 只有完成「到底，再向上」才解鎖；同分頁保留已觸發結果。
export function subscribeFieldReturn(listener: () => void) {
  try { fieldReturned ||= sessionStorage.getItem(RETURN_KEY) === "1"; } catch { /* 文件內仍可保留。 */ }
  if (fieldReturned) return () => {};
  let reachedBottom = false;
  let lowest = window.scrollY;
  let height = document.documentElement.scrollHeight;
  let viewport = window.innerHeight;

  const scroll = () => {
    if (document.hidden || fieldReturned) return;
    const y = window.scrollY;
    const nextHeight = document.documentElement.scrollHeight;
    const nextViewport = window.innerHeight;
    // 旋轉螢幕、網址列伸縮或版面變高不算回滾；重新建立捲動基準。
    if (height !== nextHeight || viewport !== nextViewport) {
      height = nextHeight;
      viewport = nextViewport;
      lowest = y;
      if (height > viewport && y + viewport >= height - 8) reachedBottom = true;
      return;
    }
    if (height > viewport && y + viewport >= height - 8) reachedBottom = true;
    if (!reachedBottom) return;
    lowest = Math.max(lowest, y);
    if (lowest - y < 48) return;
    fieldReturned = true;
    try { sessionStorage.setItem(RETURN_KEY, "1"); } catch { /* 不阻止彩蛋。 */ }
    window.removeEventListener("scroll", scroll);
    listener();
  };
  window.addEventListener("scroll", scroll, { passive: true });
  scroll();
  return () => window.removeEventListener("scroll", scroll);
}
